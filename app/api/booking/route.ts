import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendSMS(to: string, message: string) {
  if (!to) { console.log('[SMS] Skip: no phone number'); return; }
  if (!process.env.NOTIFY_API_KEY) { console.log('[SMS] Skip: NOTIFY_API_KEY not set'); return; }

  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '94' + phone.slice(1);
  if (!phone.startsWith('94')) phone = '94' + phone;

  // notify.lk needs exactly 11 digits: 94XXXXXXXXX
  if (phone.length !== 11) {
    console.log(`[SMS] Invalid phone length: ${phone} (${phone.length} digits, need 11)`);
    return;
  }

  const params = new URLSearchParams({
    user_id: process.env.NOTIFY_USER_ID || '',
    api_key: process.env.NOTIFY_API_KEY,
    sender_id: process.env.NOTIFY_SENDER_ID || 'NotifyLK',
    to: phone,
    message,
  });

  console.log(`[SMS] Sending to ${phone}, sender_id: ${process.env.NOTIFY_SENDER_ID || 'NotifyLK'}, user_id: ${process.env.NOTIFY_USER_ID}`);

  try {
    const res = await fetch('https://app.notify.lk/api/v1/send?' + params.toString());
    const text = await res.text();
    console.log(`[SMS] Response: ${res.status} — ${text}`);
  } catch (err) {
    console.error('[SMS] Fetch error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, bookingId, booking, vehicleId, customerId, ownerId } = body;

    if (action === 'create') {
      const { data: v, error: vErr } = await supabase
        .from('vehicles').select('is_available').eq('id', vehicleId).single();
      if (vErr || !v) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      if (!v.is_available) return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });

      const { data: activeBookings } = await supabase
        .from('bookings').select('id').eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'confirmed']).limit(1);
      if (activeBookings && activeBookings.length > 0)
        return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });

      const { error: updateErr } = await supabase
        .from('vehicles').update({ is_available: false })
        .eq('id', vehicleId).eq('is_available', true);
      if (updateErr) return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });

      // Platform fee model:
      // Customer pays: Rs. 5,000 (vehicle price — no extra charge)
      // Drivo takes:   Rs.   500 (10% of customer payment)
      // Owner gets:    Rs. 4,500 (90% of customer payment)
      const customerTotal = Number(booking.total) || 0;
      const platformFee   = Math.round(customerTotal * 0.10);
      const ownerPayout   = customerTotal - platformFee;

      const { data: nb, error: insertErr } = await supabase
        .from('bookings').insert({
          ...booking,
          total: customerTotal,
          platform_fee: platformFee,
          owner_payout: ownerPayout,
        }).select().single();
      if (insertErr) {
        await supabase.from('vehicles').update({ is_available: true }).eq('id', vehicleId);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      const { data: ow } = await supabase
        .from('owners').select('phone,whatsapp,shop_name').eq('id', ownerId).single();
      if (ow) {
        await sendSMS(ow.whatsapp || ow.phone,
          `DRIVO - New Booking!\nVehicle: ${booking.vehicle_name}\nDates: ${booking.pickup_date} to ${booking.return_date} (${booking.days}d)\nAmount: Rs.${Number(booking.total).toLocaleString()}\nLogin to accept: thedrivo.com`);
      }
      if (customerId) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', customerId).single();
        if (cu?.phone) {
          await sendSMS(cu.phone,
            `DRIVO - Booking Received!\nVehicle: ${booking.vehicle_name}\nShop: ${ow?.shop_name || ''}\nDates: ${booking.pickup_date} to ${booking.return_date}\nAmount: Rs.${Number(booking.total).toLocaleString()}\nAwaiting shop confirmation.`);
        }
      }
      return NextResponse.json({ success: true, booking: nb });
    }

    if (action === 'accept') {
      const { data: b } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (b.status !== 'pending') return NextResponse.json({ error: 'Booking already processed' }, { status: 400 });

      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      await supabase.from('bookings').update({ status: 'declined' })
        .eq('vehicle_id', b.vehicle_id).eq('status', 'pending').neq('id', bookingId);

      if (b.customer_id) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', b.customer_id).single();
        const { data: ow } = await supabase.from('owners').select('shop_name,whatsapp,phone').eq('id', b.owner_id).single();
        if (cu?.phone) {
          await sendSMS(cu.phone,
            `DRIVO - Booking CONFIRMED! ✓\nVehicle: ${b.vehicle_name}\nShop: ${ow?.shop_name || ''}\nDates: ${b.pickup_date} to ${b.return_date}\nTotal: Rs.${Number(b.total).toLocaleString()}\nContact: ${ow?.whatsapp || ow?.phone || ''}`);
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'decline') {
      const { data: b } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await supabase.from('bookings').update({ status: 'declined' }).eq('id', bookingId);

      const { data: otherActive } = await supabase.from('bookings').select('id')
        .eq('vehicle_id', b.vehicle_id).in('status', ['pending', 'confirmed']).neq('id', bookingId).limit(1);
      if (!otherActive || otherActive.length === 0)
        await supabase.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);

      if (b.customer_id) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', b.customer_id).single();
        if (cu?.phone) {
          await sendSMS(cu.phone,
            `DRIVO - Booking Declined\nSorry, your booking for ${b.vehicle_name} was not confirmed.\nVisit thedrivo.com to find another vehicle.`);
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'cancel') {
      const { data: b } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      await supabase.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);

      const { data: ow } = await supabase.from('owners').select('phone,whatsapp,shop_name').eq('id', b.owner_id).single();
      const { data: cu } = b.customer_id
        ? await supabase.from('customers').select('phone').eq('id', b.customer_id).single()
        : { data: null };

      if (ownerId) {
        if ((cu as any)?.phone)
          await sendSMS((cu as any).phone,
            `DRIVO - Booking Cancelled\nYour booking for ${b.vehicle_name} (${b.pickup_date} to ${b.return_date}) was cancelled by the shop.\nVisit thedrivo.com to find another vehicle.`);
      } else {
        if (ow?.whatsapp || ow?.phone)
          await sendSMS(ow.whatsapp || ow.phone,
            `DRIVO - Customer Cancelled\nVehicle: ${b.vehicle_name}\nDates: ${b.pickup_date} to ${b.return_date}\nVehicle is now available again.`);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'complete') {
      const { data: b } = await supabase.from('bookings')
        .select('vehicle_id,vehicle_name,customer_id,owner_id').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
      await supabase.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);

      if (b.customer_id) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', b.customer_id).single();
        if (cu?.phone) {
          await sendSMS(cu.phone,
            `DRIVO - Rental Completed!\nThank you for renting ${b.vehicle_name}.\nWe hope you enjoyed it! Visit thedrivo.com to rent again.`);
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