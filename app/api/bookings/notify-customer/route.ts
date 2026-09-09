import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendWhatsApp(to: string, message: string) {
  if (!process.env.ULTRAMSG_INSTANCE || !process.env.ULTRAMSG_TOKEN) return;
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '94' + phone.slice(1);
  if (!phone.startsWith('94')) phone = '94' + phone;
  try {
    await fetch(`https://api.ultramsg.com/instance${process.env.ULTRAMSG_INSTANCE}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: process.env.ULTRAMSG_TOKEN!, to: `+${phone}`, body: message, priority: '10' }),
    });
  } catch (err) { console.error('[WA]', err); }
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId, type } = await req.json();

    const { data: booking } = await supabase
      .from('bookings')
      .select('*, customers(first_name, last_name, phone, email), owners(shop_name, phone, whatsapp, location, google_maps_url)')
      .eq('id', bookingId)
      .single();

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const customer = booking.customers;
    const owner    = booking.owners;
    const adminPhone = process.env.DRIVO_ADMIN_WHATSAPP!;

    if (type === 'confirmed') {
      // Customer ට confirm + partner details
      if (customer?.phone) {
        await sendWhatsApp(customer.phone,
          `🎉 *Booking Confirmed!*\n\n🚙 ${booking.vehicle_name}\n📅 ${booking.pickup_date} → ${booking.return_date}\n\n*Partner Details:*\n🏪 ${owner?.shop_name || '—'}\n📞 ${owner?.whatsapp || owner?.phone || '—'}\n📍 ${owner?.location || '—'}\n${owner?.google_maps_url ? `🗺️ ${owner.google_maps_url}` : ''}\n\n💳 Pay Rs. ${Math.round((booking.total || 0) * 0.90).toLocaleString()} at pickup\n\nස්තූතියි Drivo LK! 🌐 thedrivo.com`
        );
      }

      // Admin ට notify
      if (adminPhone) {
        await sendWhatsApp(adminPhone,
          `✅ *Partner Confirmed!*\n\n🚙 ${booking.vehicle_name}\n👤 ${customer?.first_name} ${customer?.last_name}\n📅 ${booking.pickup_date} → ${booking.return_date}\n💰 Rs. ${(booking.total || 0).toLocaleString()}\n\nBooking ID: ${bookingId?.slice(0, 8)}`
        );
      }

      // wa_customer_sent_at update
      await supabase.from('bookings').update({ wa_customer_sent_at: new Date().toISOString() }).eq('id', bookingId);

    } else if (type === 'declined') {
      // Customer ට decline notify
      if (customer?.phone) {
        await sendWhatsApp(customer.phone,
          `😔 *Booking Update*\n\nඅවාසනාවකට ඔබේ booking decline කළා.\n\n🚙 ${booking.vehicle_name}\n📅 ${booking.pickup_date} → ${booking.return_date}\n\nවෙනත් vehicle select කරන්න:\n🌐 thedrivo.com`
        );
      }

      // Admin ට notify
      if (adminPhone) {
        await sendWhatsApp(adminPhone,
          `❌ *Partner Declined*\n\n🚙 ${booking.vehicle_name}\n👤 ${customer?.first_name} ${customer?.last_name}\n📅 ${booking.pickup_date} → ${booking.return_date}\n\nBooking ID: ${bookingId?.slice(0, 8)}`
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[NOTIFY]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
