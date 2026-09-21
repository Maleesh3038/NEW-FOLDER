'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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

// ── Palette (validated dark-surface categorical order) ──────────────────────
const C = {
  blue:    '#3987e5',
  orange:  '#d95926',
  aqua:    '#199e70',
  yellow:  '#c98500',
  magenta: '#d55181',
  violet:  '#9085e9',
  red:     '#e66767',
  surface: '#111827',
  surface2:'#1f2937',
  border:  '#374151',
  grid:    '#1f2937',
  textPri: '#f9fafb',
  textSec: '#9ca3af',
  textMut: '#6b7280',
};

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ x, y, label, value, color }: { x: number; y: number; label: string; value: number; color: string }) {
  return (
    <g>
      <rect x={x - 48} y={y - 44} width={96} height={36} rx={6}
        fill={C.surface2} stroke={C.border} strokeWidth={1} />
      <text x={x} y={y - 27} textAnchor="middle" fontSize={10} fill={C.textSec}>{label}</text>
      <text x={x} y={y - 14} textAnchor="middle" fontSize={13} fontWeight="700" fill={color}>{value.toLocaleString()}</text>
    </g>
  );
}

// ── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({
  data, color = C.blue, height = 180, label = 'visits'
}: {
  data: { label: string; value: number }[];
  color?: string; height?: number; label?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 600; const H = height;
  const PAD = { t: 12, r: 8, b: 40, l: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const barW = Math.max(4, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;

  // y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ f, v: Math.round(max * f) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {/* grid */}
      {ticks.map(({ f, v }) => {
        const y = PAD.t + chartH - f * chartH;
        return (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
              stroke={C.grid} strokeWidth={1} />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={9} fill={C.textMut}>{v}</text>
          </g>
        );
      })}

      {/* bars */}
      {data.map((d, i) => {
        const x = PAD.l + i * gap + gap / 2;
        const barH = Math.max(d.value > 0 ? 4 : 0, (d.value / max) * chartH);
        const y = PAD.t + chartH - barH;
        const isHov = hovered === i;
        return (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}>
            {/* hit target */}
            <rect x={x - gap / 2} y={PAD.t} width={gap} height={chartH} fill="transparent" />
            {/* bar */}
            <rect
              x={x - barW / 2} y={y} width={barW} height={barH}
              rx={3}
              fill={color}
              opacity={isHov ? 1 : 0.82}
            />
            {isHov && (
              <Tooltip x={x} y={y} label={d.label} value={d.value} color={color} />
            )}
            {/* x label */}
            <text x={x} y={H - 6} textAnchor="middle" fontSize={9} fill={C.textMut}
              transform={data.length > 14 ? `rotate(-35,${x},${H - 6})` : undefined}>
              {d.label}
            </text>
          </g>
        );
      })}

      {/* baseline */}
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + chartH} y2={PAD.t + chartH}
        stroke={C.border} strokeWidth={1} />
    </svg>
  );
}

