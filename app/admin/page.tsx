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

type AdminTab = 'dashboard'|'partners'|'customers'|'vehicles'|'bookings';

function DrivoLogo({ className='w-8 h-8' }:{className?:string}) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="28" fill="#111"/>
      <path d="M38 35H55C65.5 35 72 41.5 72 50C72 58.5 65.5 65 55 65H30V60H38V35Z" fill="white"/>
      <path d="M38 60H53C61 60 66 55.5 66 50C66 44.5 61 40 53 40H38V60Z" fill="#111"/>
    </svg>
  );
}

const statusColor = (s:string) =>
  s==='confirmed' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700' :
  s==='completed' ? 'text-blue-400 bg-blue-900/30 border-blue-700' :
  s==='cancelled' ? 'text-slate-400 bg-slate-800 border-slate-600' :
  s==='declined'  ? 'text-red-400 bg-red-900/30 border-red-700' :
                    'text-amber-400 bg-amber-900/30 border-amber-700';

export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [tab,      setTab]      = useState<AdminTab>('dashboard');
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState('');
  const [toastType,setToastType]= useState<'ok'|'err'>('ok');

  const [owners,    setOwners]    = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles,  setVehicles]  = useState<any[]>([]);
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [traffic,   setTraffic]   = useState<any[]>([]);

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [selectedCustomer,setSelectedCustomer]= useState<any>(null);

  // Filters
  const [bookingFilter, setBookingFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [custSearch,    setCustSearch]    = useState('');

  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast(msg); setToastType(type); setTimeout(()=>setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ow,cu,vh,bk,tr] = await Promise.all([
      supabase.from('owners').select('*').order('created_at',{ascending:false}).limit(500),
      supabase.from('customers').select('*').order('created_at',{ascending:false}).limit(1000),
      supabase.from('vehicles').select('*,vehicle_photos(storage_url,sort_order)').order('created_at',{ascending:false}).limit(500),
      supabase.from('bookings').select('*').order('booked_at',{ascending:false}).limit(1000),
      supabase.from('traffic').select('*').order('date',{ascending:false}).limit(60),
    ]);
    if(ow.data)  setOwners(ow.data);
    if(cu.data)  setCustomers(cu.data);
    if(vh.data)  setVehicles(vh.data);
    if(bk.data)  setBookings(bk.data);
    if(tr.data)  setTraffic(tr.data.reverse());
    setLoading(false);
  },[]);

  // Real-time
  useEffect(()=>{
    if(!authed) return;
    loadData();
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>{
        supabase.from('bookings').select('*').order('booked_at',{ascending:false}).limit(1000)
          .then(({data})=>{ if(data) setBookings(data); });
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'owners'},()=>{
        supabase.from('owners').select('*').order('created_at',{ascending:false}).limit(500)
          .then(({data})=>{ if(data) setOwners(data); });
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'customers'},()=>{
        supabase.from('customers').select('*').order('created_at',{ascending:false}).limit(1000)
          .then(({data})=>{ if(data) setCustomers(data); });
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'vehicles'},()=>{
        supabase.from('vehicles').select('*,vehicle_photos(storage_url,sort_order)').order('created_at',{ascending:false}).limit(500)
          .then(({data})=>{ if(data) setVehicles(data); });
      })
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[authed,loadData]);

  useEffect(()=>{ if(sessionStorage.getItem(ADMIN_SESSION)==='true') setAuthed(true); },[]);

  const handleLogin = () => {
    setLoginErr('');
    if(email.trim()!==ADMIN_EMAIL||password!==ADMIN_PASSWORD){ setLoginErr('Invalid credentials'); return; }
    sessionStorage.setItem(ADMIN_SESSION,'true');
    setAuthed(true);
  };
  const logout = ()=>{ sessionStorage.removeItem(ADMIN_SESSION); setAuthed(false); };

  // ── Actions
  const toggleBlockOwner = async(id:string,blocked:boolean)=>{
    await supabase.from('owners').update({blocked:!blocked}).eq('id',id);
    setOwners(p=>p.map(o=>o.id===id?{...o,blocked:!blocked}:o));
    if(selectedPartner?.id===id) setSelectedPartner((p:any)=>({...p,blocked:!blocked}));
    showToast(!blocked?'Partner blocked':'Partner unblocked');
  };
  const toggleBlockCustomer = async(id:string,blocked:boolean)=>{
    await supabase.from('customers').update({blocked:!blocked}).eq('id',id);
    setCustomers(p=>p.map(c=>c.id===id?{...c,blocked:!blocked}:c));
    if(selectedCustomer?.id===id) setSelectedCustomer((p:any)=>({...p,blocked:!blocked}));
    showToast(!blocked?'Customer blocked':'Customer unblocked');
  };
  const toggleVehicle = async(id:string,cur:boolean)=>{
    await supabase.from('vehicles').update({is_available:!cur}).eq('id',id);
    setVehicles(p=>p.map(v=>v.id===id?{...v,is_available:!cur}:v));
    showToast(!cur?'Vehicle is now live':'Vehicle hidden');
  };
  const deleteVehicle = async(id:string)=>{
    if(!confirm('Delete this vehicle? This cannot be undone.')) return;
    await supabase.from('vehicle_photos').delete().eq('vehicle_id',id);
    await supabase.from('vehicles').delete().eq('id',id);
    setVehicles(p=>p.filter(v=>v.id!==id));
    showToast('Vehicle deleted','err');
  };
  const updateBookingStatus = async(id:string,status:string)=>{
    await supabase.from('bookings').update({status}).eq('id',id);
    setBookings(p=>p.map(b=>b.id===id?{...b,status}:b));
    if(selectedBooking?.id===id) setSelectedBooking((p:any)=>({...p,status}));
    if(status==='cancelled'||status==='completed'){
      const b = bookings.find(x=>x.id===id);
      if(b?.vehicle_id) await supabase.from('vehicles').update({is_available:true}).eq('id',b.vehicle_id);
    }
    showToast('Booking updated');
  };
  const deleteBooking = async(id:string)=>{
    if(!confirm('Delete this booking from history?')) return;
    await supabase.from('bookings').delete().eq('id',id);
    setBookings(p=>p.filter(b=>b.id!==id));
    setSelectedBooking(null);
    showToast('Booking deleted from history','err');
  };

  // ── Stats
  const completedBookings = bookings.filter(b=>b.status==='completed');
  const activeBookings    = bookings.filter(b=>b.status!=='cancelled'&&b.status!=='declined');
  const pendingBookings   = bookings.filter(b=>b.status==='pending');
  const totalRevenue      = completedBookings.reduce((s,b)=>s+(b.total||0),0);
  const platformEarnings  = completedBookings.reduce((s,b)=>s+(b.platform_fee||Math.round((b.total||0)*0.10)),0);
  const liveVehicles      = vehicles.filter(v=>v.is_available);
  const totalVisits       = traffic.reduce((s,e:any)=>s+(e.visits||0),0);

  // ── Partner earnings calculator
  const getPartnerStats = (ownerId:string) => {
    const pb = bookings.filter(b=>b.owner_id===ownerId);
    const completed = pb.filter(b=>b.status==='completed');
    const gross     = completed.reduce((s,b)=>s+(b.total||0),0);
    const fee       = completed.reduce((s,b)=>s+(b.platform_fee||Math.round((b.total||0)*0.10)),0);
    return { total:pb.length, completed:completed.length, gross, payout:gross-fee, pending:pb.filter(b=>b.status==='pending').length };
  };

  // ── Filtered bookings
  const filteredBookings = bookings
    .filter(b=> bookingFilter==='all'?true:b.status===bookingFilter)
    .filter(b=> bookingSearch===''?true:
      (b.vehicle_name||'').toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.shop_name||'').toLowerCase().includes(bookingSearch.toLowerCase())
    );

  const filteredPartners  = owners.filter(o=>
    partnerSearch==='' ? true :
    (o.shop_name||'').toLowerCase().includes(partnerSearch.toLowerCase()) ||
    (o.email||'').toLowerCase().includes(partnerSearch.toLowerCase())
  );
  const filteredCustomers = customers.filter(c=>
    custSearch==='' ? true :
    (`${c.first_name||''} ${c.last_name||''}`).toLowerCase().includes(custSearch.toLowerCase()) ||
    (c.email||'').toLowerCase().includes(custSearch.toLowerCase())
  );

  // LOGIN
  if(!authed) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="px-8 py-8 text-center border-b border-slate-700">
            <div className="flex items-center justify-center gap-2 mb-4"><DrivoLogo className="w-10 h-10"/><span className="text-white font-black text-2xl">drivo</span></div>
            <span className="text-[10px] bg-red-500 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest">Admin Panel</span>
            <p className="text-slate-400 text-sm mt-3">Restricted — authorised personnel only</p>
          </div>
          <div className="px-8 py-7 space-y-4">
            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" placeholder="admin@drivo.lk" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/></div>
            <div className="relative"><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <input type={showPw?'text':'password'} placeholder="••••••••" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-16 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 bottom-3 text-[9px] font-black text-slate-400 hover:text-white">{showPw?'HIDE':'SHOW'}</button></div>
            {loginErr&&<div className="bg-red-900/50 border border-red-700 text-red-300 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {loginErr}</div>}
            <button onClick={handleLogin} className="w-full py-3.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-900 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">Access Admin Panel →</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased font-sans">
      {toast&&<div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl transition-all ${toastType==='ok'?'bg-emerald-500':'bg-red-500'} text-white`}>{toast}</div>}

      {/* ── BOOKING DETAIL MODAL ── */}
      {selectedBooking&&(
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-[#111118] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-[#111118]">
              <h3 className="font-black text-white">Booking Details</h3>
              <div className="flex items-center gap-2">
                <button onClick={()=>deleteBooking(selectedBooking.id)} className="text-xs font-black text-red-400 hover:text-red-300 border border-red-800 bg-red-900/30 px-3 py-1.5 rounded-lg transition">🗑 Delete</button>
                <button onClick={()=>setSelectedBooking(null)} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-4">
                <img src={selectedBooking.vehicle_img||''} className="w-28 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-800" alt=""/>
                <div>
                  <p className="font-black text-white text-base">{selectedBooking.vehicle_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{selectedBooking.shop_name} · {selectedBooking.location}</p>
                  <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor(selectedBooking.status)}`}>{selectedBooking.status}</span>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl divide-y divide-slate-700/50 border border-slate-700">
                {[
                  ['Booking ID', selectedBooking.id?.slice(0,8)+'...'],
                  ['Pickup', `${selectedBooking.pickup_date} at ${selectedBooking.pickup_time||'—'}`],
                  ['Return', selectedBooking.return_date],
                  ['Days', `${selectedBooking.days} day${selectedBooking.days>1?'s':''}`],
                  ['Delivery', selectedBooking.delivery_type||'pickup'],
                  ['Customer Total', `Rs. ${(selectedBooking.total||0).toLocaleString()}`],
                  ['Platform Fee', `Rs. ${(selectedBooking.platform_fee||Math.round((selectedBooking.total||0)*0.10)).toLocaleString()}`],
                  ['Owner Payout', `Rs. ${(selectedBooking.owner_payout||Math.round((selectedBooking.total||0)*0.90)).toLocaleString()}`],
                  ['Booked At', selectedBooking.booked_at?new Date(selectedBooking.booked_at).toLocaleString():'—'],
                ].map(([k,v])=>(
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-slate-400 font-semibold">{k}</span>
                    <span className="font-black text-white">{v}</span>
                  </div>
                ))}
              </div>
              {selectedBooking.customer_id&&<CustomerInfoCard customerId={selectedBooking.customer_id}/>}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Update Status</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {['pending','confirmed','completed','cancelled','declined'].map(s=>(
                    <button key={s} onClick={()=>updateBookingStatus(selectedBooking.id,s)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase transition border ${selectedBooking.status===s?'bg-white text-slate-900 border-white':'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PARTNER DETAIL MODAL ── */}
      {selectedPartner&&(
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-[#111118] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-[#111118]">
              <h3 className="font-black text-white">Partner Details</h3>
              <button onClick={()=>setSelectedPartner(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center text-white font-black text-2xl overflow-hidden flex-shrink-0">
                  {selectedPartner.avatar_url?<img src={selectedPartner.avatar_url} className="w-full h-full object-cover" alt=""/>:(selectedPartner.shop_name||'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white text-lg">{selectedPartner.shop_name}</p>
                  <p className="text-xs text-slate-400">{selectedPartner.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedPartner.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>
                    {selectedPartner.blocked?'Blocked':'Active'}
                  </span>
                </div>
              </div>
              {/* Info */}
              <div className="bg-slate-800/50 rounded-xl divide-y divide-slate-700/50 border border-slate-700">
                {[
                  ['Owner Name', selectedPartner.owner_name||'—'],
                  ['Phone', selectedPartner.phone||'—'],
                  ['WhatsApp', selectedPartner.whatsapp||'—'],
                  ['City', selectedPartner.city||'—'],
                  ['Joined', selectedPartner.created_at?new Date(selectedPartner.created_at).toLocaleDateString():'—'],
                ].map(([k,v])=>(
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-slate-400">{k}</span><span className="font-black text-white">{v}</span>
                  </div>
                ))}
              </div>
              {/* Earnings */}
              {(()=>{
                const s = getPartnerStats(selectedPartner.id);
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {l:'Total Bookings', v:s.total, c:'bg-slate-800'},
                      {l:'Completed', v:s.completed, c:'bg-blue-900/30 border border-blue-700'},
                      {l:'Gross Revenue', v:`Rs. ${s.gross.toLocaleString()}`, c:'bg-emerald-900/30 border border-emerald-700'},
                      {l:'Net Payout (90%)', v:`Rs. ${s.payout.toLocaleString()}`, c:'bg-slate-900 border border-slate-600'},
                    ].map(x=>(
                      <div key={x.l} className={`${x.c} rounded-xl p-3`}>
                        <p className="text-lg font-black text-white">{x.v}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{x.l}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* Vehicles */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Vehicles ({vehicles.filter(v=>v.owner_id===selectedPartner.id).length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vehicles.filter(v=>v.owner_id===selectedPartner.id).map(v=>{
                    const img = v.vehicle_photos?.sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0))[0]?.storage_url||'';
                    return (
                      <div key={v.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                        <div className="flex items-center gap-2">
                          <img src={img} className="w-10 h-7 rounded-lg object-cover bg-slate-700" alt=""/>
                          <div><p className="text-xs font-black text-white">{v.name}</p><p className="text-[10px] text-slate-400">Rs. {(v.price_per_day||0).toLocaleString()}/day · {v.location}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${v.is_available?'text-emerald-400 bg-emerald-900/30':'text-slate-400 bg-slate-700'}`}>{v.is_available?'LIVE':'HIDDEN'}</span>
                          <button onClick={()=>toggleVehicle(v.id,v.is_available)} className="text-[10px] font-black px-2 py-1 bg-slate-700 hover:bg-amber-600 rounded-lg transition text-white">{v.is_available?'Hide':'Show'}</button>
                        </div>
                      </div>
                    );
                  })}
                  {vehicles.filter(v=>v.owner_id===selectedPartner.id).length===0&&<p className="text-xs text-slate-500 text-center py-4">No vehicles listed</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>toggleBlockOwner(selectedPartner.id,selectedPartner.blocked)}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition ${selectedPartner.blocked?'bg-emerald-600 hover:bg-emerald-700':'bg-red-600 hover:bg-red-700'} text-white`}>
                  {selectedPartner.blocked?'Unblock Partner':'Block Partner'}
                </button>
                <button onClick={()=>setSelectedPartner(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-xs uppercase transition">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER DETAIL MODAL ── */}
      {selectedCustomer&&(
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-[#111118] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-[#111118]">
              <h3 className="font-black text-white">Customer Details</h3>
              <button onClick={()=>setSelectedCustomer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-black text-2xl overflow-hidden flex-shrink-0">
                  {selectedCustomer.avatar_url?<img src={selectedCustomer.avatar_url} className="w-full h-full object-cover" alt=""/>:(selectedCustomer.first_name||'U').charAt(0)}
                </div>
                <div>
                  <p className="font-black text-white text-lg">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                  <p className="text-xs text-slate-400">{selectedCustomer.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedCustomer.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>
                    {selectedCustomer.blocked?'Blocked':'Active'}
                  </span>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl divide-y divide-slate-700/50 border border-slate-700">
                {[
                  ['Phone', selectedCustomer.phone||'—'],
                  ['City', selectedCustomer.city||'—'],
                  ['NIC / Passport', selectedCustomer.nic||'—'],
                  ['Driving License', selectedCustomer.driving_license||'—'],
                  ['Total Bookings', bookings.filter(b=>b.customer_id===selectedCustomer.id).length],
                  ['Completed', bookings.filter(b=>b.customer_id===selectedCustomer.id&&b.status==='completed').length],
                  ['Joined', selectedCustomer.created_at?new Date(selectedCustomer.created_at).toLocaleDateString():'—'],
                ].map(([k,v])=>(
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                    <span className="text-slate-400">{k}</span><span className="font-black text-white">{String(v)}</span>
                  </div>
                ))}
              </div>
              {/* Recent bookings */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Recent Bookings</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookings.filter(b=>b.customer_id===selectedCustomer.id).slice(0,5).map(b=>(
                    <div key={b.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                      <div><p className="text-xs font-black text-white">{b.vehicle_name}</p><p className="text-[10px] text-slate-400">{b.pickup_date} · Rs. {(b.total||0).toLocaleString()}</p></div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${statusColor(b.status)}`}>{b.status}</span>
                    </div>
                  ))}
                  {bookings.filter(b=>b.customer_id===selectedCustomer.id).length===0&&<p className="text-xs text-slate-500 text-center py-3">No bookings</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>toggleBlockCustomer(selectedCustomer.id,selectedCustomer.blocked)}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition ${selectedCustomer.blocked?'bg-emerald-600 hover:bg-emerald-700':'bg-red-600 hover:bg-red-700'} text-white`}>
                  {selectedCustomer.blocked?'Unblock':'Block Customer'}
                </button>
                <button onClick={()=>setSelectedCustomer(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-xs uppercase transition">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* ── SIDEBAR ── */}
        <aside className="w-56 bg-[#0d0d14] border-r border-slate-800/60 flex flex-col fixed h-full z-40">
          <div className="px-5 py-5 border-b border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <DrivoLogo className="w-8 h-8"/>
              <div><p className="font-black text-white text-base leading-tight">drivo</p><span className="text-[9px] text-red-400 font-black uppercase tracking-wider">Admin · Live</span></div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {([
              ['dashboard','📊','Dashboard'],
              ['partners', '🏪','Partners'],
              ['customers','🧳','Customers'],
              ['vehicles', '🚗','Vehicles'],
              ['bookings', '📋','Bookings'],
            ] as [AdminTab,string,string][]).map(([key,icon,label])=>(
              <button key={key} onClick={()=>setTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${tab===key?'bg-white text-slate-900':'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
                <span>{icon}</span>{label}
                {key==='bookings'&&pendingBookings.length>0&&<span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{pendingBookings.length}</span>}
              </button>
            ))}
          </nav>
          <div className="px-3 pb-5 border-t border-slate-800/60 pt-4 space-y-1">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/><span className="text-[10px] text-emerald-400 font-bold">Live updates active</span>
            </div>
            <button onClick={loadData} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition">🔄 Refresh</button>
            <a href="/" target="_blank" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition">🌐 View site</a>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-900/30 hover:text-red-400 transition">🚪 Log out</button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="flex-1 ml-56 p-6 min-h-screen">
          {loading&&<div className="flex items-center gap-2 text-slate-400 text-sm mb-4"><div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin"/>Loading...</div>}

          {/* ══ DASHBOARD ══ */}
          {tab==='dashboard'&&(
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-black text-white">Dashboard</h1><p className="text-slate-500 text-sm mt-0.5">Real-time platform overview</p></div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-900/20 border border-emerald-800/50 px-3 py-1.5 rounded-full"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>Live</div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {l:'Site Visits',       v:totalVisits,                    i:'👁️', c:'border-indigo-800/50 bg-indigo-900/20'},
                  {l:'Partners',          v:owners.length,                  i:'🏪', c:'border-blue-800/50 bg-blue-900/20'},
                  {l:'Customers',         v:customers.length,               i:'🧳', c:'border-purple-800/50 bg-purple-900/20'},
                  {l:'Vehicles',          v:vehicles.length,                i:'🚗', c:'border-slate-700 bg-slate-800/40'},
                  {l:'Live Now',          v:liveVehicles.length,            i:'🟢', c:'border-emerald-800/50 bg-emerald-900/20'},
                  {l:'Active Bookings',   v:activeBookings.length,          i:'📋', c:'border-amber-800/50 bg-amber-900/20'},
                  {l:'Pending',           v:pendingBookings.length,         i:'⏳', c:'border-orange-800/50 bg-orange-900/20'},
                  {l:'Drivo Earnings',    v:`Rs. ${platformEarnings.toLocaleString()}`, i:'💰', c:'border-teal-800/50 bg-teal-900/20'},
                ].map(s=>(
                  <div key={s.l} className={`border ${s.c} rounded-2xl p-4`}>
                    <div className="text-xl mb-2">{s.i}</div>
                    <div className="text-xl font-black text-white">{s.v}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
              {/* Traffic chart */}
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                <h2 className="font-black text-white text-sm mb-4">Traffic — last 14 days</h2>
                {traffic.length===0?<p className="text-slate-500 text-sm text-center py-8">No traffic data yet</p>:(
                  <div className="space-y-2.5">
                    {traffic.slice(-14).map((e:any)=>{
                      const maxV=Math.max(...traffic.slice(-14).map((x:any)=>x.visits||0),1);
                      const maxB=Math.max(...traffic.slice(-14).map((x:any)=>x.bookings||x.booking_count||0),1);
                      return (
                        <div key={e.date} className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 w-16 flex-shrink-0">{e.date?.slice(5)}</span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[9px] text-slate-600">Visits</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-1.5"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${((e.visits||0)/maxV)*100}%`}}/></div>
                              <span className="text-[10px] text-white w-5 text-right">{e.visits||0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 text-[9px] text-slate-600">Bookings</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-1.5"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${((e.bookings||e.booking_count||0)/maxB)*100}%`}}/></div>
                              <span className="text-[10px] text-white w-5 text-right">{e.bookings||e.booking_count||0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Recent bookings */}
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-white text-sm">Recent Bookings</h2>
                  <button onClick={()=>setTab('bookings')} className="text-xs text-slate-400 hover:text-white">View all →</button>
                </div>
                <div className="space-y-1">
                  {bookings.slice(0,8).map(b=>(
                    <div key={b.id} onClick={()=>setSelectedBooking(b)} className="flex items-center justify-between py-2.5 px-2 rounded-xl cursor-pointer hover:bg-slate-800/50 transition">
                      <div><p className="text-sm font-bold text-white">{b.vehicle_name}</p><p className="text-xs text-slate-500">{b.pickup_date} → {b.return_date} · {b.shop_name}</p></div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-black text-white">Rs. {(b.total||0).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                  {bookings.length===0&&<p className="text-slate-500 text-sm text-center py-6">No bookings yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* ══ PARTNERS ══ */}
          {tab==='partners'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-2xl font-black text-white">Partners</h1><p className="text-slate-500 text-sm">{owners.length} registered · {owners.filter(o=>o.blocked).length} blocked</p></div>
                <input placeholder="Search by name or email..." value={partnerSearch} onChange={e=>setPartnerSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-slate-500 placeholder:text-slate-600 w-64"/>
              </div>
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Partner</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Vehicles</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredPartners.map(o=>{
                        const s = getPartnerStats(o.id);
                        return (
                          <tr key={o.id} className="hover:bg-slate-800/30 transition cursor-pointer" onClick={()=>setSelectedPartner(o)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                  {o.avatar_url?<img src={o.avatar_url} className="w-full h-full object-cover" alt=""/>:(o.shop_name||'S').charAt(0).toUpperCase()}
                                </div>
                                <div><p className="font-bold text-white">{o.shop_name}</p><p className="text-[10px] text-slate-500">{o.phone||'—'}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{o.email}</td>
                            <td className="px-4 py-3 text-slate-300">{o.city||'—'}</td>
                            <td className="px-4 py-3"><span className="font-black text-white">{vehicles.filter(v=>v.owner_id===o.id).length}</span> <span className="text-slate-500">({vehicles.filter(v=>v.owner_id===o.id&&v.is_available).length} live)</span></td>
                            <td className="px-4 py-3"><p className="font-black text-white">Rs. {s.payout.toLocaleString()}</p><p className="text-[10px] text-slate-500">{s.completed} completed</p></td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${o.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>{o.blocked?'Blocked':'Active'}</span></td>
                            <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>toggleBlockOwner(o.id,o.blocked)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${o.blocked?'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400':'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>{o.blocked?'Unblock':'Block'}</button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredPartners.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No partners found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ CUSTOMERS ══ */}
          {tab==='customers'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-2xl font-black text-white">Customers</h1><p className="text-slate-500 text-sm">{customers.length} registered · {customers.filter(c=>c.blocked).length} blocked</p></div>
                <input placeholder="Search by name or email..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-slate-500 placeholder:text-slate-600 w-64"/>
              </div>
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">NIC</th><th className="px-4 py-3">License</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredCustomers.map(c=>(
                        <tr key={c.id} className="hover:bg-slate-800/30 transition cursor-pointer" onClick={()=>setSelectedCustomer(c)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-900 flex items-center justify-center text-blue-300 font-black text-sm flex-shrink-0">
                                {c.avatar_url?<img src={c.avatar_url} className="w-full h-full object-cover" alt=""/>:(c.first_name||'U').charAt(0)}
                              </div>
                              <div><p className="font-bold text-white">{c.first_name} {c.last_name}</p><p className="text-[10px] text-slate-500">{c.phone||'—'}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{c.email}</td>
                          <td className="px-4 py-3 text-slate-300">{c.city||'—'}</td>
                          <td className="px-4 py-3 text-slate-300">{c.nic||'—'}</td>
                          <td className="px-4 py-3 text-slate-300">{c.driving_license||'—'}</td>
                          <td className="px-4 py-3 font-black text-white">{bookings.filter(b=>b.customer_id===c.id).length}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>{c.blocked?'Blocked':'Active'}</span></td>
                          <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>toggleBlockCustomer(c.id,c.blocked)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${c.blocked?'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400':'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>{c.blocked?'Unblock':'Block'}</button>
                          </td>
                        </tr>
                      ))}
                      {filteredCustomers.length===0&&<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No customers found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ VEHICLES ══ */}
          {tab==='vehicles'&&(
            <div className="space-y-4">
              <div><h1 className="text-2xl font-black text-white">Vehicles</h1><p className="text-slate-500 text-sm">{vehicles.length} total · {liveVehicles.length} live · {vehicles.length-liveVehicles.length} hidden</p></div>
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Price/Day</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {vehicles.map(v=>{
                        const owner=owners.find(o=>o.id===v.owner_id);
                        const img=v.vehicle_photos?.sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0))[0]?.storage_url||'';
                        const vBookings=bookings.filter(b=>b.vehicle_id===v.id);
                        return (
                          <tr key={v.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={img} className="w-14 h-9 rounded-lg object-cover flex-shrink-0 bg-slate-800" alt=""/><div><p className="font-bold text-white">{v.name}</p><p className="text-[10px] text-slate-500">{v.type} · {v.transmission}</p></div></div></td>
                            <td className="px-4 py-3 text-slate-300">{owner?.shop_name||'—'}</td>
                            <td className="px-4 py-3 text-slate-300">{v.location||'—'}</td>
                            <td className="px-4 py-3 font-black text-white">Rs.{(v.price_per_day||0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-300">{vBookings.length}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${v.is_available?'bg-emerald-900/50 text-emerald-400':'bg-slate-700 text-slate-400'}`}>{v.is_available?'Live':'Hidden'}</span></td>
                            <td className="px-4 py-3 text-right space-x-1">
                              <button onClick={()=>toggleVehicle(v.id,v.is_available)} className="text-[11px] font-black px-2.5 py-1 bg-slate-700 hover:bg-amber-600 rounded-lg transition text-white">{v.is_available?'Hide':'Show'}</button>
                              <button onClick={()=>deleteVehicle(v.id)} className="text-[11px] font-black px-2.5 py-1 bg-red-900/50 hover:bg-red-600 rounded-lg transition text-red-400">Del</button>
                            </td>
                          </tr>
                        );
                      })}
                      {vehicles.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No vehicles yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ BOOKINGS ══ */}
          {tab==='bookings'&&(
            <div className="space-y-4">
              <div><h1 className="text-2xl font-black text-white">All Bookings</h1><p className="text-slate-500 text-sm">{bookings.length} total · {pendingBookings.length} pending · platform earnings: Rs. {platformEarnings.toLocaleString()}</p></div>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
                  {['all','pending','confirmed','completed','cancelled','declined'].map(f=>(
                    <button key={f} onClick={()=>setBookingFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${bookingFilter===f?'bg-white text-slate-900':'text-slate-400 hover:text-white'}`}>
                      {f} {f!=='all'&&<span className="ml-1 opacity-60">({bookings.filter(b=>b.status===f).length})</span>}
                    </button>
                  ))}
                </div>
                <input placeholder="Search vehicle or shop..." value={bookingSearch} onChange={e=>setBookingSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-4 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600 w-52"/>
                <span className="text-xs text-slate-500">{filteredBookings.length} results</span>
              </div>
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Shop</th><th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Total</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredBookings.map(b=>(
                        <tr key={b.id} className="hover:bg-slate-800/30 transition cursor-pointer" onClick={()=>setSelectedBooking(b)}>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><img src={b.vehicle_img||''} className="w-10 h-7 rounded-lg object-cover flex-shrink-0 bg-slate-800" alt=""/><span className="font-bold text-white">{b.vehicle_name}</span></div></td>
                          <td className="px-4 py-3 text-slate-300">{b.shop_name}</td>
                          <td className="px-4 py-3 text-slate-300">{b.pickup_date}<br/><span className="text-slate-500">→ {b.return_date}</span></td>
                          <td className="px-4 py-3 font-black text-white">Rs.{(b.total||0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold">Rs.{(b.platform_fee||Math.round((b.total||0)*0.10)).toLocaleString()}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{b.status}</span></td>
                          <td className="px-4 py-3 text-right space-x-1" onClick={e=>e.stopPropagation()}>
                            <select className="bg-slate-800 border border-slate-700 text-white text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                              value={b.status} onChange={e=>updateBookingStatus(b.id,e.target.value)}>
                              {['pending','confirmed','completed','cancelled','declined'].map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={()=>deleteBooking(b.id)} className="text-[11px] font-black px-2 py-1 bg-red-900/50 hover:bg-red-600 rounded-lg transition text-red-400">🗑</button>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No bookings found</td></tr>}
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

function CustomerInfoCard({customerId}:{customerId:string}) {
  const [cust,setCust]=useState<any>(null);
  useEffect(()=>{
    const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from('customers').select('first_name,last_name,phone,email,nic,driving_license,city,avatar_url').eq('id',customerId).single().then(({data})=>setCust(data));
  },[customerId]);
  if(!cust) return <div className="text-xs text-slate-500 text-center py-2">Loading...</div>;
  return (
    <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Renter Info</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-black overflow-hidden flex-shrink-0">
          {cust.avatar_url?<img src={cust.avatar_url} className="w-full h-full object-cover" alt=""/>:(cust.first_name||'U').charAt(0)}
        </div>
        <div><p className="font-black text-white text-sm">{cust.first_name} {cust.last_name}</p><p className="text-[10px] text-slate-400">{cust.email}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[['Phone',cust.phone||'—'],['City',cust.city||'—'],['NIC/Passport',cust.nic||'—'],['License',cust.driving_license||'—']].map(([k,v])=>(
          <div key={k}><p className="text-[9px] text-slate-400 font-bold uppercase">{k}</p><p className="font-black text-white">{v}</p></div>
        ))}
      </div>
    </div>
  );
}