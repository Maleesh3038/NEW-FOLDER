import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key so RLS doesn't block cross-row updates
// Falls back to anon key if service role not set
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendSMS(to: string, message: string) {
  if (!to || !process.env.NOTIFY_API_KEY) return;
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '94' + phone.slice(1);
  if (!phone.startsWith('94')) phone = '94' + phone;
  const params = new URLSearchParams({
    user_id: process.env.NOTIFY_USER_ID!,
    api_key: process.env.NOTIFY_API_KEY!,
    sender_id: process.env.NOTIFY_SENDER_ID || 'DRIVO',
    to: phone,
    message,
  });
  try { await fetch('https://app.notify.lk/api/v1/send?' + params); } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, bookingId, booking, vehicleId, customerId, ownerId } = body;

    // ── CREATE: atomic check + insert to prevent double-bookings
    if (action === 'create') {
      // Re-check availability right before inserting (prevents race condition)
      const { data: v, error: vErr } = await supabase
        .from('vehicles')
        .select('is_available')
        .eq('id', vehicleId)
        .single();

      if (vErr || !v) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      if (!v.is_available) return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });

      // Also check no active (pending/confirmed) booking exists for this vehicle
      const { data: activeBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'confirmed'])
        .limit(1);

      if (activeBookings && activeBookings.length > 0) {
        return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });
      }

      // Mark unavailable FIRST before inserting booking
      const { error: updateErr } = await supabase
        .from('vehicles')
        .update({ is_available: false })
        .eq('id', vehicleId)
        .eq('is_available', true); // Only update if still available (optimistic lock)

      if (updateErr) return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });

      // Now insert the booking
      const { data: nb, error: insertErr } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();

      if (insertErr) {
        // Rollback: make vehicle available again
        await supabase.from('vehicles').update({ is_available: true }).eq('id', vehicleId);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      // Send SMS to owner
      const { data: ow } = await supabase
        .from('owners')
        .select('phone,whatsapp,shop_name')
        .eq('id', ownerId)
        .single();

      if (ow) {
        await sendSMS(
          ow.whatsapp || ow.phone,
          `DRIVO - New Booking!\nVehicle: ${booking.vehicle_name}\nDates: ${booking.pickup_date} to ${booking.return_date} (${booking.days}d)\nAmount: Rs.${Number(booking.total).toLocaleString()}\nLogin to accept: thedrivo.com`
        );
      }

      // Send SMS to customer
      if (customerId) {
        const { data: cu } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', customerId)
          .single();
        if (cu?.phone) {
          await sendSMS(
            cu.phone,
            `DRIVO - Booking Received!\nVehicle: ${booking.vehicle_name}\nShop: ${ow?.shop_name || ''}\nDates: ${booking.pickup_date} to ${booking.return_date}\nAmount: Rs.${Number(booking.total).toLocaleString()}\nAwaiting shop confirmation.`
          );
        }
      }

      return NextResponse.json({ success: true, booking: nb });
    }

    // ── ACCEPT: confirm one booking, decline all others for same vehicle
    if (action === 'accept') {
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (b.status !== 'pending') return NextResponse.json({ error: 'Booking already processed' }, { status: 400 });

      // Confirm this booking
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      // Decline all other pending bookings for same vehicle
      await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('vehicle_id', b.vehicle_id)
        .eq('status', 'pending')
        .neq('id', bookingId);

      // Vehicle stays unavailable (is_available: false) until completed/cancelled

      // SMS to customer
      if (b.customer_id) {
        const { data: cu } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', b.customer_id)
          .single();
        const { data: ow } = await supabase
          .from('owners')
          .select('shop_name,whatsapp,phone')
          .eq('id', b.owner_id)
          .single();
        if (cu?.phone) {
          await sendSMS(
            cu.phone,
            `DRIVO - Booking CONFIRMED! ✓\nVehicle: ${b.vehicle_name}\nShop: ${ow?.shop_name || ''}\nDates: ${b.pickup_date} to ${b.return_date}\nTotal: Rs.${Number(b.total).toLocaleString()}\nContact shop: ${ow?.whatsapp || ow?.phone || ''}`
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── DECLINE: decline one booking, make vehicle available again
    if (action === 'decline') {
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('id', bookingId);

      // Check if any other active bookings exist before making vehicle available
      const { data: otherActive } = await supabase
        .from('bookings')
        .select('id')
        .eq('vehicle_id', b.vehicle_id)
        .in('status', ['pending', 'confirmed'])
        .neq('id', bookingId)
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        await supabase
          .from('vehicles')
          .update({ is_available: true })
          .eq('id', b.vehicle_id);
      }

      // SMS to customer
      if (b.customer_id) {
        const { data: cu } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', b.customer_id)
          .single();
        if (cu?.phone) {
          await sendSMS(
            cu.phone,
            `DRIVO - Booking Declined\nSorry, your booking for ${b.vehicle_name} was not confirmed.\nVisit thedrivo.com to find another vehicle.`
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── CANCEL: cancel a booking (by owner or customer)
    if (action === 'cancel') {
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      // Make vehicle available again
      await supabase
        .from('vehicles')
        .update({ is_available: true })
        .eq('id', b.vehicle_id);

      const { data: ow } = await supabase
        .from('owners')
        .select('phone,whatsapp,shop_name')
        .eq('id', b.owner_id)
        .single();

      const { data: cu } = b.customer_id
        ? await supabase.from('customers').select('phone').eq('id', b.customer_id).single()
        : { data: null };

      if (ownerId) {
        // Owner cancelled → notify customer
        if ((cu as any)?.phone) {
          await sendSMS(
            (cu as any).phone,
            `DRIVO - Booking Cancelled\nYour booking for ${b.vehicle_name} (${b.pickup_date} to ${b.return_date}) was cancelled by the shop.\nVisit thedrivo.com to find another vehicle.`
          );
        }
      } else {
        // Customer cancelled → notify owner
        if (ow?.whatsapp || ow?.phone) {
          await sendSMS(
            ow.whatsapp || ow.phone,
            `DRIVO - Customer Cancelled\nVehicle: ${b.vehicle_name}\nDates: ${b.pickup_date} to ${b.return_date}\nVehicle is now available again.`
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── COMPLETE: mark rental done, make vehicle available again
    if (action === 'complete') {
      const { data: b } = await supabase
        .from('bookings')
        .select('vehicle_id,vehicle_name,customer_id,owner_id')
        .eq('id', bookingId)
        .single();

      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      // Make vehicle available again after completion
      await supabase
        .from('vehicles')
        .update({ is_available: true })
        .eq('id', b.vehicle_id);

      // Optional: SMS to customer thanking them
      if (b.customer_id) {
        const { data: cu } = await supabase
          .from('customers')
          .select('phone')
          .eq('id', b.customer_id)
          .single();
        if (cu?.phone) {
          await sendSMS(
            cu.phone,
            `DRIVO - Rental Completed!\nThank you for renting ${b.vehicle_name}.\nWe hope you enjoyed it! Visit thedrivo.com to rent again.`
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}