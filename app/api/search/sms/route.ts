import { NextRequest, NextResponse } from 'next/server';

const NOTIFY_API_KEY  = process.env.NOTIFY_API_KEY!;
const NOTIFY_USER_ID  = process.env.NOTIFY_USER_ID!;
const NOTIFY_SENDER   = process.env.NOTIFY_SENDER_ID || 'DRIVO';

async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    // Clean phone number — remove spaces, add 94 prefix
    let phone = to.replace(/\s+/g, '').replace(/^0/, '94');
    if (!phone.startsWith('94')) phone = '94' + phone;

    const params = new URLSearchParams({
      user_id:   NOTIFY_USER_ID,
      api_key:   NOTIFY_API_KEY,
      sender_id: NOTIFY_SENDER,
      to:        phone,
      message:   message,
    });

    const res = await fetch(
      `https://app.notify.lk/api/v1/send?${params.toString()}`,
      { method: 'GET' }
    );

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
    const body = await req.json();
    const { type, ownerPhone, customerPhone, vehicleName, pickupDate, returnDate, days, total, shopName } = body;

    const results: { owner?: boolean; customer?: boolean } = {};

    // ── Owner SMS
    if (ownerPhone) {
      const ownerMsg =
        `DRIVO - New Booking!\n` +
        `Vehicle: ${vehicleName}\n` +
        `Dates: ${pickupDate} to ${returnDate} (${days} day${days>1?'s':''})\n` +
        `Total: Rs.${Number(total).toLocaleString()}\n` +
        `Login: thedrivo.com/admin`;

      results.owner = await sendSMS(ownerPhone, ownerMsg);
    }

    // ── Customer SMS
    if (customerPhone) {
      const custMsg =
        `DRIVO - Booking Received!\n` +
        `Vehicle: ${vehicleName}\n` +
        `Shop: ${shopName}\n` +
        `Dates: ${pickupDate} to ${returnDate}\n` +
        `Total: Rs.${Number(total).toLocaleString()}\n` +
        `thedrivo.com`;

      results.customer = await sendSMS(customerPhone, custMsg);
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('SMS route error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}