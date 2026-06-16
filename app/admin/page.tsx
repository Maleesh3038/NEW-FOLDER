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
type BookingStatus = 'pending'|'admin_approved'|'confirmed'|'declined'|'completed'|'cancelled';

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
  s==='confirmed'      ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700' :
  s==='admin_approved' ? 'text-blue-400 bg-blue-900/30 border-blue-700' :
  s==='completed'      ? 'text-indigo-400 bg-indigo-900/30 border-indigo-700' :
  s==='cancelled'      ? 'text-slate-400 bg-slate-800 border-slate-600' :
  s==='declined'       ? 'text-red-400 bg-red-900/30 border-red-700' :
                         'text-amber-400 bg-amber-900/30 border-amber-700';

const statusLabel = (s:string) =>
  s==='pending'        ? '⏳ Pending' :
  s==='admin_approved' ? '✅ Approved' :
  s==='confirmed'      ? '🎉 Confirmed' :
  s==='declined'       ? '❌ Declined' :
  s==='completed'      ? '🏁 Completed' :
  s==='cancelled'      ? '🚫 Cancelled' : s;

// ── Admin Reset Password Modal
function AdminResetPasswordModal({ user, userType, onClose, showToast }: {
  user: any; userType: 'owner'|'customer'; onClose: ()=>void; showToast:(msg:string,type?:'ok'|'err')=>void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);

  const userName = userType==='owner'
    ? (user.shop_name||user.email)
    : `${user.first_name||''} ${user.last_name||''}`.trim()||user.email;

  const handleReset = async () => {
    if (!newPassword)               { showToast('Password required','err'); return; }
    if (newPassword.length < 6)     { showToast('Min 6 characters','err'); return; }
    if (newPassword !== confirm)    { showToast('Passwords do not match','err'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/admin-reset', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId:user.id, userType, newPassword, adminSecret:'drivo-admin-2026' }) });
      const data = await res.json();
      if (data.error) { showToast(data.error,'err'); setLoading(false); return; }
      showToast(`✅ Password reset for ${userName}!`); onClose();
    } catch { showToast('Failed. Try again.','err'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center px-4">
      <div className="bg-[#111118] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div><h3 className="font-black text-white">Reset Password</h3><p className="text-xs text-slate-400 mt-0.5">{userName}</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-300 font-semibold">⚠️ This will immediately change the user's password.</p>
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
            <div className="relative">
              <input type={showPw?'text':'password'} placeholder="Min 6 characters"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-14 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
                value={newPassword} onChange={e=>setNewPassword(e.target.value)}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 hover:text-white">{showPw?'HIDE':'SHOW'}</button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input type="password" placeholder="Repeat password"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition"
              value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleReset()}/>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase transition">Cancel</button>
            <button onClick={handleReset} disabled={loading}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase text-white transition ${loading?'bg-slate-600 cursor-not-allowed':'bg-red-600 hover:bg-red-700'}`}>
              {loading?'Resetting...':'🔑 Reset Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Booking Action Modal (new)
function BookingActionModal({ booking, onClose, onStatusChange, showToast }: {
  booking: any; onClose: ()=>void; onStatusChange:(id:string,status:string)=>void; showToast:(msg:string,type?:'ok'|'err')=>void;
}) {
  const [acting, setActing] = useState(false);

  const notifyPartner = async (bookingId: string) => {
    try {
      await fetch('/api/bookings/notify-partner', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ bookingId }),
      });
    } catch { showToast('WhatsApp send failed — check UltraMsg','err'); }
  };

  const notifyCustomer = async (bookingId: string, type: 'confirmed'|'declined') => {
    try {
      await fetch('/api/bookings/notify-customer', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ bookingId, type }),
      });
    } catch {}
  };

  const handleApprove = async () => {
    if (!confirm('Approve this booking and notify the partner via WhatsApp?')) return;
    setActing(true);
    try {
      await supabase.rpc('update_booking_status', { booking_id: booking.id, new_status: 'admin_approved' });
      await notifyPartner(booking.id);
      onStatusChange(booking.id, 'admin_approved');
      showToast('✅ Approved! Partner WhatsApp sent.');
      onClose();
    } catch { showToast('Approve failed','err'); }
    setActing(false);
  };

  const handleAdminDecline = async () => {
    const reason = window.prompt('Decline reason (optional):') ?? '';
    setActing(true);
    try {
      await supabase.rpc('update_booking_status', { booking_id: booking.id, new_status: 'declined', reason });
      await notifyCustomer(booking.id, 'declined');
      onStatusChange(booking.id, 'declined');
      showToast('Booking declined. Customer notified.');
      onClose();
    } catch { showToast('Decline failed','err'); }
    setActing(false);
  };

  const handleMarkComplete = async () => {
    if (!confirm('Mark as completed?')) return;
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
    if (booking.vehicle_id) await supabase.from('vehicles').update({ is_available: true }).eq('id', booking.vehicle_id);
    onStatusChange(booking.id, 'completed');
    showToast('🏁 Marked as completed');
    onClose();
  };

  const b = booking;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4">
      <div className="bg-[#111118] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-[#111118]">
          <div>
            <h3 className="font-black text-white">Booking Details</h3>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>
              {statusLabel(b.status)}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Vehicle info */}
          <div className="flex gap-4">
            <img src={b.vehicle_img||''} className="w-28 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-800" alt=""/>
            <div>
              <p className="font-black text-white text-base">{b.vehicle_name}</p>
              <p className="text-xs text-slate-400 mt-1">{b.shop_name} · {b.location}</p>
            </div>
          </div>

          {/* Booking details */}
          <div className="bg-slate-800/50 rounded-xl divide-y divide-slate-700/50 border border-slate-700">
            {[
              ['Booking ID',     b.id?.slice(0,8)+'...'],
              ['Pickup',         `${b.pickup_date||b.start_date} at ${b.pickup_time||'—'}`],
              ['Return',          b.return_date||b.end_date],
              ['Days',           `${b.days} day${b.days>1?'s':''}`],
              ['Driver',          b.with_driver?'Yes — driver included':'No driver'],
              ['Delivery',        b.delivery_type||b.delivery_address||'Pickup'],
              ['Customer Total', `Rs. ${(b.total||b.total_price||0).toLocaleString()}`],
              ['Platform Fee',   `Rs. ${(b.platform_fee||Math.round((b.total||b.total_price||0)*0.10)).toLocaleString()}`],
              ['Owner Payout',   `Rs. ${(b.owner_payout||Math.round((b.total||b.total_price||0)*0.90)).toLocaleString()}`],
              ['Booked At',       b.booked_at||b.created_at ? new Date(b.booked_at||b.created_at).toLocaleString() : '—'],
            ].map(([k,v])=>(
              <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-slate-400 font-semibold">{k}</span>
                <span className="font-black text-white">{v}</span>
              </div>
            ))}
          </div>

          {/* WhatsApp tracking */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">WhatsApp Status</p>
            <div className="space-y-2">
              {[
                { label: 'Admin notified',    sent: b.wa_admin_sent_at },
                { label: 'Partner notified',  sent: b.wa_partner_sent_at },
                { label: 'Customer notified', sent: b.wa_customer_sent_at },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{item.label}</span>
                  {item.sent
                    ? <span className="text-emerald-400 font-bold">✅ {new Date(item.sent).toLocaleTimeString()}</span>
                    : <span className="text-slate-600">—</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons based on status */}
          {b.status === 'pending' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Admin Action</p>
              <div className="flex gap-2">
                <button onClick={handleApprove} disabled={acting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase transition disabled:opacity-50">
                  {acting ? '...' : '✅ Approve + Notify Partner'}
                </button>
                <button onClick={handleAdminDecline} disabled={acting}
                  className="flex-1 py-3 bg-red-900/50 hover:bg-red-600 text-red-400 hover:text-white rounded-xl font-black text-xs uppercase transition disabled:opacity-50">
                  ❌ Decline
                </button>
              </div>
            </div>
          )}

          {b.status === 'admin_approved' && (
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-300 font-bold">⏳ Waiting for partner to confirm or decline</p>
              <p className="text-[10px] text-blue-400/70 mt-1">Partner was notified via WhatsApp</p>
            </div>
          )}

          {b.status === 'confirmed' && (
            <div className="space-y-2">
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-300 font-bold">🎉 Booking confirmed by partner!</p>
              </div>
              <button onClick={handleMarkComplete} disabled={acting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase transition">
                🏁 Mark as Completed
              </button>
            </div>
          )}

          {(b.status === 'completed' || b.status === 'declined' || b.status === 'cancelled') && (
            <div className={`rounded-xl p-4 text-center text-xs font-bold
              ${b.status==='completed' ? 'bg-indigo-900/20 border border-indigo-800/50 text-indigo-300' :
                'bg-red-900/20 border border-red-800/50 text-red-300'}`}>
              {b.status==='completed' ? '🏁 Booking completed' :
               b.status==='declined'  ? '❌ Booking declined' : '🚫 Booking cancelled'}
            </div>
          )}

          {/* Customer info card */}
          {b.customer_id && <CustomerInfoCard customerId={b.customer_id}/>}
        </div>
      </div>
    </div>
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
  const [toastType, setToastType] = useState<'ok'|'err'>('ok');

  const [owners,    setOwners]    = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles,  setVehicles]  = useState<any[]>([]);
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [traffic,   setTraffic]   = useState<any[]>([]);

  const [selectedBooking,  setSelectedBooking]  = useState<any>(null);
  const [selectedPartner,  setSelectedPartner]  = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [resetModal,       setResetModal]       = useState<{user:any;userType:'owner'|'customer'}|null>(null);

  const [bookingFilter, setBookingFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [custSearch,    setCustSearch]    = useState('');

  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast(msg); setToastType(type); setTimeout(()=>setToast(''),3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ow,cu,vh,bk,tr] = await Promise.all([
      supabase.from('owners').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(500),
      supabase.from('customers').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(1000),
      supabase.from('vehicles').select('*,vehicle_photos(storage_url,sort_order)').order('created_at',{ascending:false}).limit(500),
      supabase.from('bookings').select('*').order('booked_at',{ascending:false}).limit(1000),
      supabase.from('traffic').select('*').order('date',{ascending:false}).limit(60),
    ]);
    if(ow.data) setOwners(ow.data);
    if(cu.data) setCustomers(cu.data);
    if(vh.data) setVehicles(vh.data);
    if(bk.data) setBookings(bk.data);
    if(tr.data) setTraffic(tr.data.reverse());
    setLoading(false);
  },[]);

  useEffect(()=>{
    if(!authed) return;
    loadData();
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>{
        supabase.from('bookings').select('*').order('booked_at',{ascending:false}).limit(1000)
          .then(({data})=>{ if(data) setBookings(data); });
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'owners'},()=>{
        supabase.from('owners').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(500)
          .then(({data})=>{ if(data) setOwners(data); });
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'customers'},()=>{
        supabase.from('customers').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(1000)
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

  const onStatusChange = (id:string, status:string) => {
    setBookings(p=>p.map(b=>b.id===id?{...b,status}:b));
  };

  // ── Actions
  const deleteUser = async (id:string, type:'owner'|'customer', name:string) => {
    if(!confirm(`⚠️ PERMANENTLY DELETE "${name}"?\n\nCannot be undone!`)) return;
    if(!confirm(`Final confirmation — permanently delete "${name}"?`)) return;
    const table = type==='owner'?'owners':'customers';
    try {
      await supabase.from('bookings').update({[type==='owner'?'owner_id':'customer_id']:null}).eq(type==='owner'?'owner_id':'customer_id',id);
      if(type==='owner'){
        const {data:veh}=await supabase.from('vehicles').select('id').eq('owner_id',id);
        if(veh){ for(const v of veh){
          await supabase.from('vehicle_photos').delete().eq('vehicle_id',v.id);
          await supabase.from('vehicle_blocked_dates').delete().eq('vehicle_id',v.id);
          await supabase.storage.from('vehicle-photos').list(v.id).then(({data:files})=>{
            if(files?.length) supabase.storage.from('vehicle-photos').remove(files.map((f:any)=>`${v.id}/${f.name}`));
          });
        } await supabase.from('vehicles').delete().eq('owner_id',id); }
      }
      try{ await supabase.from('wishlist').delete().eq(type==='owner'?'owner_id':'customer_id',id); }catch{}
      if(type==='customer'){ try{ await supabase.from('reviews').delete().eq('customer_id',id); }catch{} }
      const {error}=await supabase.from(table).delete().eq('id',id);
      if(error) throw error;
      if(type==='owner') setOwners(p=>p.filter(o=>o.id!==id));
      else setCustomers(p=>p.filter(c=>c.id!==id));
      showToast(`✅ ${name} permanently deleted`);
    } catch(err:any){ showToast(`Delete failed: ${err.message}`,'err'); }
  };

  const toggleBlockOwner    = async(id:string,blocked:boolean)=>{ await supabase.from('owners').update({blocked:!blocked}).eq('id',id); setOwners(p=>p.map(o=>o.id===id?{...o,blocked:!blocked}:o)); if(selectedPartner?.id===id) setSelectedPartner((p:any)=>({...p,blocked:!blocked})); showToast(!blocked?'Partner blocked':'Partner unblocked'); };
  const toggleVerifyOwner   = async(id:string,verified:boolean)=>{ await supabase.from('owners').update({verified:!verified,verified_at:!verified?new Date().toISOString():null}).eq('id',id); setOwners(p=>p.map(o=>o.id===id?{...o,verified:!verified}:o)); if(selectedPartner?.id===id) setSelectedPartner((p:any)=>({...p,verified:!verified})); showToast(!verified?'✅ Partner verified!':'Verification removed'); };
  const toggleBlockCustomer = async(id:string,blocked:boolean)=>{ await supabase.from('customers').update({blocked:!blocked}).eq('id',id); setCustomers(p=>p.map(c=>c.id===id?{...c,blocked:!blocked}:c)); if(selectedCustomer?.id===id) setSelectedCustomer((p:any)=>({...p,blocked:!blocked})); showToast(!blocked?'Customer blocked':'Customer unblocked'); };
  const toggleVehicle       = async(id:string,cur:boolean)=>{ await supabase.from('vehicles').update({is_available:!cur}).eq('id',id); setVehicles(p=>p.map(v=>v.id===id?{...v,is_available:!cur}:v)); showToast(!cur?'Vehicle is now live':'Vehicle hidden'); };
  const deleteVehicle       = async(id:string)=>{ if(!confirm('Delete this vehicle?')) return; await supabase.from('vehicle_photos').delete().eq('vehicle_id',id); await supabase.from('vehicles').delete().eq('id',id); setVehicles(p=>p.filter(v=>v.id!==id)); showToast('Vehicle deleted','err'); };
  const deleteBooking       = async(id:string)=>{ if(!confirm('Delete this booking from history?')) return; await supabase.from('bookings').delete().eq('id',id); setBookings(p=>p.filter(b=>b.id!==id)); setSelectedBooking(null); showToast('Booking deleted','err'); };

  // ── Stats
  const completedBookings = bookings.filter(b=>b.status==='completed');
  const pendingBookings   = bookings.filter(b=>b.status==='pending');
  const activeBookings    = bookings.filter(b=>!['cancelled','declined'].includes(b.status));
  const totalRevenue      = completedBookings.reduce((s,b)=>s+(b.total||b.total_price||0),0);
  const platformEarnings  = completedBookings.reduce((s,b)=>s+(b.platform_fee||Math.round((b.total||b.total_price||0)*0.10)),0);
  const liveVehicles      = vehicles.filter(v=>v.is_available);
  const totalVisits       = traffic.reduce((s,e:any)=>s+(e.visits||0),0);

  const getPartnerStats = (ownerId:string) => {
    const pb=bookings.filter(b=>b.owner_id===ownerId);
    const completed=pb.filter(b=>b.status==='completed');
    const gross=completed.reduce((s,b)=>s+(b.total||0),0);
    const fee=completed.reduce((s,b)=>s+(b.platform_fee||Math.round((b.total||0)*0.10)),0);
    return {total:pb.length,completed:completed.length,gross,payout:gross-fee,pending:pb.filter(b=>b.status==='pending').length};
  };

  const filteredBookings  = bookings.filter(b=>bookingFilter==='all'?true:b.status===bookingFilter).filter(b=>bookingSearch===''?true:(b.vehicle_name||'').toLowerCase().includes(bookingSearch.toLowerCase())||(b.shop_name||'').toLowerCase().includes(bookingSearch.toLowerCase()));
  const filteredPartners  = owners.filter(o=>partnerSearch===''?true:(o.shop_name||'').toLowerCase().includes(partnerSearch.toLowerCase())||(o.email||'').toLowerCase().includes(partnerSearch.toLowerCase()));
  const filteredCustomers = customers.filter(c=>{ if(custSearch==='') return true; const q=custSearch.toLowerCase(); return (`${c.first_name||''} ${c.last_name||''}`).toLowerCase().includes(q)||(c.email||'').toLowerCase().includes(q)||(c.nic||'').toLowerCase().includes(q)||(c.driving_license||'').toLowerCase().includes(q)||(c.phone||'').toLowerCase().includes(q)||(c.id||'').toLowerCase().includes(q); });

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
              <input type="email" placeholder="admin@drivo.lk" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/></div>
            <div className="relative"><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <input type={showPw?'text':'password'} placeholder="••••••••" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-16 text-sm font-semibold text-white outline-none focus:border-slate-400 placeholder:text-slate-600 transition" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
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
      {toast&&<div className={`fixed top-4 right-4 z-[300] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl transition-all ${toastType==='ok'?'bg-emerald-500':'bg-red-500'} text-white`}>{toast}</div>}

      {resetModal&&<AdminResetPasswordModal user={resetModal.user} userType={resetModal.userType} onClose={()=>setResetModal(null)} showToast={showToast}/>}

      {/* ── BOOKING DETAIL MODAL (NEW) ── */}
      {selectedBooking&&(
        <BookingActionModal
          booking={selectedBooking}
          onClose={()=>setSelectedBooking(null)}
          onStatusChange={onStatusChange}
          showToast={showToast}
        />
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
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center text-white font-black text-2xl overflow-hidden flex-shrink-0">
                  {selectedPartner.avatar_url?<img src={selectedPartner.avatar_url} className="w-full h-full object-cover" alt=""/>:(selectedPartner.shop_name||'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white text-lg">{selectedPartner.shop_name}</p>
                  <p className="text-xs text-slate-400">{selectedPartner.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedPartner.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>{selectedPartner.blocked?'Blocked':'Active'}</span>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl divide-y divide-slate-700/50 border border-slate-700">
                {[['Owner Name',selectedPartner.owner_name||'—'],['Phone',selectedPartner.phone||'—'],['WhatsApp',selectedPartner.whatsapp||'—'],['City',selectedPartner.city||'—'],['Joined',selectedPartner.created_at?new Date(selectedPartner.created_at).toLocaleDateString():'—']].map(([k,v])=>(
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs"><span className="text-slate-400">{k}</span><span className="font-black text-white">{v}</span></div>
                ))}
              </div>
              {(()=>{ const s=getPartnerStats(selectedPartner.id); return (
                <div className="grid grid-cols-2 gap-3">
                  {[{l:'Total Bookings',v:s.total,c:'bg-slate-800'},{l:'Completed',v:s.completed,c:'bg-blue-900/30 border border-blue-700'},{l:'Gross Revenue',v:`Rs. ${s.gross.toLocaleString()}`,c:'bg-emerald-900/30 border border-emerald-700'},{l:'Net Payout (90%)',v:`Rs. ${s.payout.toLocaleString()}`,c:'bg-slate-900 border border-slate-600'}].map(x=>(
                    <div key={x.l} className={`${x.c} rounded-xl p-3`}><p className="text-lg font-black text-white">{x.v}</p><p className="text-[10px] text-slate-400 mt-0.5">{x.l}</p></div>
                  ))}
                </div>
              ); })()}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Vehicles ({vehicles.filter(v=>v.owner_id===selectedPartner.id).length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vehicles.filter(v=>v.owner_id===selectedPartner.id).map(v=>{ const img=v.vehicle_photos?.sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0))[0]?.storage_url||''; return (
                    <div key={v.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                      <div className="flex items-center gap-2"><img src={img} className="w-10 h-7 rounded-lg object-cover bg-slate-700" alt=""/><div><p className="text-xs font-black text-white">{v.name}</p><p className="text-[10px] text-slate-400">Rs. {(v.price_per_day||0).toLocaleString()}/day</p></div></div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${v.is_available?'text-emerald-400 bg-emerald-900/30':'text-slate-400 bg-slate-700'}`}>{v.is_available?'LIVE':'HIDDEN'}</span>
                        <button onClick={()=>toggleVehicle(v.id,v.is_available)} className="text-[10px] font-black px-2 py-1 bg-slate-700 hover:bg-amber-600 rounded-lg transition text-white">{v.is_available?'Hide':'Show'}</button>
                      </div>
                    </div>
                  ); })}
                  {vehicles.filter(v=>v.owner_id===selectedPartner.id).length===0&&<p className="text-xs text-slate-500 text-center py-4">No vehicles listed</p>}
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={()=>toggleVerifyOwner(selectedPartner.id,selectedPartner.verified)} className={`w-full py-2.5 rounded-xl font-black text-xs uppercase transition ${selectedPartner.verified?'bg-slate-700 hover:bg-slate-600 text-slate-300':'bg-blue-600 hover:bg-blue-700 text-white'}`}>{selectedPartner.verified?'Remove Verification ✅':'✅ Verify This Partner'}</button>
                <button onClick={()=>setResetModal({user:selectedPartner,userType:'owner'})} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase transition">🔑 Reset Partner Password</button>
                <div className="flex gap-2">
                  <button onClick={()=>toggleBlockOwner(selectedPartner.id,selectedPartner.blocked)} className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition ${selectedPartner.blocked?'bg-emerald-600 hover:bg-emerald-700':'bg-red-600 hover:bg-red-700'} text-white`}>{selectedPartner.blocked?'Unblock Partner':'Block Partner'}</button>
                  <button onClick={()=>setSelectedPartner(null)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-xs uppercase transition">Close</button>
                </div>
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
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedCustomer.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>{selectedCustomer.blocked?'Blocked':'Active'}</span>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl divide-y divide-slate-700/50 border border-slate-700">
                {[['Phone',selectedCustomer.phone||'—'],['City',selectedCustomer.city||'—'],['NIC / Passport',selectedCustomer.nic||'—'],['Driving License',selectedCustomer.driving_license||'—'],['Total Bookings',bookings.filter(b=>b.customer_id===selectedCustomer.id).length],['Completed',bookings.filter(b=>b.customer_id===selectedCustomer.id&&b.status==='completed').length],['Joined',selectedCustomer.created_at?new Date(selectedCustomer.created_at).toLocaleDateString():'—']].map(([k,v])=>(
                  <div key={k} className="flex justify-between px-4 py-2.5 text-xs"><span className="text-slate-400">{k}</span><span className="font-black text-white">{String(v)}</span></div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Recent Bookings</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookings.filter(b=>b.customer_id===selectedCustomer.id).slice(0,5).map(b=>(
                    <div key={b.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                      <div><p className="text-xs font-black text-white">{b.vehicle_name}</p><p className="text-[10px] text-slate-400">{b.pickup_date||b.start_date} · Rs. {(b.total||b.total_price||0).toLocaleString()}</p></div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                    </div>
                  ))}
                  {bookings.filter(b=>b.customer_id===selectedCustomer.id).length===0&&<p className="text-xs text-slate-500 text-center py-3">No bookings</p>}
                </div>
              </div>
              <button onClick={()=>setResetModal({user:selectedCustomer,userType:'customer'})} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase transition">🔑 Reset Customer Password</button>
              <div className="flex gap-2">
                <button onClick={()=>toggleBlockCustomer(selectedCustomer.id,selectedCustomer.blocked)} className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition ${selectedCustomer.blocked?'bg-emerald-600 hover:bg-emerald-700':'bg-red-600 hover:bg-red-700'} text-white`}>{selectedCustomer.blocked?'Unblock':'Block Customer'}</button>
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
            {([['dashboard','📊','Dashboard'],['partners','🏪','Partners'],['customers','🧳','Customers'],['vehicles','🚗','Vehicles'],['bookings','📋','Bookings']] as [AdminTab,string,string][]).map(([key,icon,label])=>(
              <button key={key} onClick={()=>setTab(key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${tab===key?'bg-white text-slate-900':'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
                <span>{icon}</span>{label}
                {key==='bookings'&&pendingBookings.length>0&&<span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{pendingBookings.length}</span>}
              </button>
            ))}
          </nav>
          <div className="px-3 pb-5 border-t border-slate-800/60 pt-4 space-y-1">
            <div className="flex items-center gap-2 px-3 py-2"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/><span className="text-[10px] text-emerald-400 font-bold">Live updates active</span></div>
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div><h1 className="text-2xl font-black text-white">Analytics Dashboard</h1><p className="text-slate-500 text-sm mt-0.5">Real-time platform overview</p></div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-900/20 border border-emerald-800/50 px-3 py-1.5 rounded-full"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>Live</div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {l:'Site Visits',     v:totalVisits,                  i:'👁️',c:'border-indigo-800/50 bg-indigo-900/20'},
                  {l:'Partners',        v:owners.length,                i:'🏪',c:'border-blue-800/50 bg-blue-900/20'},
                  {l:'Customers',       v:customers.length,             i:'🧳',c:'border-purple-800/50 bg-purple-900/20'},
                  {l:'Vehicles',        v:vehicles.length,              i:'🚗',c:'border-slate-700 bg-slate-800/40'},
                  {l:'Live Now',        v:liveVehicles.length,          i:'🟢',c:'border-emerald-800/50 bg-emerald-900/20'},
                  {l:'Active Bookings', v:activeBookings.length,        i:'📋',c:'border-amber-800/50 bg-amber-900/20'},
                  {l:'Pending',         v:pendingBookings.length,       i:'⏳',c:'border-orange-800/50 bg-orange-900/20'},
                  {l:'Drivo Earnings',  v:`Rs. ${platformEarnings.toLocaleString()}`,i:'💰',c:'border-teal-800/50 bg-teal-900/20'},
                ].map(s=>(
                  <div key={s.l} className={`border ${s.c} rounded-2xl p-4`}>
                    <div className="text-xl mb-2">{s.i}</div>
                    <div className="text-xl font-black text-white">{s.v}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Traffic */}
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
                            <div className="flex items-center gap-2"><span className="w-12 text-[9px] text-slate-600">Visits</span><div className="flex-1 bg-slate-800 rounded-full h-1.5"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${((e.visits||0)/maxV)*100}%`}}/></div><span className="text-[10px] text-white w-5 text-right">{e.visits||0}</span></div>
                            <div className="flex items-center gap-2"><span className="w-12 text-[9px] text-slate-600">Bookings</span><div className="flex-1 bg-slate-800 rounded-full h-1.5"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${((e.bookings||e.booking_count||0)/maxB)*100}%`}}/></div><span className="text-[10px] text-white w-5 text-right">{e.bookings||e.booking_count||0}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Bookings */}
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-white text-sm">Recent Bookings</h2>
                  <button onClick={()=>setTab('bookings')} className="text-xs text-slate-400 hover:text-white">View all →</button>
                </div>
                <div className="space-y-1">
                  {bookings.slice(0,8).map(b=>(
                    <div key={b.id} onClick={()=>setSelectedBooking(b)} className="flex items-center justify-between py-2.5 px-2 rounded-xl cursor-pointer hover:bg-slate-800/50 transition">
                      <div><p className="text-sm font-bold text-white">{b.vehicle_name}</p><p className="text-xs text-slate-500">{b.pickup_date||b.start_date} → {b.return_date||b.end_date} · {b.shop_name}</p></div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-black text-white">Rs. {(b.total||b.total_price||0).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                      </div>
                    </div>
                  ))}
                  {bookings.length===0&&<p className="text-slate-500 text-sm text-center py-6">No bookings yet</p>}
                </div>
              </div>

              {/* Revenue Analytics */}
              {(()=>{
                const now=new Date();
                const months=Array.from({length:6},(_,i)=>{ const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1); return {month:d.toLocaleString('default',{month:'short'}),m:d.getMonth(),y:d.getFullYear()}; });
                const monthlyData=months.map(({month,m,y})=>{ const mb=bookings.filter(b=>{ const d=new Date(b.booked_at||b.created_at||''); return d.getMonth()===m&&d.getFullYear()===y; }); const revenue=mb.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.total||b.total_price||0),0); return {month,revenue,count:mb.length}; });
                const maxRev=Math.max(...monthlyData.map(m=>m.revenue),1);
                const totalRev6m=monthlyData.reduce((s,m)=>s+m.revenue,0);
                const totalFee6m=Math.round(totalRev6m*0.10);
                const totalBookings6m=monthlyData.reduce((s,m)=>s+m.count,0);
                const vehicleBookings:Record<string,{name:string;count:number;revenue:number;img:string}>={};
                bookings.forEach(b=>{ if(!b.vehicle_id) return; if(!vehicleBookings[b.vehicle_id]) vehicleBookings[b.vehicle_id]={name:b.vehicle_name||'Unknown',count:0,revenue:0,img:b.vehicle_img||''}; vehicleBookings[b.vehicle_id].count++; vehicleBookings[b.vehicle_id].revenue+=b.total||0; });
                const topVehicles=Object.values(vehicleBookings).sort((a,b)=>b.count-a.count).slice(0,5);
                const maxVCount=Math.max(...topVehicles.map(v=>v.count),1);
                const partnerRevenue:Record<string,{name:string;revenue:number;count:number}>={};
                bookings.filter(b=>b.status==='completed').forEach(b=>{ const k=b.owner_id||b.shop_name||'unknown'; if(!partnerRevenue[k]) partnerRevenue[k]={name:b.shop_name||'Unknown',revenue:0,count:0}; partnerRevenue[k].revenue+=b.total||0; partnerRevenue[k].count++; });
                const topPartners=Object.values(partnerRevenue).sort((a,b)=>b.revenue-a.revenue).slice(0,5);
                const maxPRev=Math.max(...topPartners.map(p=>p.revenue),1);
                const typeBreakdown={car:0,bike:0,van:0,tuk:0};
                vehicles.forEach((v:any)=>{ if(v.type in typeBreakdown)(typeBreakdown as any)[v.type]++; });
                const typeTotal=Object.values(typeBreakdown).reduce((s,v)=>s+v,0)||1;
                const typeColors:Record<string,string>={car:'bg-blue-500',bike:'bg-emerald-500',van:'bg-purple-500',tuk:'bg-amber-500'};
                const typeLabels:Record<string,string>={car:'🚙 Cars',bike:'🏍️ Bikes',van:'🚐 Vans',tuk:'🛺 Tuk-tuks'};
                return (<>
                  <div className="grid grid-cols-3 gap-3">
                    {[{l:'Total Revenue (6m)',v:`Rs. ${totalRev6m.toLocaleString()}`,i:'💰',c:'border-teal-800/50 bg-teal-900/20',t:'text-teal-400'},{l:'Drivo Earnings (6m)',v:`Rs. ${totalFee6m.toLocaleString()}`,i:'📈',c:'border-emerald-800/50 bg-emerald-900/20',t:'text-emerald-400'},{l:'Total Bookings (6m)',v:totalBookings6m,i:'📋',c:'border-blue-800/50 bg-blue-900/20',t:'text-blue-400'}].map(s=>(
                      <div key={s.l} className={`border ${s.c} rounded-2xl p-4`}><div className="text-xl mb-1">{s.i}</div><div className={`text-lg font-black ${s.t}`}>{s.v}</div><div className="text-[10px] text-slate-400 mt-0.5">{s.l}</div></div>
                    ))}
                  </div>
                  <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-5"><h2 className="font-black text-white text-sm">📊 Monthly Revenue</h2><span className="text-[10px] text-slate-500">Last 6 months</span></div>
                    <div className="flex items-end gap-2 h-32">
                      {monthlyData.map((m,i)=>(
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400">{m.revenue>0?`${(m.revenue/1000).toFixed(0)}k`:''}</span>
                          <div className="w-full flex flex-col gap-0.5 justify-end" style={{height:'80px'}}>
                            <div className="w-full bg-teal-500 rounded-t-lg transition-all duration-500 relative group" style={{height:`${Math.max((m.revenue/maxRev)*80,m.revenue>0?4:0)}px`}}>
                              {m.revenue>0&&<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">Rs. {m.revenue.toLocaleString()}</div>}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">{m.month}</span>
                          <span className="text-[9px] text-slate-600">{m.count}b</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                      <h2 className="font-black text-white text-sm mb-4">🏆 Top Vehicles</h2>
                      {topVehicles.length===0?<p className="text-slate-500 text-xs text-center py-6">No booking data yet</p>:(
                        <div className="space-y-3">{topVehicles.map((v,i)=>(
                          <div key={i} className="flex items-center gap-3">
                            <span className={`text-sm font-black w-5 flex-shrink-0 ${i===0?'text-amber-400':i===1?'text-slate-300':i===2?'text-amber-700':'text-slate-600'}`}>#{i+1}</span>
                            {v.img&&<img src={v.img} alt="" className="w-10 h-7 rounded-lg object-cover flex-shrink-0 bg-slate-700"/>}
                            <div className="flex-1 min-w-0"><p className="text-xs font-black text-white truncate">{v.name}</p><div className="flex-1 bg-slate-800 rounded-full h-1 mt-1"><div className="h-full bg-amber-500 rounded-full" style={{width:`${(v.count/maxVCount)*100}%`}}/></div></div>
                            <div className="text-right flex-shrink-0"><p className="text-xs font-black text-white">{v.count} <span className="text-slate-500 font-normal">bk</span></p><p className="text-[10px] text-emerald-400">Rs. {v.revenue.toLocaleString()}</p></div>
                          </div>
                        ))}</div>
                      )}
                    </div>
                    <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                      <h2 className="font-black text-white text-sm mb-4">🏪 Top Partners</h2>
                      {topPartners.length===0?<p className="text-slate-500 text-xs text-center py-6">No completed bookings yet</p>:(
                        <div className="space-y-3">{topPartners.map((p,i)=>(
                          <div key={i} className="flex items-center gap-3">
                            <span className={`text-sm font-black w-5 flex-shrink-0 ${i===0?'text-amber-400':i===1?'text-slate-300':i===2?'text-amber-700':'text-slate-600'}`}>#{i+1}</span>
                            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0">{(p.name||'P').charAt(0).toUpperCase()}</div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-black text-white truncate">{p.name}</p><div className="flex-1 bg-slate-800 rounded-full h-1 mt-1"><div className="h-full bg-teal-500 rounded-full" style={{width:`${(p.revenue/maxPRev)*100}%`}}/></div></div>
                            <div className="text-right flex-shrink-0"><p className="text-xs font-black text-emerald-400">Rs. {p.revenue.toLocaleString()}</p><p className="text-[10px] text-slate-500">{p.count} done</p></div>
                          </div>
                        ))}</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                      <h2 className="font-black text-white text-sm mb-4">🚗 Fleet Breakdown</h2>
                      <div className="space-y-3">{Object.entries(typeBreakdown).map(([type,count])=>(
                        <div key={type} className="flex items-center gap-3"><span className="text-xs text-slate-400 w-20 flex-shrink-0">{typeLabels[type]}</span><div className="flex-1 bg-slate-800 rounded-full h-2"><div className={`h-full rounded-full ${typeColors[type]}`} style={{width:`${(count/typeTotal)*100}%`}}/></div><span className="text-xs font-black text-white w-6 text-right">{count}</span><span className="text-[10px] text-slate-500 w-8 text-right">{Math.round((count/typeTotal)*100)}%</span></div>
                      ))}</div>
                      <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between"><span className="text-xs text-slate-400">Total vehicles</span><span className="text-sm font-black text-white">{vehicles.length}</span></div>
                    </div>
                    <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl p-5">
                      <h2 className="font-black text-white text-sm mb-4">📋 Booking Status</h2>
                      {(()=>{ const statusData=[{label:'Confirmed',count:bookings.filter(b=>b.status==='confirmed').length,color:'bg-emerald-500',tc:'text-emerald-400'},{label:'Approved',count:bookings.filter(b=>b.status==='admin_approved').length,color:'bg-blue-500',tc:'text-blue-400'},{label:'Pending',count:bookings.filter(b=>b.status==='pending').length,color:'bg-amber-500',tc:'text-amber-400'},{label:'Completed',count:bookings.filter(b=>b.status==='completed').length,color:'bg-indigo-500',tc:'text-indigo-400'},{label:'Declined',count:bookings.filter(b=>b.status==='declined').length,color:'bg-red-500',tc:'text-red-400'}]; const maxS=Math.max(...statusData.map(s=>s.count),1); const convRate=bookings.length>0?Math.round((bookings.filter(b=>b.status==='completed').length/bookings.length)*100):0; return (<><div className="space-y-3">{statusData.map(s=>(<div key={s.label} className="flex items-center gap-3"><span className="text-xs text-slate-400 w-20 flex-shrink-0">{s.label}</span><div className="flex-1 bg-slate-800 rounded-full h-2"><div className={`h-full rounded-full ${s.color}`} style={{width:`${(s.count/maxS)*100}%`}}/></div><span className={`text-xs font-black w-6 text-right ${s.tc}`}>{s.count}</span></div>))}</div><div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between"><span className="text-xs text-slate-400">Completion rate</span><span className={`text-sm font-black ${convRate>=50?'text-emerald-400':'text-amber-400'}`}>{convRate}%</span></div></>); })()}
                    </div>
                  </div>
                </>);
              })()}
            </div>
          )}

          {/* ══ PARTNERS ══ */}
          {tab==='partners'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-2xl font-black text-white">Partners</h1><p className="text-slate-500 text-sm">{owners.length} registered · {owners.filter(o=>o.blocked).length} blocked</p></div>
                <input placeholder="Search by name or email..." value={partnerSearch} onChange={e=>setPartnerSearch(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-slate-500 placeholder:text-slate-600 w-64"/>
              </div>
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]"><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Vehicles</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredPartners.map(o=>{ const s=getPartnerStats(o.id); return (
                        <tr key={o.id} className="hover:bg-slate-800/30 transition cursor-pointer" onClick={()=>setSelectedPartner(o)}>
                          <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">{o.avatar_url?<img src={o.avatar_url} className="w-full h-full object-cover" alt=""/>:(o.shop_name||'S').charAt(0).toUpperCase()}</div><div><p className="font-bold text-white">{o.shop_name}</p><p className="text-[10px] text-slate-500">{o.phone||'—'}</p></div></div></td>
                          <td className="px-4 py-3 text-slate-400">{o.email}</td>
                          <td className="px-4 py-3 text-slate-300">{o.city||'—'}</td>
                          <td className="px-4 py-3"><span className="font-black text-white">{vehicles.filter(v=>v.owner_id===o.id).length}</span> <span className="text-slate-500">({vehicles.filter(v=>v.owner_id===o.id&&v.is_available).length} live)</span></td>
                          <td className="px-4 py-3"><p className="font-black text-white">Rs. {s.payout.toLocaleString()}</p><p className="text-[10px] text-slate-500">{s.completed} completed</p></td>
                          <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase w-fit ${o.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>{o.blocked?'Blocked':'Active'}</span>{o.verified&&<span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-900/50 text-blue-400 w-fit">✅ Verified</span>}</div></td>
                          <td className="px-4 py-3 text-right space-x-1" onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>toggleVerifyOwner(o.id,o.verified)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${o.verified?'bg-blue-900/50 text-blue-400 hover:bg-slate-700':'bg-blue-600 hover:bg-blue-700 text-white'}`}>{o.verified?'✅':'Verify'}</button>
                            <button onClick={()=>setResetModal({user:o,userType:'owner'})} className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-900/50 hover:bg-amber-600 text-amber-400 hover:text-white transition">🔑</button>
                            <button onClick={()=>toggleBlockOwner(o.id,o.blocked)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${o.blocked?'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400':'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>{o.blocked?'Unblock':'Block'}</button>
                            <button onClick={()=>deleteUser(o.id,'owner',o.shop_name||o.email)} className="text-[11px] font-black px-2.5 py-1 rounded-lg transition bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-700">🗑</button>
                          </td>
                        </tr>
                      ); })}
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
                <input placeholder="Search by name, email, NIC, license, phone..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-slate-500 placeholder:text-slate-600 w-64"/>
              </div>
              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]"><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">City</th><th className="px-4 py-3">NIC</th><th className="px-4 py-3">License</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredCustomers.map(c=>(
                        <tr key={c.id} className="hover:bg-slate-800/30 transition cursor-pointer" onClick={()=>setSelectedCustomer(c)}>
                          <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full overflow-hidden bg-blue-900 flex items-center justify-center text-blue-300 font-black text-sm flex-shrink-0">{c.avatar_url?<img src={c.avatar_url} className="w-full h-full object-cover" alt=""/>:(c.first_name||'U').charAt(0)}</div><div><p className="font-bold text-white">{c.first_name} {c.last_name}</p><p className="text-[10px] text-slate-500">{c.phone||'—'}</p></div></div></td>
                          <td className="px-4 py-3 text-slate-400">{c.email}</td>
                          <td className="px-4 py-3 text-slate-300">{c.city||'—'}</td>
                          <td className="px-4 py-3">{c.nic?<span className="text-xs font-black text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-1 rounded-lg">{c.nic}</span>:<span className="text-slate-600 text-xs">—</span>}</td>
                          <td className="px-4 py-3">{c.driving_license?<span className="text-xs font-black text-blue-400 bg-blue-950 border border-blue-800 px-2 py-1 rounded-lg">{c.driving_license}</span>:<span className="text-slate-600 text-xs">—</span>}</td>
                          <td className="px-4 py-3 font-black text-white">{bookings.filter(b=>b.customer_id===c.id).length}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.blocked?'bg-red-900/50 text-red-400':'bg-emerald-900/50 text-emerald-400'}`}>{c.blocked?'Blocked':'Active'}</span></td>
                          <td className="px-4 py-3 text-right space-x-1" onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>setResetModal({user:c,userType:'customer'})} className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-900/50 hover:bg-amber-600 text-amber-400 hover:text-white transition">🔑</button>
                            <button onClick={()=>toggleBlockCustomer(c.id,c.blocked)} className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition ${c.blocked?'bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400':'bg-red-900/50 hover:bg-red-600 text-red-400'}`}>{c.blocked?'Unblock':'Block'}</button>
                            <button onClick={()=>deleteUser(c.id,'customer',`${c.first_name} ${c.last_name}`||c.email)} className="text-[11px] font-black px-2.5 py-1 rounded-lg transition bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-700">🗑</button>
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
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]"><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Price/Day</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {vehicles.map(v=>{ const owner=owners.find(o=>o.id===v.owner_id); const img=v.vehicle_photos?.sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0))[0]?.storage_url||''; const vBookings=bookings.filter(b=>b.vehicle_id===v.id); return (
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
                      ); })}
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
              <div><h1 className="text-2xl font-black text-white">All Bookings</h1><p className="text-slate-500 text-sm">{bookings.length} total · {pendingBookings.length} pending action · platform earnings: Rs. {platformEarnings.toLocaleString()}</p></div>

              {/* Pending action banner */}
              {pendingBookings.length>0&&(
                <div className="bg-amber-900/20 border border-amber-700/50 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0"/>
                    <div>
                      <p className="text-amber-300 font-black text-sm">{pendingBookings.length} booking{pendingBookings.length>1?'s':''} waiting for approval</p>
                      <p className="text-amber-400/70 text-xs mt-0.5">Click a booking below to approve and notify partner</p>
                    </div>
                  </div>
                  <button onClick={()=>setBookingFilter('pending')} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase transition flex-shrink-0">View Pending</button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 flex-wrap">
                  {['all','pending','admin_approved','confirmed','completed','cancelled','declined'].map(f=>(
                    <button key={f} onClick={()=>setBookingFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${bookingFilter===f?'bg-white text-slate-900':'text-slate-400 hover:text-white'}`}>
                      {f==='admin_approved'?'Approved':f} {f!=='all'&&<span className="ml-1 opacity-60">({bookings.filter(b=>b.status===f).length})</span>}
                    </button>
                  ))}
                </div>
                <input placeholder="Search vehicle or shop..." value={bookingSearch} onChange={e=>setBookingSearch(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-4 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600 w-52"/>
                <span className="text-xs text-slate-500">{filteredBookings.length} results</span>
              </div>

              <div className="bg-[#0d0d14] border border-slate-800/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[10px]"><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Shop</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredBookings.map(b=>(
                        <tr key={b.id} className={`hover:bg-slate-800/30 transition cursor-pointer ${b.status==='pending'?'bg-amber-950/10':''}`} onClick={()=>setSelectedBooking(b)}>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><img src={b.vehicle_img||''} className="w-10 h-7 rounded-lg object-cover flex-shrink-0 bg-slate-800" alt=""/><span className="font-bold text-white">{b.vehicle_name}</span></div></td>
                          <td className="px-4 py-3 text-slate-300">{b.shop_name}</td>
                          <td className="px-4 py-3 text-slate-300">{b.pickup_date||b.start_date}<br/><span className="text-slate-500">→ {b.return_date||b.end_date}</span></td>
                          <td className="px-4 py-3 font-black text-white">Rs.{(b.total||b.total_price||0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold">Rs.{(b.platform_fee||Math.round((b.total||b.total_price||0)*0.10)).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <span title="Admin" className={`w-2 h-2 rounded-full ${b.wa_admin_sent_at?'bg-emerald-400':'bg-slate-600'}`}/>
                              <span title="Partner" className={`w-2 h-2 rounded-full ${b.wa_partner_sent_at?'bg-emerald-400':'bg-slate-600'}`}/>
                              <span title="Customer" className={`w-2 h-2 rounded-full ${b.wa_customer_sent_at?'bg-emerald-400':'bg-slate-600'}`}/>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusColor(b.status)}`}>{statusLabel(b.status)}</span></td>
                          <td className="px-4 py-3 text-right space-x-1" onClick={e=>e.stopPropagation()}>
                            {b.status==='pending'&&(
                              <button onClick={async()=>{ setSelectedBooking(b); }} className="text-[11px] font-black px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition text-white">Approve</button>
                            )}
                            <button onClick={()=>{ if(!confirm('Delete this booking from history?')) return; supabase.from('bookings').delete().eq('id',b.id); setBookings(p=>p.filter(x=>x.id!==b.id)); showToast('Booking deleted','err'); }} className="text-[11px] font-black px-2 py-1 bg-red-900/50 hover:bg-red-600 rounded-lg transition text-red-400">🗑</button>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length===0&&<tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No bookings found</td></tr>}
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