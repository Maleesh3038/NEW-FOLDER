'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem('drivo_session_id');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('drivo_session_id', id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export default function TrafficTracker() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    // Don't track admin pages
    if (pathname.startsWith('/admin')) return;
    // Don't re-track same path
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    const session_id = getOrCreateSessionId();
    const referrer = document.referrer || '';

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, referrer, session_id }),
      // fire-and-forget, don't block navigation
    }).catch(() => {});
  }, [pathname]);

  return null;
}
