'use client';

import { useState, useEffect } from 'react';
import { getOwnerAccs, getCustAccs, saveOwnerAccs, saveCustAccs, OWN_ACCS, CUST_ACCS } from '../types';
import { RawVehicle, Booking, OwnerAccount, CustomerAccount } from '../types';

// ── Admin credentials (change these!)
const ADMIN_EMAIL    = 'thedrivo.info@gmail.com';
const ADMIN_PASSWORD = 'Drivo@A12345';
const ADMIN_SESSION  = 'drivo_admin_session_v1';

// ── Traffic tracking key
const TRAFFIC_KEY = 'drivo_traffic_v1';

type TrafficEntry = { date: string; visits: number; bookings: number; };
type AdminTab = 'dashboard' | 'users' | 'vehicles' | 'bookings';

// ── Small logo
function DrivoLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="28" fill="#111"/>
      <path d="M38 35H55C65.5 35 72 41.5 72 50C72 58.5 65.5 65 55 65H30V60H38V35Z" fill="white"/>
      <path d="M38 60H53C61 60 66 55.5 66 50C66 44.5 61 40 53 40H38V60Z" fill="#111"/>
    </svg>
  );
}

// ── Track page visit (called from main site too)
export function trackVisit() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(TRAFFIC_KEY);
    const entries: TrafficEntry[] = raw ? JSON.parse(raw) : [];
    const idx = entries.findIndex(e => e.date === today);
    if (idx > -1) { entries[idx].visits += 1; }
    else { entries.push({ date: today, visits: 1, bookings: 0 }); }
    // Keep last 30 days
    const last30 = entries.slice(-30);
    localStorage.setItem(TRAFFIC_KEY, JSON.stringify(last30));
  } catch {}
}

