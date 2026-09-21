import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function detectDevice(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/opr\//i.test(ua)) return 'Opera';
  return 'Other';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { page = '/', referrer = '', session_id = '' } = body;

    const ua = req.headers.get('user-agent') || '';
    const device = detectDevice(ua);
    const browser = detectBrowser(ua);

    // Skip admin panel traffic
    if (page.startsWith('/admin')) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Insert into traffic_events
    await supabase.from('traffic_events').insert({
      session_id,
      page,
      referrer,
      device,
      browser,
      country: 'LK',
    });

    // Update daily traffic aggregate
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('traffic')
      .select('id, visitor_count')
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('traffic')
        .update({ visitor_count: existing.visitor_count + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('traffic').insert({
        date: today,
        visitor_count: 1,
        booking_count: 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[TRACK]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