// ── Donut / Pie Chart ────────────────────────────────────────────────────────
function DonutChart({ slices, title }: { slices: { label: string; value: number; color: string }[]; title: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 80; const cy = 80; const R = 62; const r = 36;
  let angle = -90;

  function arc(pct: number, startA: number) {
    const endA = startA + pct * 360;
    const s = toXY(startA, R); const e = toXY(endA, R);
    const si = toXY(startA, r); const ei = toXY(endA, r);
    const large = pct > 0.5 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${r} ${r} 0 ${large} 0 ${si.x} ${si.y} Z`;
  }

  function toXY(a: number, rr: number) {
    const rad = a * Math.PI / 180;
    return { x: +(cx + rr * Math.cos(rad)).toFixed(2), y: +(cy + rr * Math.sin(rad)).toFixed(2) };
  }

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 160 160" width={160} height={160} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => {
          const pct = s.value / total;
          const startA = angle;
          angle += pct * 360;
          const isHov = hovered === i;
          return (
            <path key={i} d={arc(pct, startA)}
              fill={s.color}
              opacity={isHov ? 1 : 0.85}
              stroke={C.surface} strokeWidth={2}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            />
          );
        })}
        {/* center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight="700" fill={C.textPri}>
          {hovered !== null ? slices[hovered].value : total}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill={C.textSec}>
          {hovered !== null ? slices[hovered].label : title}
        </text>
      </svg>
      {/* legend */}
      <div className="flex flex-col gap-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer', opacity: hovered === null || hovered === i ? 1 : 0.45, transition: 'opacity 0.15s' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span style={{ color: C.textSec }}>{s.label}</span>
            </div>
            <span style={{ color: C.textPri, fontWeight: 600 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Time-of-day heatmap ──────────────────────────────────────────────────────
function TimeHeatmap({ events }: { events: TrafficEvent[] }) {
  const [hov, setHov] = useState<number | null>(null);
  const hours = Array.from({ length: 24 }, (_, h) => ({
    h,
    count: events.filter(e => new Date(e.created_at).getHours() === h).length,
  }));
  const max = Math.max(...hours.map(h => h.count), 1);

  return (
    <div>
      <div className="flex gap-1 items-end" style={{ height: 72 }}>
        {hours.map(({ h, count }) => {
          const pct = count / max;
          const isHov = hov === h;
          return (
            <div key={h} className="flex flex-col items-center flex-1 gap-0.5 h-full justify-end"
              onMouseEnter={() => setHov(h)} onMouseLeave={() => setHov(null)}
              style={{ cursor: 'default' }}>
              {isHov && (
                <span style={{ fontSize: 9, color: C.textPri, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {count}
                </span>
              )}
              <div style={{
                height: `${Math.max(pct * 100, count > 0 ? 6 : 2)}%`,
                background: isHov ? C.blue : `rgba(57,135,229,${0.15 + pct * 0.85})`,
                borderRadius: 3,
                width: '100%',
                transition: 'background 0.15s',
              }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {hours.map(({ h }) => (
          <div key={h} className="flex-1 text-center" style={{ fontSize: 8, color: C.textMut }}>
            {h % 6 === 0 ? h : ''}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-0.5" style={{ fontSize: 9, color: C.textMut }}>
        <span>0:00 midnight</span><span>6:00</span><span>12:00 noon</span><span>18:00</span><span>23:00</span>
      </div>
    </div>
  );
}

// ── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMut, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [filter, setFilter] = useState<Filter>('daily');
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const from = new Date(now);
    if (filter === 'daily')   from.setDate(from.getDate() - 7);
    if (filter === 'weekly')  from.setDate(from.getDate() - 28);
    if (filter === 'monthly') from.setMonth(from.getMonth() - 6);
    if (filter === 'yearly')  from.setFullYear(from.getFullYear() - 2);

    const { data } = await supabase
      .from('traffic_events')
      .select('*')
      .gte('created_at', from.toISOString())
      .order('created_at', { ascending: true });

    setEvents(data || []);
    setLastUpdated(new Date());
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── bar chart buckets ──
  const barData = useMemo(() => {
    const now = new Date();
    if (filter === 'daily') {
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (13 - i));
        const ds = d.toISOString().split('T')[0];
        return {
          label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
          value: events.filter(e => e.created_at.startsWith(ds)).length,
        };
      });
    }
    if (filter === 'weekly') {
      return Array.from({ length: 4 }, (_, i) => {
        const ws = new Date(now); ws.setDate(ws.getDate() - (3 - i) * 7);
        const we = new Date(ws); we.setDate(we.getDate() + 6);
        return {
          label: `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          value: events.filter(e => { const d = new Date(e.created_at); return d >= ws && d <= we; }).length,
        };
      });
    }
    if (filter === 'monthly') {
      return Array.from({ length: 6 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: events.filter(e => {
            const d = new Date(e.created_at);
            return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
          }).length,
        };
      });
    }
    return Array.from({ length: 24 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (23 - i), 1);
      return {
        label: m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: events.filter(e => {
          const d = new Date(e.created_at);
          return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
        }).length,
      };
    });
  }, [filter, events]);

  // ── pie data ──
  const deviceSlices = useMemo(() => {
    const c: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    events.forEach(e => { if (e.device in c) c[e.device]++; });
    return [
      { label: 'Mobile',  value: c.mobile,  color: C.blue },
      { label: 'Desktop', value: c.desktop, color: C.aqua },
      { label: 'Tablet',  value: c.tablet,  color: C.yellow },
    ].filter(s => s.value > 0);
  }, [events]);

  const browserSlices = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.browser] = (c[e.browser] || 0) + 1; });
    const colors = [C.blue, C.orange, C.aqua, C.yellow, C.magenta, C.violet];
    return Object.entries(c).sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [events]);

  const pageSlices = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.page || '/'] = (c[e.page || '/'] || 0) + 1; });
    const colors = [C.blue, C.orange, C.aqua, C.yellow, C.magenta, C.violet];
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value], i) => ({ label, value, color: colors[i] }));
  }, [events]);

  const topPages = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach(e => { c[e.page || '/'] = (c[e.page || '/'] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  const totalVisits = events.length;
  const uniqueSessions = new Set(events.filter(e => e.session_id).map(e => e.session_id)).size;
  const mobileCount = events.filter(e => e.device === 'mobile').length;
  const mobilePct = totalVisits ? Math.round(mobileCount / totalVisits * 100) : 0;
  const peakHour = (() => {
    const c = Array(24).fill(0);
    events.forEach(e => c[new Date(e.created_at).getHours()]++);
    const max = Math.max(...c);
    return max > 0 ? c.indexOf(max) : null;
  })();

  const filters: { key: Filter; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.surface, color: C.textPri, fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ color: C.textSec, textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Admin
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.textPri }}>Traffic Analytics</h1>
            <div style={{ fontSize: 12, color: C.textMut, marginTop: 2 }}>
              Drivo LK
              {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* filter tabs */}
          <div style={{ display: 'flex', background: C.surface2, borderRadius: 12, padding: 3, gap: 2, border: `1px solid ${C.border}` }}>
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: filter === f.key ? C.blue : 'transparent',
                  color: filter === f.key ? '#fff' : C.textSec,
                  transition: 'all 0.15s',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* refresh */}
          <button onClick={fetchEvents}
            style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, border: `1px solid ${C.border}`, background: C.surface2, color: C.textSec, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ color: C.textMut, fontSize: 15 }}>Loading analytics…</div>
        </div>
      ) : totalVisits === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: C.textMut }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.textSec, marginBottom: 8 }}>No traffic data yet</div>
          <div style={{ fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
            Make sure <code style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4 }}>TrafficTracker</code> is added to your <code style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4 }}>layout.tsx</code> and the site has been visited.
          </div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiTile label="Total Visits" value={totalVisits} color={C.blue} />
            <KpiTile label="Unique Sessions" value={uniqueSessions} color={C.aqua} sub={`${totalVisits > 0 ? Math.round(totalVisits / uniqueSessions * 10) / 10 : 0} pages/session avg`} />
            <KpiTile label="Mobile Share" value={`${mobilePct}%`} color={C.orange} sub={`${mobileCount} mobile visits`} />
            <KpiTile label="Peak Hour" value={peakHour !== null ? `${peakHour}:00` : '—'} color={C.yellow} sub="busiest time of day" />
          </div>

          {/* Main bar chart */}
          <div style={{ background: C.surface2, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri, marginBottom: 16 }}>
              Visits Over Time
              <span style={{ fontSize: 11, color: C.textMut, fontWeight: 400, marginLeft: 8 }}>
                {filter === 'daily' ? 'Last 14 days' : filter === 'weekly' ? 'Last 4 weeks' : filter === 'monthly' ? 'Last 6 months' : 'Last 2 years'}
              </span>
            </div>
            <BarChart data={barData} color={C.blue} height={180} />
          </div>

          {/* Pie charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
            {[
              { title: 'Devices', slices: deviceSlices.length ? deviceSlices : [{ label: 'Unknown', value: totalVisits, color: C.blue }] },
              { title: 'Browsers', slices: browserSlices.length ? browserSlices : [{ label: 'Unknown', value: totalVisits, color: C.blue }] },
              { title: 'Pages', slices: pageSlices.length ? pageSlices : [{ label: '/', value: totalVisits, color: C.blue }] },
            ].map(({ title, slices }) => (
              <div key={title} style={{ background: C.surface2, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri, marginBottom: 16 }}>{title}</div>
                <DonutChart slices={slices} title={title.toLowerCase()} />
              </div>
            ))}
          </div>

          {/* Time heatmap */}
          <div style={{ background: C.surface2, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri, marginBottom: 16 }}>
              Time-of-Day Activity
              <span style={{ fontSize: 11, color: C.textMut, fontWeight: 400, marginLeft: 8 }}>Hour 0–23 · Hover for count</span>
            </div>
            <TimeHeatmap events={events} />
          </div>

          {/* Top pages table */}
          <div style={{ background: C.surface2, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri, marginBottom: 16 }}>Top Pages</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['#', 'Page', 'Visits', 'Share'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Visits' || h === 'Share' || h === '#' ? 'center' : 'left', color: C.textMut, fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPages.map(([page, count], i) => (
                  <tr key={page} style={{ borderBottom: `1px solid ${C.grid}` }}>
                    <td style={{ padding: '9px 8px', textAlign: 'center', color: C.textMut, fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '9px 8px', fontFamily: 'monospace', color: C.blue, fontSize: 12 }}>{page || '/'}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 700, color: C.textPri }}>{count.toLocaleString()}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(count / totalVisits * 100)}%`, background: C.blue, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: C.textSec, fontSize: 11 }}>{Math.round(count / totalVisits * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