export function trackBooking() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(TRAFFIC_KEY);
    const entries: TrafficEntry[] = raw ? JSON.parse(raw) : [];
    const idx = entries.findIndex(e => e.date === today);
    if (idx > -1) { entries[idx].bookings += 1; }
    else { entries.push({ date: today, visits: 0, bookings: 1 }); }
    localStorage.setItem(TRAFFIC_KEY, JSON.stringify(entries.slice(-30)));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,    setAuthed]    = useState(false);
  const [loginErr,  setLoginErr]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [tab,       setTab]       = useState<AdminTab>('dashboard');

  // Data
  const [owners,    setOwners]    = useState<Record<string, OwnerAccount>>({});
  const [customers, setCustomers] = useState<Record<string, CustomerAccount>>({});
  const [traffic,   setTraffic]   = useState<TrafficEntry[]>([]);

  // Modals
  const [editVehicle,  setEditVehicle]  = useState<(RawVehicle & { ownerEmail: string }) | null>(null);
  const [editOwner,    setEditOwner]    = useState<OwnerAccount | null>(null);
  const [editCustomer, setEditCustomer] = useState<CustomerAccount | null>(null);
  const [toast,        setToast]        = useState<string>('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Restore session
  useEffect(() => {
    if (localStorage.getItem(ADMIN_SESSION) === 'true') {
      setAuthed(true); loadData();
    }
    // Track this visit
    trackVisit();
  }, []);

  const loadData = () => {
    setOwners(getOwnerAccs());
    setCustomers(getCustAccs());
    try {
      const raw = localStorage.getItem(TRAFFIC_KEY);
      setTraffic(raw ? JSON.parse(raw) : []);
    } catch {}
  };

  // ── Login
  const handleLogin = () => {
    setLoginErr('');
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setLoginErr('Invalid credentials'); return;
    }
    localStorage.setItem(ADMIN_SESSION, 'true');
    setAuthed(true); loadData();
  };

  // ── Logout
  const logout = () => { localStorage.removeItem(ADMIN_SESSION); setAuthed(false); };

  // ── Computed stats
  const allVehicles = Object.entries(owners).flatMap(([ownerEmail, o]) =>
    (o.fleet || []).map(v => ({ ...v, ownerEmail, shopName: o.profile.shopName }))
  );
  const allBookings = [
    ...Object.values(owners).flatMap(o => o.bookings || []),
    ...Object.values(customers).flatMap(c => c.bookings || []),
  ].filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i); // deduplicate

  const totalRevenue = allBookings.filter(b => b.status !== 'pending').reduce((s, b) => s + (b.total || 0), 0);
  const totalVisits  = traffic.reduce((s, e) => s + e.visits, 0);
  const last7 = traffic.slice(-7);

  const statusColor = (s: string) => s === 'confirmed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : s === 'completed' ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

  // ── Save edited vehicle
  const saveVehicle = () => {
    if (!editVehicle) return;
    const accs = getOwnerAccs();
    if (accs[editVehicle.ownerEmail]) {
      accs[editVehicle.ownerEmail].fleet = accs[editVehicle.ownerEmail].fleet.map(
        v => v.id === editVehicle.id ? { ...editVehicle } : v
      );
      saveOwnerAccs(accs); setOwners({ ...accs });
    }
    setEditVehicle(null); showToast('Vehicle updated ✓');
  };

  // ── Delete vehicle
  const deleteVehicle = (ownerEmail: string, vehicleId: string) => {
    if (!confirm('Delete this vehicle?')) return;
    const accs = getOwnerAccs();
    if (accs[ownerEmail]) {
      accs[ownerEmail].fleet = accs[ownerEmail].fleet.filter(v => v.id !== vehicleId);
      saveOwnerAccs(accs); setOwners({ ...accs });
    }
    showToast('Vehicle deleted');
  };

  // ── Toggle vehicle availability
  const toggleVehicle = (ownerEmail: string, vehicleId: string) => {
    const accs = getOwnerAccs();
    if (accs[ownerEmail]) {
      accs[ownerEmail].fleet = accs[ownerEmail].fleet.map(
        v => v.id === vehicleId ? { ...v, isAvailable: !v.isAvailable } : v
      );
      saveOwnerAccs(accs); setOwners({ ...accs });
    }
    showToast('Availability updated');
  };

  // ── Block/unblock owner
  const toggleBlockOwner = (email: string) => {
    const accs = getOwnerAccs();
    if (accs[email]) {
      (accs[email] as any).blocked = !(accs[email] as any).blocked;
      saveOwnerAccs(accs); setOwners({ ...accs });
    }
    showToast('Owner status updated');
  };

  // ── Block/unblock customer
  const toggleBlockCustomer = (email: string) => {
    const accs = getCustAccs();
    if (accs[email]) {
      (accs[email] as any).blocked = !(accs[email] as any).blocked;
      saveCustAccs(accs); setCustomers({ ...accs });
    }
    showToast('Customer status updated');
  };

  // ── Update booking status (admin)
  const updateBookingStatus = (bookingId: string, status: string) => {
    const oaccs = getOwnerAccs();
    let changed = false;
    Object.values(oaccs).forEach(o => {
      const idx = (o.bookings || []).findIndex(b => b.id === bookingId);
      if (idx > -1) { o.bookings[idx].status = status as any; changed = true; }
    });
    if (changed) { saveOwnerAccs(oaccs); setOwners({ ...oaccs }); }
    const caccs = getCustAccs();
    Object.values(caccs).forEach(c => {
      const idx = (c.bookings || []).findIndex(b => b.id === bookingId);
      if (idx > -1) { c.bookings[idx].status = status as any; }
    });
    saveCustAccs(caccs); setCustomers({ ...caccs });
    showToast(`Booking marked as ${status}`);
  };

  // ── Save edited owner profile
  const saveOwner = () => {
    if (!editOwner) return;
    const accs = getOwnerAccs();
    if (accs[editOwner.email]) { accs[editOwner.email].profile = editOwner.profile; saveOwnerAccs(accs); setOwners({ ...accs }); }
    setEditOwner(null); showToast('Owner updated ✓');
  };

  const saveCustomer = () => {
    if (!editCustomer) return;
    const accs = getCustAccs();
    if (accs[editCustomer.email]) { accs[editCustomer.email].profile = editCustomer.profile; saveCustAccs(accs); setCustomers({ ...accs }); }
    setEditCustomer(null); showToast('Customer updated ✓');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
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
            <p className="text-slate-400 text-sm mt-3">Restricted access — authorised personnel only</p>
          </div>
          <div className="px-8 py-7 space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" placeholder="admin@drivo.lk" autoComplete="email"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••••"
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-16 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                  value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 hover:text-slate-200 px-1 transition">
                  {showPw ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
            {loginErr && <div className="bg-red-900/50 border border-red-700 text-red-300 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {loginErr}</div>}
            <button onClick={handleLogin}
              className="w-full py-3.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">
              Access Admin Panel →
            </button>
          </div>
        </div>
        <p className="text-center text-slate-600 text-xs mt-4">drivo.lk · Internal use only</p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white shadow-2xl">{toast}</div>
      )}

      {/* Edit Vehicle Modal */}
      {editVehicle && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-black text-white">Edit Vehicle</h3>
              <button onClick={() => setEditVehicle(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { l: 'Vehicle Name', k: 'name', t: 'text' },
                { l: 'Price per Day (LKR)', k: 'pricePerDay', t: 'number' },
                { l: 'Location', k: 'location', t: 'text' },
                { l: 'Description', k: 'description', t: 'text' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label>
                  <input type={f.t}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-slate-400 transition"
                    value={(editVehicle as any)[f.k]}
                    onChange={e => setEditVehicle({ ...editVehicle, [f.k]: f.t === 'number' ? Number(e.target.value) : e.target.value })}/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Type</label>
                  <select className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none cursor-pointer"
                    value={editVehicle.type} onChange={e => setEditVehicle({ ...editVehicle, type: e.target.value as any })}>
                    <option value="car">Car</option><option value="bike">Bike</option><option value="tuk">Tuk-tuk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none cursor-pointer"
                    value={editVehicle.isAvailable ? 'live' : 'hidden'}
                    onChange={e => setEditVehicle({ ...editVehicle, isAvailable: e.target.value === 'live' })}>
                    <option value="live">Live</option><option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditVehicle(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition">Cancel</button>
                <button onClick={saveVehicle} className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-black text-sm uppercase transition">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Owner Modal */}
      {editOwner && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-black text-white">Edit Owner Profile</h3>
              <button onClick={() => setEditOwner(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              {[{l:'Shop Name',k:'shopName'},{l:'Owner Name',k:'ownerName'},{l:'Phone',k:'phone'},{l:'WhatsApp',k:'whatsapp'},{l:'City',k:'city'}].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label>
                  <input type="text"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-slate-400 transition"
                    value={(editOwner.profile as any)[f.k]}
                    onChange={e => setEditOwner({ ...editOwner, profile: { ...editOwner.profile, [f.k]: e.target.value } })}/>
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditOwner(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition">Cancel</button>
                <button onClick={saveOwner} className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-black text-sm uppercase transition">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editCustomer && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-black text-white">Edit Customer Profile</h3>
              <button onClick={() => setEditCustomer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-3">
              {[{l:'First Name',k:'firstName'},{l:'Last Name',k:'lastName'},{l:'Phone',k:'phone'},{l:'City',k:'city'}].map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label>
                  <input type="text"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-slate-400 transition"
                    value={(editCustomer.profile as any)[f.k]}
                    onChange={e => setEditCustomer({ ...editCustomer, profile: { ...editCustomer.profile, [f.k]: e.target.value } })}/>
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditCustomer(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition">Cancel</button>
                <button onClick={saveCustomer} className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-black text-sm uppercase transition">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR + MAIN LAYOUT ── */}
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40">
          <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2.5">
            <DrivoLogo className="w-8 h-8"/>
            <div>
              <p className="font-black text-white text-base leading-tight">drivo</p>
              <span className="text-[9px] text-red-400 font-black uppercase tracking-wider">Admin</span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {([
              ['dashboard', '📊', 'Dashboard'],
              ['users',     '👥', 'Users'],
              ['vehicles',  '🚗', 'Vehicles'],
              ['bookings',  '📋', 'Bookings'],
            ] as [AdminTab, string, string][]).map(([key, icon, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${tab === key ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <span>{icon}</span>{label}
                {key === 'bookings' && allBookings.filter(b => b.status === 'pending').length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {allBookings.filter(b => b.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="px-3 pb-5 border-t border-slate-800 pt-4 space-y-2">
            <a href="/" target="_blank"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition">
              🌐 View live site
            </a>
            <button onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-900/40 hover:text-red-400 transition">
              🚪 Log out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-56 p-6">

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-0.5">Platform overview — all data</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total owners',    value: Object.keys(owners).length,    icon: '🏪', color: 'from-blue-900/40 to-blue-900/20',   border: 'border-blue-800/50' },
                  { label: 'Total customers', value: Object.keys(customers).length, icon: '🧳', color: 'from-purple-900/40 to-purple-900/20', border: 'border-purple-800/50' },
                  { label: 'Total vehicles',  value: allVehicles.length,            icon: '🚗', color: 'from-emerald-900/40 to-emerald-900/20',border: 'border-emerald-800/50' },
                  { label: 'Live vehicles',   value: allVehicles.filter(v => v.isAvailable).length, icon: '🟢', color: 'from-green-900/40 to-green-900/20', border: 'border-green-800/50' },
                  { label: 'Total bookings',  value: allBookings.length,            icon: '📋', color: 'from-amber-900/40 to-amber-900/20',  border: 'border-amber-800/50' },
                  { label: 'Pending',         value: allBookings.filter(b => b.status === 'pending').length, icon: '⏳', color: 'from-orange-900/40 to-orange-900/20', border: 'border-orange-800/50' },
                  { label: 'Revenue (LKR)',   value: 'Rs. ' + totalRevenue.toLocaleString(), icon: '💰', color: 'from-teal-900/40 to-teal-900/20', border: 'border-teal-800/50' },
                  { label: 'Total page visits',value: totalVisits,                  icon: '👁️', color: 'from-slate-800/80 to-slate-800/40',  border: 'border-slate-700' },
                ].map(s => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-4`}>
                    <div className="text-xl mb-2">{s.icon}</div>
                    <div className="text-xl font-black text-white">{s.value}</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Traffic chart — last 7 days */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
                <h2 className="font-black text-white text-base mb-4">Traffic — last 7 days</h2>
                {last7.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No traffic data yet. Visits are tracked automatically when users open the site.</p>
                ) : (
                  <div className="space-y-3">
                    {last7.map(e => {
                      const maxV = Math.max(...last7.map(x => x.visits), 1);
                      const maxB = Math.max(...last7.map(x => x.bookings), 1);
                      return (
                        <div key={e.date} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">{e.date.slice(5)}</span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-16 text-[10px] text-slate-500 flex-shrink-0">Visits</div>
                              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(e.visits / maxV) * 100}%` }}/>
                              </div>
                              <span className="text-xs text-white w-6 text-right">{e.visits}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 text-[10px] text-slate-500 flex-shrink-0">Bookings</div>
                              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(e.bookings / maxB) * 100}%` }}/>
                              </div>
                              <span className="text-xs text-white w-6 text-right">{e.bookings}</span>
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
                <h2 className="font-black text-white text-base mb-4">Recent bookings</h2>
                <div className="space-y-2">
                  {allBookings.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm font-bold text-white">{b.vehicleName}</p>
                        <p className="text-xs text-slate-400">{b.pickupDate} → {b.returnDate} · {b.shopName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-white">Rs. {b.total?.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                  {allBookings.length === 0 && <p className="text-slate-500 text-sm text-center py-6">No bookings yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══ */}
          {tab === 'users' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-white">Users</h1>

              {/* Owners */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <h2 className="font-black text-white">Owners <span className="text-slate-500 font-medium text-sm ml-1">({Object.keys(owners).length})</span></h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Shop</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Vehicles</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {Object.entries(owners).map(([email, o]) => (
                        <tr key={email} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black text-xs">{o.profile.shopName.charAt(0)}</div>
                              <span className="font-bold text-white text-xs">{o.profile.shopName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{email}</td>
                          <td className="px-4 py-3 text-slate-300">{o.profile.phone}</td>
                          <td className="px-4 py-3 text-slate-300">{o.profile.city}</td>
                          <td className="px-4 py-3"><span className="text-white font-black">{o.fleet?.length || 0}</span> <span className="text-slate-500">total</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${(o as any).blocked ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                              {(o as any).blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button onClick={() => setEditOwner({ ...o })} className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-blue-600 rounded-lg transition text-white">Edit</button>
                            <button onClick={() => toggleBlockOwner(email)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${(o as any).blocked ? 'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400' : 'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>
                              {(o as any).blocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(owners).length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No owners registered yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customers */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <h2 className="font-black text-white">Customers <span className="text-slate-500 font-medium text-sm ml-1">({Object.keys(customers).length})</span></h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Bookings</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {Object.entries(customers).map(([email, c]) => (
                        <tr key={email} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-blue-900 rounded-lg flex items-center justify-center text-blue-300 font-black text-xs">{c.profile.firstName.charAt(0)}</div>
                              <span className="font-bold text-white">{c.profile.firstName} {c.profile.lastName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{email}</td>
                          <td className="px-4 py-3 text-slate-300">{c.profile.phone}</td>
                          <td className="px-4 py-3 text-slate-300">{c.profile.city}</td>
                          <td className="px-4 py-3"><span className="text-white font-black">{c.bookings?.length || 0}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${(c as any).blocked ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                              {(c as any).blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button onClick={() => setEditCustomer({ ...c })} className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-blue-600 rounded-lg transition text-white">Edit</button>
                            <button onClick={() => toggleBlockCustomer(email)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${(c as any).blocked ? 'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400' : 'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>
                              {(c as any).blocked ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(customers).length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No customers registered yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ VEHICLES ══ */}
          {tab === 'vehicles' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">Vehicles</h1>
                  <p className="text-slate-400 text-sm">{allVehicles.length} total · {allVehicles.filter(v => v.isAvailable).length} live</p>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Price/Day</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {allVehicles.map(v => (
                        <tr key={v.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={v.image} className="w-12 h-8 rounded-lg object-cover flex-shrink-0" alt=""/>
                              <span className="font-bold text-white">{v.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{(v as any).shopName}</td>
                          <td className="px-4 py-3 text-lg">{v.type === 'car' ? '🚙' : v.type === 'bike' ? '🏍️' : '🛺'}</td>
                          <td className="px-4 py-3 text-slate-300">{v.location}</td>
                          <td className="px-4 py-3 font-black text-white">Rs.{v.pricePerDay.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${v.isAvailable ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                              {v.isAvailable ? 'Live' : 'Hidden'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button onClick={() => setEditVehicle({ ...v, ownerEmail: (v as any).ownerEmail })}
                              className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-blue-600 rounded-lg transition text-white">Edit</button>
                            <button onClick={() => toggleVehicle((v as any).ownerEmail, v.id)}
                              className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-amber-600 rounded-lg transition text-white">Toggle</button>
                            <button onClick={() => deleteVehicle((v as any).ownerEmail, v.id)}
                              className="text-[11px] font-black px-2.5 py-1 bg-red-900/50 hover:bg-red-600 rounded-lg transition text-red-400">Del</button>
                          </td>
                        </tr>
                      ))}
                      {allVehicles.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No vehicles listed yet</td></tr>}
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
                <p className="text-slate-400 text-sm">{allBookings.length} total · {allBookings.filter(b => b.status === 'pending').length} pending</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Shop</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Delivery</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Update</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {allBookings.map(b => (
                        <tr key={b.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <img src={b.vehicleImg} className="w-10 h-7 rounded-lg object-cover flex-shrink-0" alt=""/>
                              <span className="font-bold text-white">{b.vehicleName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{b.shopName}</td>
                          <td className="px-4 py-3 text-slate-300">{b.pickupDate}<br/><span className="text-slate-500">→ {b.returnDate}</span></td>
                          <td className="px-4 py-3 text-slate-300">{b.deliveryType}</td>
                          <td className="px-4 py-3 font-black text-white">Rs.{b.total?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{b.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <select className="bg-slate-800 border border-slate-600 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                              value={b.status}
                              onChange={e => updateBookingStatus(b.id, e.target.value)}>
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {allBookings.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No bookings yet</td></tr>}
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