'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SUPABASE_URL = 'https://vjmlvpmfxbugsbnzcwvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbWx2cG1meGJ1Z3Nibnpjd3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjMwNDIsImV4cCI6MjA1Nzc5OTA0Mn0.bR4E5UfVhLMDsT6me0q6n_Bpyf4RXkR2I8-M2MpVAeA';

// Generate or retrieve a session ID that persists for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('drivo_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('drivo_sid', sid);
  }
  return sid;
}

// Detect device type
function getDevice(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Detect browser
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  return 'Other';
}

async function trackPageView(page: string) {
  try {
    const session_id = getSessionId();
    if (!session_id) return;

    await fetch(`${SUPABASE_URL}/rest/v1/traffic_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        session_id,
        page,
        device: getDevice(),
        browser: getBrowser(),
        referrer: document.referrer || null,
      }),
    });
  } catch {
    // Silent fail — never break the site for tracking errors
  }
}

export default function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
