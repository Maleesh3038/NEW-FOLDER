import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendSMS(to: string, message: string) {
  if (!to || !process.env.NOTIFY_API_KEY) return;
  let phone = to.replace(/\D/g,'');
  if (phone.startsWith('0')) phone = '94' + phone.slice(1);
  if (!phone.startsWith('94')) phone = '94' + phone;
  const params = new URLSearchParams({
    user_id: process.env.NOTIFY_USER_ID!, api_key: process.env.NOTIFY_API_KEY!,
    sender_id: process.env.NOTIFY_SENDER_ID||'DRIVO', to: phone, message,
  });
  try { await fetch('https://app.notify.lk/api/v1/send?'+params); } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, bookingId, booking, vehicleId, customerId, ownerId } = body;

    if (action === 'create') {
      const { data: v } = await supabase.from('vehicles').select('is_available').eq('id', vehicleId).single();
      if (!v?.is_available) return NextResponse.json({ error: 'Vehicle no longer available' }, { status: 409 });
      const { data: nb, error } = await supabase.from('bookings').insert(booking).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabase.from('vehicles').update({ is_available: false }).eq('id', vehicleId);
      const { data: ow } = await supabase.from('owners').select('phone,whatsapp,shop_name').eq('id', ownerId).single();
      if (ow) await sendSMS(ow.whatsapp||ow.phone, `DRIVO - New Booking!\nVehicle: ${booking.vehicle_name}\nDates: ${booking.pickup_date} to ${booking.return_date} (${booking.days}d)\nAmount: Rs.${Number(booking.total).toLocaleString()}\nAccept at: thedrivo.com`);
      if (customerId) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', customerId).single();
        if (cu?.phone) await sendSMS(cu.phone, `DRIVO - Booking Received!\nVehicle: ${booking.vehicle_name}\nShop: ${ow?.shop_name||''}\nDates: ${booking.pickup_date} to ${booking.return_date}\nAmount: Rs.${Number(booking.total).toLocaleString()}\nAwaiting shop confirmation.`);
      }
      return NextResponse.json({ success: true, booking: nb });
    }

    if (action === 'accept') {
      const { data: b } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      await supabase.from('bookings').update({ status: 'declined' }).eq('vehicle_id', b.vehicle_id).eq('status', 'pending').neq('id', bookingId);
      if (b.customer_id) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', b.customer_id).single();
        const { data: ow } = await supabase.from('owners').select('shop_name,whatsapp,phone').eq('id', b.owner_id).single();
        if (cu?.phone) await sendSMS(cu.phone, `DRIVO - Booking CONFIRMED!\nVehicle: ${b.vehicle_name}\nShop: ${ow?.shop_name||''}\nDates: ${b.pickup_date} to ${b.return_date}\nTotal: Rs.${Number(b.total).toLocaleString()}\nContact: ${ow?.whatsapp||ow?.phone||''}`);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'decline') {
      const { data: b } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await supabase.from('bookings').update({ status: 'declined' }).eq('id', bookingId);
      await supabase.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);
      if (b.customer_id) {
        const { data: cu } = await supabase.from('customers').select('phone').eq('id', b.customer_id).single();
        if (cu?.phone) await sendSMS(cu.phone, `DRIVO - Booking Declined\nSorry, your booking for ${b.vehicle_name} was declined.\nVisit thedrivo.com to find another vehicle.`);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'cancel') {
      const { data: b } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      await supabase.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);
      const { data: ow } = await supabase.from('owners').select('phone,whatsapp').eq('id', b.owner_id).single();
      const { data: cu } = b.customer_id ? await supabase.from('customers').select('phone').eq('id', b.customer_id).single() : { data: null };
      if (ownerId) {
        if ((cu as any)?.phone) await sendSMS((cu as any).phone, `DRIVO - Booking Cancelled\nYour booking for ${b.vehicle_name} was cancelled by the shop.\nVisit thedrivo.com to find another vehicle.`);
      } else {
        if (ow?.whatsapp||ow?.phone) await sendSMS(ow.whatsapp||ow.phone, `DRIVO - Customer Cancelled\nVehicle: ${b.vehicle_name}\nDates: ${b.pickup_date} to ${b.return_date}\nVehicle is now available again.`);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'complete') {
      const { data: b } = await supabase.from('bookings').select('vehicle_id').eq('id', bookingId).single();
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
      if (b?.vehicle_id) await supabase.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}