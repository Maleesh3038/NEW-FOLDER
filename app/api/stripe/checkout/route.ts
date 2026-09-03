import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { amount, bookingId, vehicleName, customerEmail } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'lkr',
          product_data: {
            name: `Drivo Booking — ${vehicleName}`,
            description: `Booking fee (10%) for ${vehicleName}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: customerEmail,
      success_url: `https://thedrivo.com/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `https://thedrivo.com/?cancelled=true`,
      metadata: { bookingId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
