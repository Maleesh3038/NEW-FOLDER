import { NextRequest, NextResponse } from 'next/server';

const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY!;
const NOTIFY_USER_ID = process.env.NOTIFY_USER_ID!;
const NOTIFY_SENDER  = process.env.NOTIFY_SENDER_ID || 'DRIVO';

async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    if (!to || !NOTIFY_API_KEY || !NOTIFY_USER_ID) return false;
    let phone = to.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '94' + phone.slice(1);
    if (!phone.startsWith('94')) phone = '94' + phone;

    const params = new URLSearchParams({
      user_id:   NOTIFY_USER_ID,
      api_key:   NOTIFY_API_KEY,
      sender_id: NOTIFY_SENDER,
      to:        phone,
      message:   message,
    });

    const res = await fetch(`https://app.notify.lk/api/v1/send?${params}`, { method: 'GET' });
    const data = await res.json();
    console.log('SMS result:', data);
    return data.status === 'success';
  } catch (err) {
    console.error('SMS error:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, ownerPhone, customerPhone, vehicleName, pickupDate, returnDate, days, total, shopName } = await req.json();
    const results: Record<string, boolean> = {};

    if (type === 'booking') {
      // ── New booking received — notify owner
      if (ownerPhone) {
        results.owner = await sendSMS(ownerPhone,
          `DRIVO - Booking Request!\n` +
          `Vehicle: ${vehicleName}\n` +
          `Dates: ${pickupDate} - ${returnDate} (${days}d)\n` +
          `Amount: Rs.${Number(total).toLocaleString()}\n` +
          `Login to accept: thedrivo.com`
        );
      }
      // ── Notify customer booking received
      if (customerPhone) {
        results.customer = await sendSMS(customerPhone,
          `DRIVO - Booking Received!\n` +
          `Vehicle: ${vehicleName}\n` +
          `Shop: ${shopName}\n` +
          `Dates: ${pickupDate} - ${returnDate}\n` +
          `Amount: Rs.${Number(total).toLocaleString()}\n` +
          `Awaiting shop confirmation.`
        );
      }
    }

    if (type === 'confirmed') {
      // ── Owner confirmed — notify customer
      if (customerPhone) {
        results.customer = await sendSMS(customerPhone,
          `DRIVO - Booking CONFIRMED! ✓\n` +
          `Vehicle: ${vehicleName}\n` +
          `Shop: ${shopName}\n` +
          `Dates: ${pickupDate} - ${returnDate}\n` +
          `Total: Rs.${Number(total).toLocaleString()}\n` +
          `thedrivo.com`
        );
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('SMS route error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}