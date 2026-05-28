import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  'mailto:admin@drivo.lk',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, userType, subscription, notification } = body;

    // ── Save/update subscription
    if (action === 'subscribe') {
      await supabase.from('push_subscriptions').upsert({
        user_id:      userId,
        user_type:    userType || 'customer',
        subscription: JSON.stringify(subscription),
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' });
      return NextResponse.json({ success: true });
    }

    // ── Remove subscription
    if (action === 'unsubscribe') {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      return NextResponse.json({ success: true });
    }

    // ── Send to one user
    if (action === 'send') {
      const { data: rows } = await supabase
        .from('push_subscriptions').select('subscription').eq('user_id', userId);
      if (!rows?.length) return NextResponse.json({ sent: 0 });

      let sent = 0;
      for (const row of rows) {
        try {
          await webpush.sendNotification(
            JSON.parse(row.subscription),
            JSON.stringify(notification)
          );
          sent++;
        } catch (e: any) {
          // Remove expired subscriptions
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('user_id', userId);
          }
        }
      }
      return NextResponse.json({ sent });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Push error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}