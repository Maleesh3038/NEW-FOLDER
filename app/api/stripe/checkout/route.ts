import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// LKR to USD approximate rate (update periodically)
const LKR_TO_USD = 0.0033; // 1 LKR ≈ 0.0033 USD (300 LKR = ~$1)

export async function POST(req: NextRequest) {
  try {
    const { amount, bookingId, vehicleName, customerEmail } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Convert LKR to USD for Stripe (Stripe doesn't support LKR)
    const amountUSD = Math.round(amount * LKR_TO_USD * 100); // cents
    const minimumUSD = 50; // Stripe minimum is $0.50 = 50 cents

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Drivo Booking — ${vehicleName}`,
            description: `Booking fee for ${vehicleName} | Rs. ${Number(amount).toLocaleString()} LKR`,
          },
          unit_amount: Math.max(amountUSD, minimumUSD),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: customerEmail || undefined,
      success_url: `https://thedrivo.com/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `https://thedrivo.com/?cancelled=true`,
      metadata: { bookingId, amountLKR: String(amount) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
