'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Filter = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface TrafficEvent {
  id: string;
  session_id: string;
  page: string;
  referrer: string;
  device: string;
  browser: string;
  country: string;
  created_at: string;
}

// --- Minimal SVG bar chart ---
function BarChart({ data, color = '#6366f1' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-40 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-[10px] text-gray-400">{d.value > 0 ? d.value : ''}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 2, background: color }}
          />
          <span className="text-[9px] text-gray-500 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Minimal SVG pie chart ---
function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  let cumAngle = 0;
  const radius = 60;
  const cx = 70;
  const cy = 70;

  function polarToXY(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const paths = slices.map((slice, i) => {
    const angle = (slice.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const large = angle > 180 ? 1 : 0;
    const s = polarToXY(startAngle, radius);
    const e = polarToXY(endAngle, radius);
    const d = `M ${cx} ${cy} L ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y} Z`;
    return <path key={i} d={d} fill={slice.color} opacity={0.9} />;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={140} height={140} viewBox="0 0 140 140">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={radius} fill="#374151" />
        ) : (
          paths
        )}
        <circle cx={cx} cy={cy} r={35} fill="#111827" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">
          {total}
        </text>
      </svg>
      <div className="flex flex-wrap gap-2 justify-center">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-xs text-gray-400">{s.label} ({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Time-of-day heatmap ---
function TimeHeatmap({ events }: { events: TrafficEvent[] }) {
  const hours = Array.from({ length: 24 }, (_, h) => {
    const count = events.filter(e => new Date(e.created_at).getHours() === h).length;
    return { hour: h, count };
  });
  const max = Math.max(...hours.map(h => h.count), 1);

  return (
    <div className="grid grid-cols-12 gap-1">
      {hours.map(({ hour, count }) => (
        <div key={hour} className="flex flex-col items-center gap-1">
          <div
            className="w-full rounded"
            style={{
              height: 28,
              background: `rgba(99,102,241,${count / max})`,
              minHeight: 4,
              border: '1px solid #1f2937',
            }}
            title={`${hour}:00 — ${count} visits`}
          />
          <span className="text-[8px] text-gray-600">{hour}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [filter, setFilter] = useState<Filter>('daily');
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const now = new Date();
      let from: Date;

      if (filter === 'daily') {
        from = new Date(now); from.setDate(from.getDate() - 7);
      } else if (filter === 'weekly') {
        from = new Date(now); from.setDate(from.getDate() - 28);
      } else if (filter === 'monthly') {
        from = new Date(now); from.setMonth(from.getMonth() - 6);
      } else {
        from = new Date(now); from.setFullYear(from.getFullYear() - 2);
      }

      const { data } = await supabase
        .from('traffic_events')
        .select('*')
        .gte('created_at', from.toISOString())
        .order('created_at', { ascending: true });

      setEvents(data || []);
      setLoading(false);
    }
    fetchEvents();
  }, [filter]);

  // --- Bar chart data ---
  const barData = useMemo(() => {
    const now = new Date();
    if (filter === 'daily') {
      // Last 7 days
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        const dayStr = d.toISOString().split('T')[0];
        const value = events.filter(e => e.created_at.startsWith(dayStr)).length;
        return { label, value };
      });
    }
    if (filter === 'weekly') {
      // Last 4 weeks
      return Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (3 - i) * 7 - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const label = `W${i + 1}`;
        const value = events.filter(e => {
          const d = new Date(e.created_at);
          return d >= weekStart && d <= weekEnd;
        }).length;
        return { label, value };
      });
    }
    if (filter === 'monthly') {
      // Last 6 months
      return Array.from({ length: 6 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = m.toLocaleDateString('en-US', { month: 'short' });
        const value = events.filter(e => {
          const d = new Date(e.created_at);
          return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
        }).length;
        return { label, value };
      });
    }
    // yearly: last 2 years by month
    return Array.from({ length: 24 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (23 - i), 1);
      const label = m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const value = events.filter(e => {
        const d = new Date(e.created_at);
        return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
      }).length;
      return { label, value };
    });
  }, [filter, events]);

  // --- Pie chart data: devices ---
  const deviceData = useMemo(() => {
    const counts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    events.forEach(e => { if (e.device in counts) counts[e.device]++; });
    return [
      { label: 'Mobile', value: counts.mobile, color: '#6366f1' },
      { label: 'Desktop', value: counts.desktop, color: '#10b981' },
      { label: 'Tablet', value: counts.tablet, color: '#f59e0b' },
    ];
  }, [events]);

  // --- Pie chart data: browsers ---
  const browserData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.browser] = (counts[e.browser] || 0) + 1; });
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return Object.entries(counts).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length],
    }));
  }, [events]);

  // --- Pie chart data: pages ---
  const pageData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.page] = (counts[e.page] || 0) + 1; });
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({ label, value, color: colors[i] }));
  }, [events]);

  const totalVisits = events.length;
  const uniqueSessions = new Set(events.map(e => e.session_id)).size;

  // Top pages table
  const topPages = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.page] = (counts[e.page] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  const filters: Filter[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
            ← Admin Panel
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Traffic Analytics</h1>
            <p className="text-gray-400 text-sm">Drivo LK — Real-time visitor insights</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse text-lg">Loading analytics...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Visits', value: totalVisits, icon: '👁️', color: 'indigo' },
              { label: 'Unique Sessions', value: uniqueSessions, icon: '👤', color: 'emerald' },
              { label: 'Mobile Users', value: deviceData[0].value, icon: '📱', color: 'amber' },
              { label: 'Desktop Users', value: deviceData[1].value, icon: '💻', color: 'violet' },
            ].map((kpi, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-2xl mb-1">{kpi.icon}</div>
                <div className="text-3xl font-bold text-white">{kpi.value.toLocaleString()}</div>
                <div className="text-gray-400 text-sm mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Main bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Visits Over Time
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({filter === 'daily' ? 'Last 7 days' : filter === 'weekly' ? 'Last 4 weeks' : filter === 'monthly' ? 'Last 6 months' : 'Last 2 years'})
              </span>
            </h2>
            {barData.every(d => d.value === 0) ? (
              <div className="h-40 flex items-center justify-center text-gray-600">
                No traffic data yet. Add tracking to your site first.
              </div>
            ) : (
              <BarChart data={barData} />
            )}
          </div>

          {/* Pie charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Device Types</h2>
              <PieChart slices={deviceData} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Browsers</h2>
              <PieChart slices={browserData.length ? browserData : [{ label: 'None', value: 1, color: '#374151' }]} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Top Pages</h2>
              <PieChart slices={pageData.length ? pageData : [{ label: 'None', value: 1, color: '#374151' }]} />
            </div>
          </div>

          {/* Time of day heatmap */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Time-of-Day Activity
              <span className="ml-2 text-xs text-gray-500 font-normal">(Hour 0–23)</span>
            </h2>
            <TimeHeatmap events={events} />
            <p className="text-xs text-gray-600 mt-2">Hover over each column to see visit count for that hour</p>
          </div>

          {/* Top pages table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Pages</h2>
            {topPages.length === 0 ? (
              <div className="text-gray-600 text-sm">No page data yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-2 font-medium">Page</th>
                    <th className="text-right py-2 font-medium">Visits</th>
                    <th className="text-right py-2 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map(([page, count], i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 text-indigo-300 font-mono">{page || '/'}</td>
                      <td className="py-2 text-right text-white font-bold">{count}</td>
                      <td className="py-2 text-right text-gray-400">
                        {totalVisits ? Math.round((count / totalVisits) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
