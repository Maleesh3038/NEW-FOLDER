import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// This runs daily via Vercel Cron — checks for completed rentals
// Add to vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 0 * * *" }] }
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find confirmed bookings whose return_date has passed
    const { data: expiredBookings } = await supabase
      .from('bookings')
      .select('id, vehicle_id')
      .eq('status', 'confirmed')
      .lt('return_date', today);

    if (!expiredBookings || expiredBookings.length === 0) {
      return NextResponse.json({ message: 'No expired bookings', count: 0 });
    }

    let count = 0;
    for (const booking of expiredBookings) {
      // Mark booking as completed
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
      // Make vehicle available again
      if (booking.vehicle_id) {
        await supabase.from('vehicles').update({ is_available: true }).eq('id', booking.vehicle_id);
      }
      count++;
    }

    return NextResponse.json({ message: `Auto-completed ${count} expired bookings`, count });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}