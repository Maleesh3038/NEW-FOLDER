'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL    = 'admin@drivo.lk';
const ADMIN_PASSWORD = 'Drivo@Admin2026!';
const ADMIN_SESSION  = 'drivo_admin_v2';

type AdminTab = 'dashboard' | 'partners' | 'customers' | 'vehicles' | 'bookings';

function DrivoLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="28" fill="#111"/>
      <path d="M38 35H55C65.5 35 72 41.5 72 50C72 58.5 65.5 65 55 65H30V60H38V35Z" fill="white"/>
      <path d="M38 60H53C61 60 66 55.5 66 50C66 44.5 61 40 53 40H38V60Z" fill="#111"/>
    </svg>
  );
}

export default function AdminPage() {
  const [authed,    setAuthed]    = useState(false);
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loginErr,  setLoginErr]  = useState('');
  const [tab,       setTab]       = useState<AdminTab>('dashboard');
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState('');

  // Data
  const [owners,    setOwners]    = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles,  setVehicles]  = useState<any[]>([]);
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [traffic,   setTraffic]   = useState<any[]>([]);

  // Selected for detail view
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  const showToast = (msg: string, dur = 3000) => {
    setToast(msg); setTimeout(() => setToast(''), dur);
  };

  // ── Load all data from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    const [ow, cu, vh, bk, tr] = await Promise.all([
      supabase.from('owners').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*, vehicle_photos(storage_url, sort_order)').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('booked_at', { ascending: false }),
      supabase.from('traffic').select('*').order('date', { ascending: false }).limit(30),
    ]);
    if (ow.data)  setOwners(ow.data);
    if (cu.data)  setCustomers(cu.data);
    if (vh.data)  setVehicles(vh.data);
    if (bk.data)  setBookings(bk.data);
    if (tr.data)  setTraffic(tr.data.reverse());
    setLoading(false);
  }, []);

  // ── Real-time subscriptions
  useEffect(() => {
    if (!authed) return;
    loadData();

    // Subscribe to bookings changes
    const bookingSub = supabase.channel('admin-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        supabase.from('bookings').select('*').order('booked_at', { ascending: false })
          .then(({ data }) => { if (data) setBookings(data); });
      }).subscribe();

    // Subscribe to owners changes
    const ownerSub = supabase.channel('admin-owners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owners' }, () => {
        supabase.from('owners').select('*').order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setOwners(data); });
      }).subscribe();

    // Subscribe to vehicles changes
    const vehicleSub = supabase.channel('admin-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        supabase.from('vehicles').select('*, vehicle_photos(storage_url, sort_order)')
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setVehicles(data); });
      }).subscribe();

    // Subscribe to customers
    const custSub = supabase.channel('admin-customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        supabase.from('customers').select('*').order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setCustomers(data); });
      }).subscribe();

    return () => {
      supabase.removeChannel(bookingSub);
      supabase.removeChannel(ownerSub);
      supabase.removeChannel(vehicleSub);
      supabase.removeChannel(custSub);
    };
  }, [authed, loadData]);

  // ── Session restore
  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_SESSION) === 'true') setAuthed(true);
  }, []);

  const handleLogin = () => {
    setLoginErr('');
    if (email.trim() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setLoginErr('Invalid credentials'); return;
    }
    sessionStorage.setItem(ADMIN_SESSION, 'true');
    setAuthed(true);
  };

  const logout = () => { sessionStorage.removeItem(ADMIN_SESSION); setAuthed(false); };

  // ── Actions
  const toggleBlockOwner = async (id: string, blocked: boolean) => {
    await supabase.from('owners').update({ blocked: !blocked }).eq('id', id);
    setOwners(prev => prev.map(o => o.id === id ? { ...o, blocked: !blocked } : o));
    showToast(!blocked ? 'Partner blocked' : 'Partner unblocked');
  };

  const toggleBlockCustomer = async (id: string, blocked: boolean) => {
    await supabase.from('customers').update({ blocked: !blocked }).eq('id', id);
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, blocked: !blocked } : c));
    showToast(!blocked ? 'Customer blocked' : 'Customer unblocked');
  };

  const toggleVehicle = async (id: string, current: boolean) => {
    await supabase.from('vehicles').update({ is_available: !current }).eq('id', id);
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, is_available: !current } : v));
    showToast(!current ? 'Vehicle is now live' : 'Vehicle hidden');
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    await supabase.from('vehicle_photos').delete().eq('vehicle_id', id);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('vehicle_id', id).eq('status', 'pending');
    await supabase.from('vehicles').delete().eq('id', id);
    setVehicles(prev => prev.filter(v => v.id !== id));
    showToast('Vehicle deleted');
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    if (selectedBooking?.id === id) setSelectedBooking((prev: any) => ({ ...prev, status }));
    showToast('Booking updated');
  };

  // ── Computed stats
  const pendingBookings   = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  // Only count COMPLETED bookings for revenue (not pending/confirmed/cancelled/declined)
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const activeBookings    = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'declined');
  const totalRevenue      = completedBookings.reduce((s, b) => s + (b.total || 0), 0);
  const platformEarnings  = completedBookings.reduce((s, b) => s + (b.platform_fee || 0), 0);
  const liveVehicles      = vehicles.filter(v => v.is_available);

  const statusColor = (s: string) =>
    s === 'confirmed'  ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700' :
    s === 'completed'  ? 'text-blue-400 bg-blue-900/30 border-blue-700' :
    s === 'cancelled'  ? 'text-slate-400 bg-slate-800 border-slate-600' :
    s === 'declined'   ? 'text-red-400 bg-red-900/30 border-red-700' :
                         'text-amber-400 bg-amber-900/30 border-amber-700';

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="px-8 py-8 text-center border-b border-slate-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              <DrivoLogo className="w-10 h-10"/>
              <span className="text-white font-black text-2xl">drivo</span>
            </div>
            <span className="text-[10px] bg-red-500 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest">Admin Panel</span>
            <p className="text-slate-400 text-sm mt-3">Restricted — authorised personnel only</p>
          </div>
          <div className="px-8 py-7 space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" placeholder="admin@drivo.lk"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            </div>
            <div className="relative">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-16 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 bottom-3 text-[9px] font-black text-slate-400 hover:text-white transition">
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {loginErr && <div className="bg-red-900/50 border border-red-700 text-red-300 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {loginErr}</div>}
            <button onClick={handleLogin}
              className="w-full py-3.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">
              Access Admin Panel →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white shadow-2xl animate-pulse">{toast}</div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-black text-white">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <img src={selectedBooking.vehicle_img || ''} className="w-28 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-800" alt=""/>
                <div>
                  <p className="font-black text-white text-base">{selectedBooking.vehicle_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{selectedBooking.shop_name} · {selectedBooking.location}</p>
                  <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl divide-y divide-slate-700">
                {[
                  ['Booking ID', selectedBooking.id?.slice(0,8) + '...'],
                  ['Pickup Date', selectedBooking.pickup_date],
                  ['Return Date', selectedBooking.return_date],
                  ['Pickup Time', selectedBooking.pickup_time || '—'],
                  ['Days', `${selectedBooking.days} day${selectedBooking.days > 1 ? 's' : ''}`],
                  ['Delivery', selectedBooking.delivery_type || 'pickup'],
                  ['Customer Total', `Rs. ${(selectedBooking.total || 0).toLocaleString()}`],
                  ['Platform Fee (10%)', `Rs. ${(selectedBooking.platform_fee || 0).toLocaleString()}`],
                  ['Owner Payout', `Rs. ${(selectedBooking.owner_payout || 0).toLocaleString()}`],
                  ['Booked At', selectedBooking.booked_at ? new Date(selectedBooking.booked_at).toLocaleString() : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-slate-400 font-semibold">{k}</span>
                    <span className="font-black text-white">{v}</span>
                  </div>
                ))}
              </div>
              {/* Customer info */}
              {selectedBooking.customer_id && (
                <CustomerInfo customerId={selectedBooking.customer_id} />
              )}
              <div className="flex gap-2">
                {['pending','confirmed','completed','cancelled'].map(s => (
                  <button key={s} onClick={() => updateBookingStatus(selectedBooking.id, s)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase transition border ${selectedBooking.status === s ? 'bg-white text-slate-900 border-white' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partner Detail Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-black text-white">Partner Details</h3>
              <button onClick={() => setSelectedPartner(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-800 rounded-xl divide-y divide-slate-700">
                {[
                  ['Shop Name', selectedPartner.shop_name],
                  ['Owner Name', selectedPartner.owner_name || '—'],
                  ['Email', selectedPartner.email],
                  ['Phone', selectedPartner.phone || '—'],
                  ['WhatsApp', selectedPartner.whatsapp || '—'],
                  ['City', selectedPartner.city || '—'],
                  ['Joined', selectedPartner.created_at ? new Date(selectedPartner.created_at).toLocaleDateString() : '—'],
                  ['Status', selectedPartner.blocked ? 'BLOCKED' : 'ACTIVE'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-slate-400 font-semibold">{k}</span>
                    <span className={`font-black ${k === 'Status' ? (selectedPartner.blocked ? 'text-red-400' : 'text-emerald-400') : 'text-white'}`}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Partner vehicles */}
              <div>
                <p className="text-xs font-black text-slate-400 uppercase mb-2">Vehicles ({vehicles.filter(v => v.owner_id === selectedPartner.id).length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {vehicles.filter(v => v.owner_id === selectedPartner.id).map(v => (
                    <div key={v.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={v.vehicle_photos?.[0]?.storage_url || ''} className="w-10 h-7 rounded-lg object-cover bg-slate-700" alt=""/>
                        <div>
                          <p className="text-xs font-black text-white">{v.name}</p>
                          <p className="text-[10px] text-slate-400">Rs. {(v.price_per_day || 0).toLocaleString()}/day</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${v.is_available ? 'text-emerald-400 bg-emerald-900/30' : 'text-slate-400 bg-slate-700'}`}>
                        {v.is_available ? 'LIVE' : 'HIDDEN'}
                      </span>
                    </div>
                  ))}
                  {vehicles.filter(v => v.owner_id === selectedPartner.id).length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-3">No vehicles listed</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { toggleBlockOwner(selectedPartner.id, selectedPartner.blocked); setSelectedPartner((p: any) => ({...p, blocked: !p.blocked})); }}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition ${selectedPartner.blocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                  {selectedPartner.blocked ? 'Unblock Partner' : 'Block Partner'}
                </button>
                <button onClick={() => setSelectedPartner(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-xs uppercase transition">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40">
          <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2.5">
            <DrivoLogo className="w-8 h-8"/>
            <div>
              <p className="font-black text-white text-base leading-tight">drivo</p>
              <span className="text-[9px] text-red-400 font-black uppercase tracking-wider">Admin · Live</span>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {([
              ['dashboard', '📊', 'Dashboard'],
              ['partners',  '🏪', 'Partners'],
              ['customers', '🧳', 'Customers'],
              ['vehicles',  '🚗', 'Vehicles'],
              ['bookings',  '📋', 'Bookings'],
            ] as [AdminTab, string, string][]).map(([key, icon, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${tab === key ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <span>{icon}</span>{label}
                {key === 'bookings' && pendingBookings.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{pendingBookings.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="px-3 pb-5 border-t border-slate-800 pt-4 space-y-1">
            <button onClick={loadData} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition">
              🔄 Refresh data
            </button>
            <a href="/" target="_blank" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition">
              🌐 View live site
            </a>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-900/40 hover:text-red-400 transition">
              🚪 Log out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 ml-56 p-6">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin"/>
              Loading data...
            </div>
          )}

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">Dashboard</h1>
                  <p className="text-slate-400 text-sm mt-0.5">Real-time platform overview</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-900/30 border border-emerald-800 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
                  Live
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Site Visits',     value: traffic.reduce((s,e:any)=>s+(e.visits||0),0), icon: '👁️', color: 'from-indigo-900/40 to-indigo-900/20', border: 'border-indigo-800/50' },
                  { label: 'Partners',        value: owners.length,          icon: '🏪', color: 'from-blue-900/40 to-blue-900/20',     border: 'border-blue-800/50' },
                  { label: 'Customers',       value: customers.length,       icon: '🧳', color: 'from-purple-900/40 to-purple-900/20', border: 'border-purple-800/50' },
                  { label: 'Vehicles',        value: vehicles.length,        icon: '🚗', color: 'from-slate-800/80 to-slate-800/40',   border: 'border-slate-700' },
                  { label: 'Live Now',        value: liveVehicles.length,    icon: '🟢', color: 'from-emerald-900/40 to-emerald-900/20',border: 'border-emerald-800/50' },
                  { label: 'Active Bookings',  value: activeBookings.length,        icon: '📋', color: 'from-amber-900/40 to-amber-900/20',   border: 'border-amber-800/50' },
                  { label: 'Pending',         value: pendingBookings.length, icon: '⏳', color: 'from-orange-900/40 to-orange-900/20', border: 'border-orange-800/50' },
                  { label: 'Drivo Earnings',  value: `Rs. ${platformEarnings.toLocaleString()}`, icon: '💰', color: 'from-teal-900/40 to-teal-900/20', border: 'border-teal-800/50' },
                  { label: 'Completed Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`,   icon: '📈', color: 'from-green-900/40 to-green-900/20', border: 'border-green-800/50' },
                ].map(s => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-4`}>
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-xl font-black text-white">{s.value}</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Traffic chart */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
                <h2 className="font-black text-white text-base mb-4">Traffic — last 7 days</h2>
                {traffic.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No traffic data yet</p>
                ) : (
                  <div className="space-y-3">
                    {traffic.slice(-7).map((e: any) => {
                      const maxV = Math.max(...traffic.slice(-7).map((x: any) => x.visits || 0), 1);
                      const maxB = Math.max(...traffic.slice(-7).map((x: any) => x.bookings || x.booking_count || 0), 1);
                      return (
                        <div key={e.date} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">{e.date?.slice(5)}</span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-14 text-[10px] text-slate-500">Visits</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-2">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${((e.visits||0) / maxV) * 100}%` }}/>
                              </div>
                              <span className="text-xs text-white w-6 text-right">{e.visits || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-14 text-[10px] text-slate-500">Bookings</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-2">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((e.bookings||e.booking_count||0) / maxB) * 100}%` }}/>
                              </div>
                              <span className="text-xs text-white w-6 text-right">{e.bookings || e.booking_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent bookings */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-white text-base">Recent Bookings</h2>
                  <button onClick={() => setTab('bookings')} className="text-xs text-slate-400 hover:text-white transition">View all →</button>
                </div>
                <div className="space-y-2">
                  {bookings.slice(0, 8).map(b => (
                    <div key={b.id} onClick={() => setSelectedBooking(b)}
                      className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0 cursor-pointer hover:bg-slate-800/50 rounded-xl px-2 transition">
                      <div>
                        <p className="text-sm font-bold text-white">{b.vehicle_name}</p>
                        <p className="text-xs text-slate-400">{b.pickup_date} → {b.return_date} · {b.shop_name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-white">Rs. {(b.total||0).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <p className="text-slate-500 text-sm text-center py-6">No bookings yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* ══ PARTNERS ══ */}
          {tab === 'partners' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white">Partners</h1>
                <p className="text-slate-400 text-sm">{owners.length} registered · {owners.filter(o => o.blocked).length} blocked</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Shop</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Vehicles</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {owners.map(o => (
                        <tr key={o.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black text-xs">{(o.shop_name||'?').charAt(0)}</div>
                              <span className="font-bold text-white">{o.shop_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{o.email}</td>
                          <td className="px-4 py-3 text-slate-300">{o.phone || '—'}</td>
                          <td className="px-4 py-3 text-slate-300">{o.city || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-white font-black">{vehicles.filter(v => v.owner_id === o.id).length}</span>
                            <span className="text-slate-500 ml-1">({vehicles.filter(v => v.owner_id === o.id && v.is_available).length} live)</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${o.blocked ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                              {o.blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button onClick={() => setSelectedPartner(o)} className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-blue-600 rounded-lg transition text-white">View</button>
                            <button onClick={() => toggleBlockOwner(o.id, o.blocked)}
                              className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${o.blocked ? 'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400' : 'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>
                              {o.blocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {owners.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No partners yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ CUSTOMERS ══ */}
          {tab === 'customers' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white">Customers</h1>
                <p className="text-slate-400 text-sm">{customers.length} registered · {customers.filter(c => c.blocked).length} blocked</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">NIC</th>
                      <th className="px-4 py-3">License</th>
                      <th className="px-4 py-3">Bookings</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {customers.map(c => (
                        <tr key={c.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-blue-900 rounded-lg flex items-center justify-center text-blue-300 font-black text-xs">{(c.first_name||'?').charAt(0)}</div>
                              <span className="font-bold text-white">{c.first_name} {c.last_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{c.email}</td>
                          <td className="px-4 py-3 text-slate-300">{c.phone || '—'}</td>
                          <td className="px-4 py-3 text-slate-300">{c.city || '—'}</td>
                          <td className="px-4 py-3 text-slate-300">{c.nic || '—'}</td>
                          <td className="px-4 py-3 text-slate-300">{c.driving_license || '—'}</td>
                          <td className="px-4 py-3 font-black text-white">{bookings.filter(b => b.customer_id === c.id).length}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.blocked ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                              {c.blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => toggleBlockCustomer(c.id, c.blocked)}
                              className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${c.blocked ? 'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400' : 'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>
                              {c.blocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {customers.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No customers yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ VEHICLES ══ */}
          {tab === 'vehicles' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white">Vehicles</h1>
                <p className="text-slate-400 text-sm">{vehicles.length} total · {liveVehicles.length} live · {vehicles.length - liveVehicles.length} hidden</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Partner</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Price/Day</th>
                      <th className="px-4 py-3">Bookings</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {vehicles.map(v => {
                        const owner = owners.find(o => o.id === v.owner_id);
                        const img = v.vehicle_photos?.sort((a: any, b: any) => (a.sort_order||0)-(b.sort_order||0))[0]?.storage_url || '';
                        const vBookings = bookings.filter(b => b.vehicle_id === v.id);
                        return (
                          <tr key={v.id} className="hover:bg-slate-800/50 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img src={img} className="w-14 h-9 rounded-lg object-cover flex-shrink-0 bg-slate-800" alt=""/>
                                <span className="font-bold text-white">{v.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{owner?.shop_name || '—'}</td>
                            <td className="px-4 py-3 text-lg">{v.type === 'car' ? '🚙' : v.type === 'bike' ? '🏍️' : '🛺'}</td>
                            <td className="px-4 py-3 text-slate-300">{v.location || '—'}</td>
                            <td className="px-4 py-3 font-black text-white">Rs.{(v.price_per_day||0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-300">{vBookings.length}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${v.is_available ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                {v.is_available ? 'Live' : 'Hidden'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1">
                              <button onClick={() => toggleVehicle(v.id, v.is_available)}
                                className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-amber-600 rounded-lg transition text-white">
                                {v.is_available ? 'Hide' : 'Show'}
                              </button>
                              <button onClick={() => deleteVehicle(v.id)}
                                className="text-[11px] font-black px-2.5 py-1 bg-red-900/50 hover:bg-red-600 rounded-lg transition text-red-400">Del</button>
                            </td>
                          </tr>
                        );
                      })}
                      {vehicles.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No vehicles yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ BOOKINGS ══ */}
          {tab === 'bookings' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white">All Bookings</h1>
                <p className="text-slate-400 text-sm">{bookings.length} total · {pendingBookings.length} pending · {confirmedBookings.length} confirmed</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Shop</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Fee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {bookings.map(b => (
                        <tr key={b.id} className="hover:bg-slate-800/50 transition cursor-pointer" onClick={() => setSelectedBooking(b)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <img src={b.vehicle_img || ''} className="w-10 h-7 rounded-lg object-cover flex-shrink-0 bg-slate-800" alt=""/>
                              <span className="font-bold text-white">{b.vehicle_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{b.shop_name}</td>
                          <td className="px-4 py-3 text-slate-300">{b.pickup_date}<br/><span className="text-slate-500">→ {b.return_date}</span></td>
                          <td className="px-4 py-3 text-slate-300">{b.pickup_time || '—'}</td>
                          <td className="px-4 py-3 font-black text-white">Rs.{(b.total||0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold">Rs.{(b.platform_fee||0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{b.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                            <select className="bg-slate-800 border border-slate-600 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                              value={b.status} onChange={e => updateBookingStatus(b.id, e.target.value)}>
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="declined">Declined</option>
                            </select>
                            {(b.status === 'pending' || b.status === 'confirmed') && (
                              <button onClick={async e => {
                                e.stopPropagation();
                                if (!confirm('Cancel this booking? Vehicle will become available again.')) return;
                                await updateBookingStatus(b.id, 'cancelled');
                                // Make vehicle available again
                                const { createClient } = await import('@supabase/supabase-js');
                                const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
                                await sb.from('vehicles').update({ is_available: true }).eq('id', b.vehicle_id);
                                showToast('Booking cancelled. Vehicle available again.');
                              }} className="text-[11px] font-black px-2.5 py-1 bg-red-900/50 hover:bg-red-600 rounded-lg transition text-red-400">
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {bookings.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No bookings yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ── Customer info component for booking modal
function CustomerInfo({ customerId }: { customerId: string }) {
  const [cust, setCust] = useState<any>(null);
  useEffect(() => {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabaseClient.from('customers').select('first_name,last_name,phone,email,nic,driving_license,city')
      .eq('id', customerId).single().then(({ data }) => setCust(data));
  }, [customerId]);
  if (!cust) return <div className="text-xs text-slate-500 text-center py-2">Loading customer...</div>;
  return (
    <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 space-y-2">
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Customer Info</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[['Name', `${cust.first_name||''} ${cust.last_name||''}`],['Phone',cust.phone||'—'],['Email',cust.email||'—'],['City',cust.city||'—'],['NIC/Passport',cust.nic||'—'],['License',cust.driving_license||'—']].map(([k,v])=>(
          <div key={k}><p className="text-[9px] text-slate-400 font-bold uppercase">{k}</p><p className="font-black text-white">{v}</p></div>
        ))}
      </div>
    </div>
  );
}