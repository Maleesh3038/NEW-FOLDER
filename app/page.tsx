'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { T, LangKey } from './translations';
import { SL_CITIES } from './types';
import {
  supabase,
  DbOwner, DbCustomer, DbVehicle, DbBooking,
  registerOwner, loginOwner,
  registerCustomer, loginCustomer,
  getAvailableVehicles, getOwnerVehicles,
  addVehicle, updateVehicle, deleteVehicle as dbDeleteVehicle,
  toggleVehicleAvailability,
  createBooking, getCustomerBookings, getOwnerBookings, updateBookingStatus as updateBookingStatus_db,
  trackVisitInDB, trackBookingInDB,
  saveSession, getSession, clearSession,
} from '../lib/supabase';

type RawVehicle = DbVehicle & { images?: string[]; image?: string; isAvailable?: boolean; mapLink?: string; };
type Booking = DbBooking & { vehicleImg?: string; };
type OwnerAccount = DbOwner & { fleet?: RawVehicle[]; bookings?: Booking[]; };
type CustomerAccount = DbCustomer & { bookings?: Booking[]; };

function DrivoLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="28" fill="#111"/>
      <path d="M38 35H55C65.5 35 72 41.5 72 50C72 58.5 65.5 65 55 65H30V60H38V35Z" fill="white"/>
      <path d="M38 60H53C61 60 66 55.5 66 50C66 44.5 61 40 53 40H38V60Z" fill="#111"/>
    </svg>
  );
}

function mapVehicle(v: any): RawVehicle {
  return {
    ...v,
    image: v.vehicle_photos
      ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      ?.[0]?.storage_url || '',
    images: v.vehicle_photos
      ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((p: any) => p.storage_url) || [],
    isAvailable: v.is_available,
    mapLink: v.map_link,
    owner_verified: v.owners?.verified || false,
  };
}

// ── Forgot Password Form
function ForgotPasswordForm({ onBack, onSuccess, showToast }: {
  onBack: () => void;
  onSuccess: (email: string) => void;
  showToast: (msg: string, type?: 'ok'|'err') => void;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { showToast('Email required', 'err'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'err'); setLoading(false); return; }
      showToast('OTP sent to your email! 📧');
      onSuccess(email);
    } catch { showToast('Failed to send OTP. Try again.', 'err'); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <p className="text-3xl mb-2">🔑</p>
        <p className="text-sm font-black text-slate-900">Reset Your Password</p>
        <p className="text-xs text-slate-400 mt-1">Enter your email — we'll send a 6-digit OTP</p>
      </div>
      <div>
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
        <input type="email" placeholder="you@example.com"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
          value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
      </div>
      <button onClick={handleSubmit} disabled={loading}
        className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg text-white ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 active:scale-95'}`}>
        {loading ? 'Sending OTP...' : 'Send OTP →'}
      </button>
      <button onClick={onBack} className="w-full py-2.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition">← Back to Login</button>
    </div>
  );
}

// ── Verify OTP Form
function VerifyOtpForm({ onBack, onSuccess, showToast }: {
  onBack: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: 'ok'|'err') => void;
}) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('drivo_reset_email');
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !otp.trim()) { showToast('Email and OTP required', 'err'); return; }
    if (newPassword.length < 6) { showToast('Password min 6 characters', 'err'); return; }
    if (newPassword !== confirm) { showToast('Passwords do not match', 'err'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'err'); setLoading(false); return; }
      localStorage.removeItem('drivo_reset_email');
      onSuccess();
    } catch { showToast('Reset failed. Try again.', 'err'); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <p className="text-3xl mb-2">📧</p>
        <p className="text-sm font-black text-slate-900">Enter OTP & New Password</p>
        <p className="text-xs text-slate-400 mt-1">Check your email for the 6-digit code (valid 10 mins)</p>
      </div>
      <div>
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
        <input type="email" placeholder="you@example.com"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300"
          value={email} onChange={e => setEmail(e.target.value)}/>
      </div>
      <div>
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">OTP Code</label>
        <input type="text" placeholder="123456" maxLength={6}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl font-black text-center tracking-[0.5em] outline-none focus:border-slate-900 transition placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-base"
          value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}/>
      </div>
      <div>
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-14 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300"
            value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black px-1">{showPw ? 'HIDE' : 'SHOW'}</button>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
        <input type="password" placeholder="Repeat password"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300"
          value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}/>
      </div>
      <button onClick={handleSubmit} disabled={loading}
        className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg text-white ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 active:scale-95'}`}>
        {loading ? 'Resetting...' : 'Reset Password →'}
      </button>
      <button onClick={onBack} className="w-full py-2.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition">← Back</button>
    </div>
  );
}

// ── Change Password Form
function ChangePasswordForm({ userId, userType, showToast }: {
  userId: string; userType: 'owner' | 'customer';
  showToast: (msg: string, type?: 'ok'|'err') => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!current || !newPw) { showToast('All fields required', 'err'); return; }
    if (newPw.length < 6) { showToast('Min 6 characters', 'err'); return; }
    if (newPw !== confirm) { showToast('Passwords do not match', 'err'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType, currentPassword: current, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'err'); setLoading(false); return; }
      setCurrent(''); setNewPw(''); setConfirm(''); setOpen(false);
      showToast('Password changed successfully! 🔒');
    } catch { showToast('Failed. Try again.', 'err'); }
    setLoading(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-600 rounded-xl font-black text-xs uppercase tracking-wide transition">
      🔒 Change Password
    </button>
  );

  return (
    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Change Password</p>
      {[
        { l: 'Current Password', v: current, s: setCurrent },
        { l: 'New Password', v: newPw, s: setNewPw },
        { l: 'Confirm New Password', v: confirm, s: setConfirm }
      ].map(f => (
        <div key={f.l}>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label>
          <input type="password" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition" value={f.v} onChange={e => f.s(e.target.value)}/>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={() => { setOpen(false); setCurrent(''); setNewPw(''); setConfirm(''); }}
          className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase transition hover:bg-slate-100">Cancel</button>
        <button onClick={handleChange} disabled={loading}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase text-white transition ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function VehicleReviews({ vehicleId }: { vehicleId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reviews?vehicle_id=eq.${vehicleId}&select=*,customers(first_name,last_name)&order=created_at.desc`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data)) setReviews(data); });
  }, [vehicleId]);
  if (reviews.length === 0) return (
    <div className="mt-4 text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-3xl mb-2">⭐</p>
      <p className="text-sm font-black text-slate-600">No reviews yet</p>
      <p className="text-xs text-slate-400 mt-1">Be the first to review after your rental!</p>
    </div>
  );
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="font-black text-slate-900 text-lg">{avg.toFixed(1)} <span className="text-sm font-semibold text-slate-500">/ 5</span></p>
          <p className="text-xs text-slate-500">{reviews.length} review{reviews.length > 1 ? 's' : ''}</p>
        </div>
      </div>
      {reviews.map(r => (
        <div key={r.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-black">{(r.customers?.first_name || 'A').charAt(0)}</div>
              <p className="text-xs font-black text-slate-700">{r.customers?.first_name || 'Anonymous'}</p>
            </div>
            <div className="flex gap-0.5">{[1,2,3,4,5].map(s => (<span key={s} className={`text-sm ${s <= r.rating ? 'opacity-100' : 'opacity-20'}`}>⭐</span>))}</div>
          </div>
          {r.comment && <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>}
          <p className="text-[10px] text-slate-400 mt-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
        </div>
      ))}
    </div>
  );
}

function OwnerContactButtons({ vehicleId, ownerId, mapLink, vehicleName }: { vehicleId: string; ownerId: string; mapLink: string; vehicleName: string }) {
  const [owner, setOwner] = useState<any>(null);
  useEffect(() => {
    if (!ownerId) return;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/owners?id=eq.${ownerId}&select=phone,whatsapp,shop_name`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data) && data[0]) setOwner(data[0]); });
  }, [ownerId]);
  const phone = owner?.whatsapp || owner?.phone || '';
  const waPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '94');
  const waMsg = encodeURIComponent(`Hi ${owner?.shop_name || ''}! I just booked your *${vehicleName}* on Drivo LK. Looking forward to it! 🚗`);
  return (
    <div className="space-y-3">
      {phone && (
        <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-3.5 bg-[#25D366] hover:bg-[#1fbe5a] text-white rounded-2xl font-black text-sm transition shadow-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.787L0 24l6.396-1.676A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.487-5.187-1.34l-.371-.22-3.8.996 1.013-3.695-.241-.381A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Chat on WhatsApp
        </a>
      )}
      {phone && (<a href={`tel:${phone}`} className="flex items-center justify-center gap-3 w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition shadow-md">📞 Call Shop · {phone}</a>)}
      {mapLink && (<a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition shadow-md">📍 Get Directions to Pickup Location</a>)}
      {!phone && !mapLink && (<p className="text-xs text-slate-400 text-center py-2">Shop contact details will be shared shortly</p>)}
    </div>
  );
}




function NearbyVehiclesSection({ allVehicles, onVehicleClick }: {
  allVehicles: any[];
  onVehicleClick: (v: any) => void;
}) {
  const [nearbyCity, setNearbyCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const districts = [
    { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
    { name: 'Galle', lat: 6.0535, lng: 80.2210 },
    { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
    { name: 'Gampaha', lat: 7.0840, lng: 80.0098 },
    { name: 'Matara', lat: 5.9549, lng: 80.5550 },
    { name: 'Negombo', lat: 7.2008, lng: 79.8380 },
    { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
    { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
    { name: 'Batticaloa', lat: 7.7102, lng: 81.6924 },
    { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
    { name: 'Badulla', lat: 6.9934, lng: 81.0550 },
    { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
    { name: 'Ratnapura', lat: 6.6828, lng: 80.3992 },
    { name: 'Hambantota', lat: 6.1429, lng: 81.1212 },
    { name: 'Kurunegala', lat: 7.4818, lng: 80.3609 },
  ];

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let closest = districts[0];
        let minDist = Infinity;
        districts.forEach(d => {
          const dist = getDistance(latitude, longitude, d.lat, d.lng);
          if (dist < minDist) { minDist = dist; closest = d; }
        });
        setNearbyCity(closest.name);
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 5000 }
    );
  }, []);

  if (loading || !nearbyCity) return null;

  const nearby = allVehicles.filter(v =>
    v.location?.toLowerCase().includes(nearbyCity.toLowerCase())
  ).slice(0, 6);

  if (nearby.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
            </span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">Near You</span>
          </div>
          <p className="font-black text-slate-900 text-sm">Vehicles in {nearbyCity}</p>
        </div>
        <p className="text-xs text-slate-400">{nearby.length} found</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {nearby.map(v => (
          <div key={v.id} onClick={() => onVehicleClick(v)}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group">
            <div className="aspect-video bg-slate-100 overflow-hidden relative">
              <img src={v.images?.[0] || v.image || ''} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <p className="text-white text-[10px] font-black truncate">{v.name}</p>
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs font-black text-slate-900">Rs. {(v.price_per_day || 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">/day</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}



// ── Vehicle Availability Calendar Component
function VehicleCalendar({ vehicleId, ownerId, isOwner = false, onBlockedDatesLoad }: {
  vehicleId: string;
  ownerId?: string;
  isOwner?: boolean;
  onBlockedDatesLoad?: (dates: string[]) => void;
}) {
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'block'|'booked'|null>(null);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const today = fmt(new Date());

  useEffect(() => {
    if (!vehicleId) return;
    // Load blocked dates
    supabase.from('vehicle_blocked_dates')
      .select('date, reason')
      .eq('vehicle_id', vehicleId)
      .then(({ data }) => {
        if (!data) return;
        const blocked = new Set<string>();
        const booked = new Set<string>();
        data.forEach(d => {
          if (d.reason === 'booked') booked.add(d.date);
          else blocked.add(d.date);
        });
        setBlockedDates(blocked);
        setBookedDates(booked);
        if (onBlockedDatesLoad) {
          onBlockedDatesLoad([...blocked, ...booked]);
        }
      });
  }, [vehicleId]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const toggleDate = (dateStr: string) => {
    if (!isOwner || !mode) return;
    if (dateStr < today) return;
    setSelectedDates(prev => {
      const n = new Set(prev);
      n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr);
      return n;
    });
  };

  const saveBlockedDates = async () => {
    if (!vehicleId || selectedDates.size === 0 || !mode) return;
    setSaving(true);
    const rows = [...selectedDates].map(date => ({
      vehicle_id: vehicleId,
      date,
      reason: 'blocked',
    }));
    await supabase.from('vehicle_blocked_dates').upsert(rows, { onConflict: 'vehicle_id,date' });
    setBlockedDates(prev => new Set([...prev, ...selectedDates]));
    if (onBlockedDatesLoad) {
      onBlockedDatesLoad([...blockedDates, ...bookedDates, ...selectedDates]);
    }
    setSelectedDates(new Set());
    setMode(null);
    setSaving(false);
  };

  const unblockDate = async (dateStr: string) => {
    await supabase.from('vehicle_blocked_dates').delete().eq('vehicle_id', vehicleId).eq('date', dateStr);
    setBlockedDates(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
    setBookedDates(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
  };

  const getDayStatus = (dateStr: string) => {
    if (selectedDates.has(dateStr)) return 'selected';
    if (bookedDates.has(dateStr) || blockedDates.has(dateStr)) return 'unavailable';
    if (dateStr < today) return 'past';
    if (dateStr === today) return 'today';
    return 'available';
  };

  const dayColors: Record<string, string> = {
    available: 'hover:bg-slate-100',
    today: 'border-2 border-slate-900 font-black',
    past: 'text-slate-300 cursor-not-allowed',
    unavailable: 'bg-red-50 text-red-400 border border-red-100 cursor-not-allowed',
    selected: 'bg-slate-900 text-white',
  };

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-600 font-black">‹</button>
        <p className="text-sm font-black text-slate-900">{monthName}</p>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-600 font-black">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const status = getDayStatus(dateStr);
          return (
            <div key={d} onClick={() => toggleDate(dateStr)}
              className={`h-9 flex items-center justify-center rounded-xl text-xs transition relative
                ${isOwner && mode && status !== 'past' ? 'cursor-pointer' : ''}
                ${dayColors[status] || ''}`}>
              {d}
              {isOwner && (status === 'blocked' || status === 'booked') && (
                <button onClick={e => { e.stopPropagation(); unblockDate(dateStr); }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-slate-200 rounded-full text-[9px] text-slate-400 hover:text-red-500 flex items-center justify-center shadow-sm">×</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Owner controls */}
      {isOwner && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <button onClick={() => setMode(mode === 'block' ? null : 'block')}
            className={`w-full py-2.5 rounded-xl text-sm font-black border transition ${mode === 'block' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
            {mode === 'block' ? '✓ Tap dates to mark unavailable' : '📅 Mark dates as unavailable'}
          </button>
          {selectedDates.size > 0 && (
            <button onClick={saveBlockedDates} disabled={saving}
              className={`w-full py-2.5 rounded-xl font-black text-sm text-white transition ${saving ? 'bg-slate-400' : 'bg-red-500 hover:bg-red-600'}`}>
              {saving ? 'Saving...' : `🚫 Block ${selectedDates.size} day${selectedDates.size > 1 ? 's' : ''}`}
            </button>
          )}
          <div className="flex items-center gap-1.5 justify-center">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-200"/>
            <span className="text-[10px] text-slate-400">Unavailable — hidden from customers</span>
          </div>
        </div>
      )}

      {/* Customer view — legend only */}
      {!isOwner && (blockedDates.size > 0 || bookedDates.size > 0) && (
        <div className="flex items-center gap-1.5 justify-center pt-1 border-t border-slate-100">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200"/>
          <span className="text-[10px] text-slate-400">Unavailable dates</span>
        </div>
      )}
    </div>
  );
}


function PartnerLeaderboard() {
  const [partners, setPartners] = useState<any[]>([]);
  const [tab, setTab] = useState<'bookings'|'rating'>('bookings');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get all owners with their vehicles
        const { data: owners } = await supabase
          .from('owners')
          .select('id, shop_name, city, verified, avatar_url')
          .eq('blocked', false)
          .limit(20);

        if (!owners || owners.length === 0) { setLoaded(true); return; }

        // Get booking counts per owner
        const { data: bookings } = await supabase
          .from('bookings')
          .select('owner_id')
          .in('status', ['confirmed', 'completed']);

        // Get review averages per owner
        const { data: reviews } = await supabase
          .from('reviews')
          .select('owner_id, rating');

        // Get vehicle counts per owner
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('owner_id')
          .eq('is_available', true);

        const stats = owners.map(owner => {
          const ownerBookings = (bookings || []).filter(b => b.owner_id === owner.id);
          const ownerReviews = (reviews || []).filter(r => r.owner_id === owner.id);
          const ownerVehicles = (vehicles || []).filter(v => v.owner_id === owner.id);
          const avgRating = ownerReviews.length > 0
            ? ownerReviews.reduce((s, r) => s + r.rating, 0) / ownerReviews.length
            : 0;
          return {
            ...owner,
            bookingCount: ownerBookings.length,
            reviewCount: ownerReviews.length,
            avgRating: Math.round(avgRating * 10) / 10,
            vehicleCount: ownerVehicles.length,
          };
        }).filter(p => p.bookingCount > 0 || p.vehicleCount > 0);

        setPartners(stats);
        setLoaded(true);
      } catch { setLoaded(true); }
    };
    fetchLeaderboard();
  }, []);

  const sorted = [...partners].sort((a, b) =>
    tab === 'bookings'
      ? b.bookingCount - a.bookingCount
      : b.avgRating - a.avgRating || b.reviewCount - a.reviewCount
  ).slice(0, 5);

  const medalColor = (i: number) =>
    i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300';
  const medalIcon = (i: number) =>
    i === 0 ? 'ti-trophy' : i === 1 ? 'ti-medal' : i === 2 ? 'ti-award' : 'ti-minus';
  const avatarColors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-red-100 text-red-700',
  ];

  if (loaded && sorted.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-black text-slate-900 text-base">🏆 Top Partners</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Ranked by real customer data · Updated daily</p>
          </div>
          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
            {(['bookings', 'rating'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'bookings' ? '📋 Bookings' : '⭐ Rating'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-50">
          {!loaded ? (
            [1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                <div className="w-7 h-5 bg-slate-100 rounded"/>
                <div className="w-9 h-9 bg-slate-100 rounded-full"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-32"/>
                  <div className="h-2.5 bg-slate-100 rounded w-20"/>
                </div>
                <div className="w-12 h-6 bg-slate-100 rounded"/>
              </div>
            ))
          ) : sorted.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
              {/* Rank */}
              <div className="w-7 flex-shrink-0 text-center">
                <i className={`ti ${medalIcon(i)} text-lg ${medalColor(i)}`} aria-hidden="true"/>
              </div>
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 overflow-hidden ${avatarColors[i % avatarColors.length]}`}>
                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt=""/> : (p.shop_name || 'S').charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-black text-slate-900 text-sm truncate">{p.shop_name}</p>
                  {p.verified && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-black flex-shrink-0">✅</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">📍 {p.city || 'Sri Lanka'} · 🚗 {p.vehicleCount} `${p.vehicleCount} vehicle${p.vehicleCount !== 1 ? 's' : ''}`</p>
              </div>
              {/* Score */}
              <div className="text-right flex-shrink-0">
                {tab === 'bookings' ? (
                  <>
                    <p className="font-black text-slate-900 text-sm">{p.bookingCount}</p>
                    <p className="text-[10px] text-slate-400">bookings</p>
                  </>
                ) : (
                  <>
                    <p className="font-black text-slate-900 text-sm">
                      {p.avgRating > 0 ? <>⭐ {p.avgRating.toFixed(1)}</> : <span className="text-slate-300">—</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">{p.reviewCount} review{p.reviewCount !== 1 ? 's' : ''}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {loaded && sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 bg-slate-50">
            <p className="text-[10px] text-slate-400 text-center">Rankings update automatically as bookings & reviews come in 🔄</p>
          </div>
        )}
      </div>
    </section>
  );
}


function LiveStatsSection() {
  const [stats, setStats] = useState({ customers: 0, partners: 0, bookings: 0, vehicles: 0 });
  const [displayed, setDisplayed] = useState({ customers: 0, partners: 0, bookings: 0, vehicles: 0 });
  const [loaded, setLoaded] = useState(false);

  const fmt = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M+';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
    return n.toString();
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [c, o, b, v] = await Promise.all([
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('owners').select('id', { count: 'exact', head: true }),
          supabase.from('bookings').select('id', { count: 'exact', head: true }),
          supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('is_available', true),
        ]);
        setStats({ customers: c.count || 0, partners: o.count || 0, bookings: b.count || 0, vehicles: v.count || 0 });
        setLoaded(true);
      } catch { setLoaded(true); }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const steps = 80;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      setDisplayed({
        customers: Math.round(stats.customers * ease),
        partners: Math.round(stats.partners * ease),
        bookings: Math.round(stats.bookings * ease),
        vehicles: Math.round(stats.vehicles * ease),
      });
      if (step >= steps) { clearInterval(timer); setDisplayed(stats); }
    }, 2200 / steps);
    return () => clearInterval(timer);
  }, [loaded, stats]);

  const items = [
    { value: displayed.customers, label: 'Happy Renters', icon: '👤', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    { value: displayed.partners, label: 'Verified Partners', icon: '🏪', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    { value: displayed.bookings, label: 'Total Bookings', icon: '📋', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    { value: displayed.vehicles, label: 'Vehicles Live', icon: '🚗', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  ];

  return (
    <section className="bg-slate-900 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Live Statistics</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Growing every day 🇱🇰</h2>
          <p className="text-slate-400 text-sm mt-2">Real-time numbers from across Sri Lanka</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.label} className={`${item.bg} ${item.border} border rounded-2xl p-5 text-center relative overflow-hidden`}>
              <div className="absolute top-3 right-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.dot} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${item.dot}`}></span>
                </span>
              </div>
              <p className="text-3xl mb-3">{item.icon}</p>
              <p className={`text-3xl md:text-4xl font-black ${item.text} leading-none`}>
                {loaded ? fmt(item.value) : '—'}
              </p>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mt-2">{item.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-slate-500 text-xs mt-8 font-medium">Numbers update in real-time · Powered by Drivo LK</p>
      </div>
    </section>
  );
}


function FaqSection() {
  const [activeTab, setActiveTab] = useState<'general'|'booking'|'price'|'documents'>('general');
  const [openIdx, setOpenIdx] = useState<number|null>(0);
  const faqs = {
    general: [
      { q: 'How does Drivo work?', a: 'Drivo is Sri Lanka vehicle rental marketplace. Browse verified cars, bikes & tuk-tuks from local owners. Select your dates, confirm booking, and pay directly to the shop. No middleman payments — we only charge a 10% booking fee.' },
      { q: 'Are all vehicles verified?', a: 'Yes. Every vehicle listed on Drivo is verified by our team. Owners must provide vehicle documents, photos, and their business details before going live.' },
      { q: 'Do I need to create an account to book?', a: 'Yes. To protect both renters and owners, you must register with your NIC/Passport and Driving License. This ensures only verified drivers can book vehicles.' },
      { q: 'Is Drivo available island-wide?', a: 'Yes! Drivo covers all major cities in Sri Lanka including Colombo, Galle, Kandy, Negombo, Ella, Mirissa and more. New locations are added regularly.' },
    ],
    booking: [
      { q: 'How do I confirm a booking?', a: 'Select your vehicle, choose pickup date, return date, pickup time and method (self-pickup or delivery). Click "Confirm Booking" — the shop will receive an SMS and confirm within 30 minutes via WhatsApp.' },
      { q: 'Can I cancel my booking?', a: 'Yes. You can cancel a pending or confirmed booking from your dashboard. The shop will be notified via SMS and the vehicle will become available again.' },
      { q: 'What if the shop does not respond?', a: 'If you do not receive a WhatsApp confirmation within 2 hours, contact us via thedrivo.com. We will follow up with the owner on your behalf.' },
      { q: 'Can I extend my rental period?', a: 'Yes — contact the shop directly via WhatsApp to discuss an extension. If the vehicle is available, they can approve it for additional days.' },
    ],
    price: [
      { q: 'What is the Booking fee?', a: 'Drivo charges a 10% booking fee on each rental. This fee is included in the displayed price — you do not pay extra. The shop receives 90% of the total, and Drivo earns 10%.' },
      { q: 'When do I pay?', a: 'Payment is made directly to the shop at pickup — cash or bank transfer. There is no online payment required through Drivo at this stage.' },
      { q: 'Is there a security deposit?', a: 'Most vehicles on Drivo do not require a deposit. However, some owners may request one. This will be mentioned in the vehicle description or confirmed via WhatsApp.' },
      { q: 'What does the delivery fee cover?', a: 'If you select delivery, the shop will bring the vehicle to your location for an additional Rs. 1,500. This covers the delivery cost for the owner.' },
    ],
    documents: [
      { q: 'What documents do I need to rent?', a: 'You need: (1) National ID Card (NIC) or Passport for foreign nationals, (2) Valid Sri Lanka Driving License or International Driving Permit for foreigners. These must be uploaded during registration.' },
      { q: 'Can foreigners rent vehicles on Drivo?', a: 'Yes! Foreign nationals can rent using their Passport and International Driving License. Select "I am a foreign national" during registration. Your documents will be verified before booking.' },
      { q: 'Does my name on NIC need to match my license?', a: 'Yes. For verification purposes, the name on your NIC/Passport must match your Driving License. Mismatched documents will result in booking cancellation.' },
      { q: 'Are my documents stored securely?', a: 'Your document numbers are stored securely in our database. We do not share your personal information with third parties. Document data is only visible to Drivo admins for verification.' },
    ],
  };
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'booking', label: 'Booking' },
    { key: 'price', label: 'Pricing' },
    { key: 'documents', label: 'Documents' },
  ];
  return (
    <section className="bg-white py-16 px-4 border-t border-slate-100">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm mt-2">Everything you need to know about renting with Drivo</p>
        </div>
        <div className="flex gap-2 justify-center flex-wrap mb-8">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setOpenIdx(0); }}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide border transition ${activeTab === tab.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {faqs[activeTab].map((item, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                <span className="font-black text-slate-900 text-sm pr-4">{item.q}</span>
                <span className={`text-slate-400 text-xl font-bold flex-shrink-0 transition-transform duration-200 ${openIdx === idx ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openIdx === idx && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomerDetailCard({ customerId }: { customerId: string }) {
  const [cust, setCust] = useState<any>(null);
  useEffect(() => {
    supabase.from('customers').select('first_name,last_name,phone,nic,driving_license,city').eq('id', customerId).single().then(({ data }) => setCust(data));
  }, [customerId]);
  if (!cust) return <div className="text-xs text-slate-400 text-center py-2">Loading customer info...</div>;
  return (
    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2">
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Renter Details</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['Name', `${cust.first_name || ''} ${cust.last_name || ''}`],
          ['Phone', cust.phone || '—'],
          ['City', cust.city || '—'],
          ['NIC / Passport', cust.nic || '—'],
          ['Driving License', cust.driving_license || '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[9px] text-slate-400 font-bold uppercase">{k}</p>
            <p className="font-black text-slate-800">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppWidget() {
  const [open, setOpen] = useState(false);

  const WA_NUMBER = '94767868513';
  const questions = [
    { icon: '🚗', text: 'How do I rent a vehicle on Drivo?', msg: 'Hi Drivo LK! I would like to know how to rent a vehicle on your platform.' },
    { icon: '💰', text: 'What is the booking fee?', msg: 'Hi Drivo LK! Can you explain the booking fee and payment process?' },
    { icon: '🏪', text: 'How do I list my vehicle as a partner?', msg: 'Hi Drivo LK! I want to list my vehicle on the platform. How do I become a partner?' },
    { icon: '📋', text: 'I need help with my booking', msg: 'Hi Drivo LK! I need help with my existing booking.' },
    { icon: '📍', text: 'How do I get the pickup location?', msg: 'Hi Drivo LK! How do I get the pickup location for my booked vehicle?' },
    { icon: '✅', text: 'Is my vehicle verified?', msg: 'Hi Drivo LK! I want to check the verification status of my vehicle listing.' },
  ];

  const sendToWA = (msg: string) => {
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col items-end gap-2">

      {/* Chat popup */}
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-72 overflow-hidden mb-1">
          {/* Header */}
          <div className="bg-[#25D366] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.787L0 24l6.396-1.676A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.487-5.187-1.34l-.371-.22-3.8.996 1.013-3.695-.241-.381A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-sm">Drivo LK Support</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"/>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"/>
                </span>
                <p className="text-white/80 text-[10px]">Online · Replies instantly</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-xl font-black transition">×</button>
          </div>

          {/* Chat bubble */}
          <div className="px-4 pt-4 pb-2">
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 inline-block max-w-[90%]">
              <p className="text-sm text-slate-700 font-medium leading-relaxed">👋 Hi! How can we help you today?</p>
              <p className="text-[10px] text-slate-400 mt-1">Choose a question or type your own</p>
            </div>
          </div>

          {/* Suggested questions */}
          <div className="px-3 pb-3 space-y-1.5">
            {questions.map((q, i) => (
              <button key={i} onClick={() => sendToWA(q.msg)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition group">
                <span className="text-base flex-shrink-0">{q.icon}</span>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700 leading-tight">{q.text}</span>
                <span className="ml-auto text-slate-300 group-hover:text-emerald-400 text-xs flex-shrink-0">→</span>
              </button>
            ))}
            {/* Custom message */}
            <button onClick={() => sendToWA('Hi Drivo LK! I have a question.')}
              className="w-full text-center py-2.5 text-xs font-black text-[#25D366] hover:text-[#1fbe5a] transition">
              💬 Send a custom message →
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div className="flex flex-col items-end gap-1.5">
        {!open && (
          <div className="bg-slate-900 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
            </span>
            Chat with us
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 hover:scale-110 active:scale-95 rounded-full shadow-2xl transition-all duration-200 overflow-hidden"
          aria-label="Open WhatsApp support"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
            alt="WhatsApp"
            width={56}
            height={56}
            style={{ display: 'block' }}
          />
        </button>
      </div>
    </div>
  );
}


// Loading spinner helper
const Spinner = () => (
  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"/>
);




// ── Hero Stats — live from Supabase
function HeroStats() {
  const [stats, setStats] = useState({ vehicles: 0, cities: 0, renters: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, c, r] = await Promise.all([
          supabase.from('vehicles').select('id,location', { count: 'exact', head: false }).eq('is_available', true),
          supabase.from('owners').select('city', { count: 'exact', head: false }).is('deleted_at', null),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
        ]);
        const cities = [...new Set((c.data || []).map((o: any) => o.city).filter(Boolean))].length;
        setStats({
          vehicles: v.count || (v.data?.length ?? 0),
          cities: Math.max(cities, 18),
          renters: r.count || 0,
        });
        setLoaded(true);
      } catch { setLoaded(true); }
    };
    load();
  }, []);

  const items = [
    { n: stats.vehicles, label: 'Vehicles listed', suffix: '+' },
    { n: stats.cities, label: 'Cities covered', suffix: '' },
    { n: stats.renters, label: 'Happy renters', suffix: '+' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-6 pt-2">
      {items.map((item, i) => (
        <div key={i} className="text-center">
          <div className="text-2xl md:text-3xl font-black text-white">
            {loaded ? `${item.n}${item.suffix}` : '—'}
          </div>
          <div className="text-xs text-white/40 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}


// ── Hero Background Slideshow
function HeroBgSlider() {
  const photos = [
    '/hero-bg.jpg',
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(p => (p + 1) % photos.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {photos.map((photo, i) => (
          <img
            key={photo}
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === current ? 0.3 : 0, objectPosition: 'center 60%' }}
          />
        ))}
      </div>
      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {photos.map((_, i) => (
          <div key={i} className={`h-0.5 rounded-full transition-all duration-400 ${i === current ? 'w-6 bg-white' : 'w-3 bg-white/30'}`}/>
        ))}
      </div>
    </>
  );
}

export default function Home() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = T[lang];
  const [allVehicles, setAllVehicles] = useState<RawVehicle[]>([]);
  const [filterCity, setFilterCity] = useState('All Sri Lanka');
  const [filterType, setFilterType] = useState('all');
  const [filterPickup, setFilterPickup] = useState('');
  const [filterReturn, setFilterReturn] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(50000);
  const [filterAC, setFilterAC] = useState(false);
  const [filterTrans, setFilterTrans] = useState('all');
  const [filterFuel, setFilterFuel] = useState('all');
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [reviewModal, setReviewModal] = useState<{ vehicleId: string; bookingId: string; vehicleName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [vehicleReviews, setVehicleReviews] = useState<Record<string, any[]>>({});
  type ViewType = 'home'|'detail'|'auth'|'ownerDash'|'custDash';
  const [view, setView] = useState<ViewType>('home');
  const [authMode, setAuthMode] = useState<'owner'|'customer'>('owner');
  const [authTab, setAuthTab] = useState<'login'|'register'|'forgot'|'verify'>('login');
  const [selectedVehicle, setSelectedVehicle] = useState<RawVehicle|null>(null);
  const [detailTab, setDetailTab] = useState<'details'|'docs'|'faq'>('details');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking|null>(null);
  const [ownerSelectedBooking, setOwnerSelectedBooking] = useState<Booking|null>(null);
  const [ownerSubTab, setOwnerSubTab] = useState<'fleet'|'bookings'|'earnings'>('fleet');
  const [earningsPeriod, setEarningsPeriod] = useState<'weekly'|'monthly'|'yearly'>('monthly');
  const [days, setDays] = useState(1);
  const [deliveryType, setDeliveryType] = useState<'pickup'|'delivery'>('pickup');
  const [bookingDone, setBookingDone] = useState(false);
  const [pickupTime, setPickupTime] = useState('09:00');
  const [rentalPeriod, setRentalPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [currency, setCurrency] = useState('LKR');
  const [sessionEmail, setSessionEmail] = useState<string|null>(null);
  const [sessionRole, setSessionRole] = useState<'owner'|'customer'|null>(null);
  const [ownerAcc, setOwnerAcc] = useState<OwnerAccount|null>(null);
  const [custAcc, setCustAcc] = useState<CustomerAccount|null>(null);
  const [ownerFleet, setOwnerFleet] = useState<RawVehicle[]>([]);
  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [regShop, setRegShop] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('Colombo');
  const [regNic, setRegNic] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regIsForeign, setRegIsForeign] = useState(false);
  const [regError, setRegError] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ imgs: string[], idx: number }|null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [newV, setNewV] = useState({ name: '', type: 'car', transmission: 'Automatic', fuel: 'Petrol', pricePerDay: '' as any, weeklyPrice: '' as any, monthlyPrice: '' as any, kmPerDay: '' as any, extraKmCharge: '' as any, depositAmount: '' as any, description: '', mapLink: '', driverOption: 'self_drive', district: '', deliveryOption: 'both', revenueLicenceExpiry: '', insuranceExpiry: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [ownerEditOpen, setOwnerEditOpen] = useState(false);
  const [ownerEditData, setOwnerEditData] = useState({ shopName: '', ownerName: '', phone: '', whatsapp: '', city: 'Colombo', bio: '' });
  const [custEditOpen, setCustEditOpen] = useState(false);
  const [custEditData, setCustEditData] = useState({ firstName: '', lastName: '', phone: '', city: 'Colombo', nic: '', drivingLicense: '' });
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [filterDriver, setFilterDriver] = useState('all');
  const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' }|null>(null);

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const CURRENCIES: Record<string, { rate: number; sign: string; dec: number }> = {
    LKR: { rate: 1, sign: 'Rs.', dec: 0 },
    USD: { rate: 0.0033, sign: '$', dec: 2 },
    EUR: { rate: 0.0030, sign: '€', dec: 2 },
    GBP: { rate: 0.0026, sign: '£', dec: 2 },
    RUB: { rate: 0.30, sign: '₽', dec: 0 },
    AED: { rate: 0.012, sign: 'AED', dec: 2 },
  };
  const curr = CURRENCIES[currency] ?? CURRENCIES['LKR'];
  const fmt = (p: number) => `${curr.sign} ${(p * curr.rate).toLocaleString(undefined, { minimumFractionDigits: curr.dec, maximumFractionDigits: curr.dec })}`;
  const vPrice = (v: any) => v?.price_per_day || v?.pricePerDay || 0;
  const vShop = (v: any) => v?.shop_name || v?.shopName || '';
  const vAvail = (v: any) => v?.isAvailable !== false && v?.is_available !== false;
  const vMap = (v: any) => v?.mapLink || v?.map_link || '';
  const vImg = (v: any) => v?.image || (v?.images?.[0]) || v?.vehicle_photos?.[0]?.storage_url || '';
  const platformFee = (amount: number) => Math.round(amount * 0.10);
  const ownerPayout = (amount: number) => Math.round(amount * 0.90);
  const typeIcon = (tp: string) => tp === 'car' ? '🚙' : tp === 'bike' ? '🏍️' : tp === 'van' ? '🚐' : '🛺';
  const statusColor = (s: string) => s === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : s === 'cancelled' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200';
  const statusLabel = (s: string) => s === 'confirmed' ? t.confirmed : s === 'completed' ? t.completed : s === 'cancelled' ? 'Cancelled' : t.pending;

  const refreshVehicles = useCallback(async (ownerId?: string) => {
    const { data: vdata } = await supabase.from('vehicles').select('*, vehicle_photos(storage_url,sort_order), owners(verified)').eq('is_available', true).order('created_at', { ascending: false });
    if (vdata) setAllVehicles(vdata.map(mapVehicle));
    if (ownerId) {
      const ownerVehicles = await getOwnerVehicles(ownerId);
      const fleet = ownerVehicles.map(mapVehicle);
      setOwnerFleet(fleet);
      setOwnerAcc(prev => prev ? { ...prev, fleet } : prev);
    }
  }, []);

  useEffect(() => {
    trackVisitInDB().catch(() => {});
    supabase.from('vehicles').select('*, vehicle_photos(storage_url,sort_order), owners(verified)').eq('is_available', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllVehicles(data.map(mapVehicle)); }).catch(() => {});
    const s = getSession();
    if (s) restoreSession(s.id, s.email, s.role);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!lightbox) return;
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox(p => p ? { ...p, idx: (p.idx + 1) % p.imgs.length } : null);
      if (e.key === 'ArrowLeft') setLightbox(p => p ? { ...p, idx: (p.idx - 1 + p.imgs.length) % p.imgs.length } : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  const VAPID_PUBLIC_KEY = 'BKVdt525L67coH_qx5RDlKIckkmVRPDUTQL5GGNlGeJ0mQl7V7HKYMq9XlmwJfxjhjioQUE7PhFNExdi0oL7V9U';
  const subscribeToPush = async (userId: string, userType: 'owner'|'customer') => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY });
      await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', userId, userType, subscription: sub }) });
    } catch (e) { console.log('Push setup failed:', e); }
  };

  useEffect(() => {
    if (sessionRole === 'owner' && ownerAcc?.id) subscribeToPush(ownerAcc.id, 'owner');
    else if (sessionRole === 'customer' && custAcc?.id) subscribeToPush(custAcc.id, 'customer');
  }, [sessionRole, ownerAcc?.id, custAcc?.id]);

  useEffect(() => {
    if (sessionRole !== 'owner' || !ownerAcc?.id) return;
    const channel = supabase.channel(`owner-bookings-${ownerAcc.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `owner_id=eq.${ownerAcc.id}` }, async (payload) => {
        if (payload.eventType === 'INSERT') { setOwnerBookings(prev => [payload.new as any, ...prev]); showToast('🔔 New booking request!'); }
        else if (payload.eventType === 'UPDATE') { setOwnerBookings(prev => prev.map(b => b.id === (payload.new as any).id ? payload.new as any : b)); }
        else if (payload.eventType === 'DELETE') { setOwnerBookings(prev => prev.filter(b => b.id !== (payload.old as any).id)); }
        const vehicles = await getAvailableVehicles();
        setAllVehicles(vehicles.map(mapVehicle));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionRole, ownerAcc?.id]);

  useEffect(() => {
    if (sessionRole !== 'customer' || !custAcc?.id) return;
    const channel = supabase.channel(`cust-bookings-${custAcc.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `customer_id=eq.${custAcc.id}` }, (payload) => {
        const updated = payload.new as any;
        setCustAcc(prev => { if (!prev) return prev; const bookings = (prev.bookings || []).map(b => b.id === updated.id ? updated : b); return { ...prev, bookings }; });
        if (updated.status === 'confirmed') showToast('✅ Your booking was confirmed!');
        if (updated.status === 'cancelled') showToast('❌ Your booking was cancelled');
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionRole, custAcc?.id]);

  const restoreSession = async (id: string, email: string, role: 'owner'|'customer') => {
    if (role === 'owner') {
      const { data } = await supabase.from('owners').select('*').eq('id', id).single();
      if (data) {
        const vehicles = await getOwnerVehicles(id);
        const fleet = vehicles.map(mapVehicle);
        const { data: bdata } = await supabase.from('bookings').select('*').eq('owner_id', id).not('status', 'eq', 'declined').order('booked_at', { ascending: false });
        setSessionEmail(email); setSessionRole('owner');
        setOwnerAcc({ ...data, fleet, bookings: bdata || [] });
        setOwnerFleet(fleet); setOwnerBookings(bdata || []);
      }
    } else {
      const { data } = await supabase.from('customers').select('*').eq('id', id).single();
      if (data) {
        const { data: bdata } = await supabase.from('bookings').select('*').eq('customer_id', id).not('status', 'eq', 'declined').order('booked_at', { ascending: false });
        setSessionEmail(email); setSessionRole('customer');
        setCustAcc({ ...data, bookings: bdata || [] });
      }
    }
  };

  const displayed = useMemo(() => {
    let filtered = allVehicles.filter(v => v.is_available === true || v.isAvailable === true);
    if (filterCity !== 'All Sri Lanka') filtered = filtered.filter(v => v.location?.toLowerCase() === filterCity.toLowerCase());
    if (filterType !== 'all') filtered = filtered.filter(v => v.type === filterType);
    if (filterPriceMin > 0) filtered = filtered.filter(v => vPrice(v) >= filterPriceMin);
    if (filterPriceMax < 50000) filtered = filtered.filter(v => vPrice(v) <= filterPriceMax);
    if (filterTrans !== 'all') filtered = filtered.filter(v => v.transmission?.toLowerCase() === filterTrans.toLowerCase());
    if (filterFuel !== 'all') filtered = filtered.filter(v => v.fuel?.toLowerCase() === filterFuel.toLowerCase());
    if (filterDriver !== 'all') filtered = filtered.filter(v => {
      const driverOpt = (v as any).driver_option || 'self_drive';
      if (filterDriver === 'with_driver') return driverOpt === 'with_driver' || driverOpt === 'both';
      if (filterDriver === 'self_drive') return driverOpt === 'self_drive' || driverOpt === 'both';
      return true;
    });
    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVehicles, filterCity, filterType, filterPriceMin, filterPriceMax, filterTrans, filterFuel, filterDriver]);

  useEffect(() => {
    if (sessionRole === 'customer' && custAcc?.id) {
      supabase.from('wishlist').select('vehicle_id').eq('customer_id', custAcc.id)
        .then(({ data }) => { if (data) setWishlist(data.map(w => w.vehicle_id)); });
    }
  }, [sessionRole, custAcc?.id]);

  useEffect(() => {
    if (filterPickup && filterReturn) {
      const d = Math.ceil((new Date(filterReturn).getTime() - new Date(filterPickup).getTime()) / 86400000);
      if (d > 0) setDays(d); else if (d <= 0) setFilterReturn('');
    }
  }, [filterPickup, filterReturn]);

  useEffect(() => {
    if (filterPickup && days > 0) {
      const pickup = new Date(filterPickup);
      pickup.setDate(pickup.getDate() + days);
      const ret = pickup.toISOString().split('T')[0];
      if (ret !== filterReturn) setFilterReturn(ret);
    }
  }, [days, filterPickup]);

  const resetToHome = () => { setView('home'); setSelectedVehicle(null); setBookingDone(false); setMobileMenuOpen(false); setFilterCity('All Sri Lanka'); setFilterType('all'); setFilterPickup(''); setFilterReturn(''); setSelectedBooking(null); };
  const logout = () => { clearSession(); setSessionEmail(null); setSessionRole(null); setOwnerAcc(null); setCustAcc(null); setOwnerFleet([]); setOwnerBookings([]); resetToHome(); showToast('Logged out'); };
  const openAuth = (mode: 'owner'|'customer', tab: 'login'|'register' = 'login') => { setAuthMode(mode); setAuthTab(tab); setLoginEmail(''); setLoginPassword(''); setLoginError(''); setRegEmail(''); setRegPassword(''); setRegConfirm(''); setRegFirst(''); setRegLast(''); setRegShop(''); setRegPhone(''); setRegNic(''); setRegLicense(''); setRegIsForeign(false); setRegError(''); setView('auth'); setMobileMenuOpen(false); };

  const handleOwnerLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) { setLoginError('Email and password required'); return; }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, userType: 'owner' }),
      });
      const result = await res.json();
      if (result.error || !result.data) { setLoginError(result.error || 'Login failed'); return; }
      const data = result.data;
      saveSession({ id: data.id, email: data.email, role: 'owner' });
      await restoreSession(data.id, data.email, 'owner');
      setView('ownerDash');
      showToast(`Welcome, ${data.shop_name}! 👋`);
    } catch { setLoginError('Login failed. Please try again.'); }
  };
  const handleOwnerRegister = async () => { setRegError(''); if (!regEmail.trim()) { setRegError('Email required'); return; } if (regPassword.length < 6) { setRegError('Password min 6 chars'); return; } if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; } if (!regShop.trim()) { setRegError('Shop name required'); return; } if (!regPhone.trim()) { setRegError('Phone required'); return; } if (!agreementAccepted) { setRegError('Please accept the Partner Agreement to continue'); return; } const { data, error } = await registerOwner(regEmail, regPassword, { shopName: regShop, ownerName: regFirst + ' ' + regLast, phone: regPhone, whatsapp: regPhone, city: regCity, agreement_accepted: true, agreement_accepted_at: new Date().toISOString() }); if (error || !data) { setRegError(error || 'Registration failed'); return; } saveSession({ id: data.id!, email: data.email, role: 'owner' }); setSessionEmail(data.email); setSessionRole('owner'); setOwnerAcc({ ...data, fleet: [], bookings: [] }); setOwnerFleet([]); setOwnerBookings([]); setView('ownerDash'); showToast(`Welcome, ${data.shop_name}! 🎉`); if (data.phone || data.whatsapp) { const phone = (data.whatsapp || data.phone || '').replace(/\D/g, '').replace(/^0/, '94'); const welcomeMsg = `🎉 Welcome to *Drivo LK*, ${data.shop_name}!\n\nYour partner account is ready.\n\n✅ Add your vehicles at thedrivo.com\n💰 You earn *90%* of every booking\n\n🌐 thedrivo.com`; try { await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'welcome_whatsapp', phone: `+${phone}`, message: welcomeMsg }) }); } catch { } } };
  const handleCustLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) { setLoginError('Email and password required'); return; }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, userType: 'customer' }),
      });
      const result = await res.json();
      if (result.error || !result.data) { setLoginError(result.error || 'Login failed'); return; }
      const data = result.data;
      saveSession({ id: data.id, email: data.email, role: 'customer' });
      await restoreSession(data.id, data.email, 'customer');
      setView('custDash');
      showToast(`Welcome back, ${data.first_name}! 👋`);
    } catch { setLoginError('Login failed. Please try again.'); }
  };
  const handleCustRegister = async () => { setRegError(''); if (!regEmail.trim()) { setRegError('Email required'); return; } if (regPassword.length < 6) { setRegError('Password min 6 chars'); return; } if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; } if (!regFirst.trim()) { setRegError('First name required'); return; } if (!regPhone.trim()) { setRegError('Phone required'); return; } if (!regNic.trim()) { setRegError(regIsForeign ? 'Passport number required' : 'NIC number required'); return; } if (!regLicense.trim()) { setRegError(regIsForeign ? 'International driving license required' : 'Driving license number required'); return; } const { data, error } = await registerCustomer(regEmail, regPassword, { firstName: regFirst, lastName: regLast, phone: regPhone, city: regCity, nic: regNic, drivingLicense: regLicense }); if (error || !data) { setRegError(error || 'Registration failed'); return; } saveSession({ id: data.id!, email: data.email, role: 'customer' }); setSessionEmail(data.email); setSessionRole('customer'); setCustAcc({ ...data, bookings: [] }); setView('custDash'); showToast(`Welcome, ${data.first_name}! 🎉`); if (data.phone) { const phone = (data.phone || '').replace(/\D/g, '').replace(/^0/, '94'); const welcomeMsg = `👋 Welcome to *Drivo LK*, ${data.first_name}!\n\n🚗 Browse cars, bikes, tuk-tuks & vans\n📍 Find vehicles across all 25 districts\n✅ Easy booking in 60 seconds\n\n🌐 thedrivo.com\n\nHappy travels! 🌴`; try { await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'welcome_whatsapp', phone: `+${phone}`, message: welcomeMsg }) }); } catch { } } };
  const handleLogin = () => authMode === 'owner' ? handleOwnerLogin() : handleCustLogin();
  const handleRegister = () => authMode === 'owner' ? handleOwnerRegister() : handleCustRegister();

  const handleVehicleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!newV.name.trim()) { showToast('Vehicle name required!', 'err'); return; } if (!newV.mapLink.trim()) { showToast('📍 Google Maps pickup location is required!', 'err'); return; } const reqPhotos = (newV.type === 'bike' || newV.type === 'tuk') ? 4 : 6;
    if (photos.filter(Boolean).length < reqPhotos) {
      const typeName = newV.type === 'bike' ? 'bike' : newV.type === 'tuk' ? 'tuk-tuk' : 'vehicle';
      showToast(`Please upload all ${reqPhotos} photos for your ${typeName}! (${photos.filter(Boolean).length}/${reqPhotos})`, 'err');
      return;
    } const todayCheck = new Date(); todayCheck.setHours(0, 0, 0, 0); if ((newV as any).revenueLicenceExpiry) { const revExp = new Date((newV as any).revenueLicenceExpiry); if (revExp < todayCheck) { showToast('Revenue Licence is EXPIRED! Renew before listing.', 'err'); return; } } if ((newV as any).insuranceExpiry) { const insExp = new Date((newV as any).insuranceExpiry); if (insExp < todayCheck) { showToast('Insurance is EXPIRED! Renew before listing.', 'err'); return; } } const ownerId = ownerAcc?.id; if (!ownerId) { showToast('Please login again', 'err'); return; } if (editingId) { const { error } = await updateVehicle(editingId, { name: newV.name, type: newV.type as any, transmission: newV.transmission, fuel: newV.fuel, price_per_day: Number(newV.pricePerDay), description: newV.description, map_link: newV.mapLink, driver_option: (newV as any).driverOption || 'self_drive', delivery_option: (newV as any).deliveryOption || 'both', revenue_licence_expiry: (newV as any).revenueLicenceExpiry || null, insurance_expiry: (newV as any).insuranceExpiry || null, weekly_price: (newV as any).weeklyPrice !== '' && (newV as any).weeklyPrice !== null ? Number((newV as any).weeklyPrice) : 0, monthly_price: (newV as any).monthlyPrice !== '' && (newV as any).monthlyPrice !== null ? Number((newV as any).monthlyPrice) : 0, km_per_day: (newV as any).kmPerDay !== '' ? Number((newV as any).kmPerDay) || null : null, extra_km_charge: (newV as any).extraKmCharge !== '' ? Number((newV as any).extraKmCharge) || null : null, deposit_amount: (newV as any).depositAmount !== '' ? Number((newV as any).depositAmount) || 0 : 0 }, photos); if (error) { showToast(error, 'err'); return; } showToast('Vehicle updated ✓'); } else { const { id, error } = await addVehicle({
          owner_id: ownerId,
          name: newV.name,
          type: newV.type as any,
          transmission: newV.transmission,
          fuel: newV.fuel,
          price_per_day: Number(newV.pricePerDay),
          location: (newV as any).district || ownerAcc?.city || 'Colombo',
          shop_name: ownerAcc?.shop_name || '',
          description: newV.description || undefined,
          map_link: newV.mapLink || undefined,
          weekly_price: (newV as any).weeklyPrice !== '' ? Number((newV as any).weeklyPrice) || null : null,
          monthly_price: (newV as any).monthlyPrice !== '' ? Number((newV as any).monthlyPrice) || null : null,
          km_per_day: (newV as any).kmPerDay !== '' ? Number((newV as any).kmPerDay) || null : null,
          extra_km_charge: (newV as any).extraKmCharge !== '' ? Number((newV as any).extraKmCharge) || null : null,
          deposit_amount: (newV as any).depositAmount !== '' ? Number((newV as any).depositAmount) || 0 : 0,
          driver_option: (newV as any).driverOption || 'self_drive',
          delivery_option: (newV as any).deliveryOption || 'both',
          revenue_licence_expiry: (newV as any).revenueLicenceExpiry || undefined,
          insurance_expiry: (newV as any).insuranceExpiry || undefined,
        }, photos); if (error || !id) { showToast(error || 'Failed', 'err'); return; } showToast('Vehicle published! 🚀'); } await refreshVehicles(ownerId); setNewV({ name: '', type: 'car', transmission: 'Automatic', fuel: 'Petrol', pricePerDay: '' as any, weeklyPrice: '' as any, monthlyPrice: '' as any, kmPerDay: '' as any, extraKmCharge: '' as any, depositAmount: '' as any, description: '', mapLink: '', driverOption: 'self_drive', district: '', deliveryOption: 'both', revenueLicenceExpiry: '', insuranceExpiry: '' }); setPhotos([]); setShowAddForm(false); setEditingId(null); };

  const toggleAvail = async (id: string) => { const v = ownerFleet.find(v => v.id === id); if (!v) return; const newAvail = !vAvail(v); await toggleVehicleAvailability(id, newAvail); const updated = ownerFleet.map(x => x.id === id ? { ...x, isAvailable: newAvail, is_available: newAvail } : x); setOwnerFleet(updated); const { data: vdata } = await supabase.from('vehicles').select('*, vehicle_photos(storage_url,sort_order), owners(verified)').eq('is_available', true).order('created_at', { ascending: false }); if (vdata) setAllVehicles(vdata.map(mapVehicle)); showToast(newAvail ? `"${v.name}" is now live!` : `"${v.name}" hidden`); };
  const deleteVehicle = async (id: string) => { if (!confirm('Delete this vehicle?')) return; await dbDeleteVehicle(id); setOwnerFleet(ownerFleet.filter(v => v.id !== id)); const { data: vdata } = await supabase.from('vehicles').select('*, vehicle_photos(storage_url,sort_order), owners(verified)').eq('is_available', true).order('created_at', { ascending: false }); if (vdata) setAllVehicles(vdata.map(mapVehicle)); showToast('Deleted', 'err'); };
  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));
  const bookingAPI = async (action: string, params: Record<string, any>) => { const res = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...params }) }); return res.json(); };
  const refreshOwnerBookings = async (ownerId: string) => { const { data } = await supabase.from('bookings').select('*').eq('owner_id', ownerId).not('status', 'eq', 'declined').order('booked_at', { ascending: false }); setOwnerBookings(data || []); setOwnerAcc(prev => prev ? { ...prev, bookings: data || [] } : prev); };
  const updateBookingStatus = async (bookingId: string, status: 'confirmed'|'completed') => {
    setLoadingBookingId(bookingId); setLoadingAction(status);
    if (status === 'confirmed') {
      const res = await bookingAPI('accept', { bookingId });
      setLoadingBookingId(null); setLoadingAction(null);
      if (res.error) { showToast(res.error, 'err'); return; }
      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
      await refreshVehicles(ownerAcc?.id);
      showToast('Booking confirmed! Customer notified. ✓');
    } else {
      const res = await bookingAPI('complete', { bookingId });
      setLoadingBookingId(null); setLoadingAction(null);
      if (res.error) { showToast(res.error, 'err'); return; }
      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
      await refreshVehicles(ownerAcc?.id);
      showToast('Rental completed! Vehicle is available again. ✓');
    }
  };
  const declineBooking = async (bookingId: string) => {
    setLoadingBookingId(bookingId); setLoadingAction('decline');
    const res = await bookingAPI('decline', { bookingId });
    setLoadingBookingId(null); setLoadingAction(null);
    if (res.error) { showToast(res.error, 'err'); return; }
    if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
    await refreshVehicles(ownerAcc?.id);
    showToast('Booking declined.');
  };
  const deleteAccount = async (role: 'owner'|'customer') => {
    const name = role === 'owner' ? ownerAcc?.shop_name : `${custAcc?.first_name} ${custAcc?.last_name}`;
    const confirm1 = confirm(`⚠️ Delete your account "${name}"?\n\nThis will permanently delete your account and all data.\n\nThis cannot be undone!`);
    if (!confirm1) return;
    const confirm2 = confirm('Final confirmation — are you absolutely sure?');
    if (!confirm2) return;

    try {
      const id = role === 'owner' ? ownerAcc?.id : custAcc?.id;
      const table = role === 'owner' ? 'owners' : 'customers';

      // 1. Nullify bookings (keep booking records but remove user link)
      await supabase.from('bookings')
        .update({ [role === 'owner' ? 'owner_id' : 'customer_id']: null })
        .eq(role === 'owner' ? 'owner_id' : 'customer_id', id);

      // 2. If owner — delete their vehicles
      if (role === 'owner') {
        const { data: vehicles } = await supabase.from('vehicles').select('id').eq('owner_id', id);
        if (vehicles) {
          for (const v of vehicles) {
            await supabase.from('vehicle_photos').delete().eq('vehicle_id', v.id);
            await supabase.from('vehicle_blocked_dates').delete().eq('vehicle_id', v.id);
          }
          await supabase.from('vehicles').delete().eq('owner_id', id);
        }
      }

      // 3. Soft delete — set deleted_at (allows email re-use)
      await supabase.from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      clearSession();
      setSessionEmail(null); setSessionRole(null);
      setOwnerAcc(null); setCustAcc(null);
      setOwnerFleet([]); setOwnerBookings([]);
      resetToHome();
      showToast('Account deleted. Sorry to see you go 👋');
    } catch {
      showToast('Delete failed. Please contact support.', 'err');
    }
  };

  const cancelBooking = async (bookingId: string, role: 'owner'|'customer') => {
    const msg = role === 'owner' ? 'Cancel this booking? The customer will be notified.' : 'Cancel this booking? The shop will be notified.';
    if (!confirm(msg)) return;
    setLoadingBookingId(bookingId); setLoadingAction('cancel');
    const res = await bookingAPI('cancel', { bookingId, ownerId: role === 'owner' ? ownerAcc?.id : null, customerId: role === 'customer' ? custAcc?.id : null });
    setLoadingBookingId(null); setLoadingAction(null);
    if (res.error) { showToast(res.error, 'err'); return; }
    if (role === 'owner') {
      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
      await refreshVehicles(ownerAcc?.id);
    } else if (custAcc?.id) {
      const { data: bdata } = await supabase.from('bookings').select('*').eq('customer_id', custAcc.id).not('status', 'eq', 'declined').order('booked_at', { ascending: false });
      setCustAcc(prev => prev ? { ...prev, bookings: bdata || [] } : prev);
      await refreshVehicles();
    }
    showToast('Booking cancelled.');
  };
  const toggleWishlist = async (vehicleId: string) => { if (sessionRole !== 'customer' || !custAcc?.id) { setLoginPromptOpen(true); return; } const isWishlisted = wishlist.includes(vehicleId); if (isWishlisted) { await supabase.from('wishlist').delete().eq('customer_id', custAcc.id).eq('vehicle_id', vehicleId); setWishlist(prev => prev.filter(id => id !== vehicleId)); showToast('Removed from favourites'); } else { await supabase.from('wishlist').insert({ customer_id: custAcc.id, vehicle_id: vehicleId }); setWishlist(prev => [...prev, vehicleId]); showToast('Saved to favourites ❤️'); } };
  const submitReview = async () => { if (!reviewModal || !custAcc?.id) return; if (reviewRating < 1 || reviewRating > 5) { showToast('Select a rating', 'err'); return; } const { error } = await supabase.from('reviews').insert({ vehicle_id: reviewModal.vehicleId, customer_id: custAcc.id, booking_id: reviewModal.bookingId, owner_id: allVehicles.find(v => v.id === reviewModal.vehicleId)?.owner_id, rating: reviewRating, comment: reviewComment.trim() }); if (error) { showToast('Review failed: ' + error.message, 'err'); return; } const { data: reviews } = await supabase.from('reviews').select('rating').eq('vehicle_id', reviewModal.vehicleId); if (reviews && reviews.length > 0) { const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length; await supabase.from('vehicles').update({ rating: Math.round(avg * 10) / 10 }).eq('id', reviewModal.vehicleId); } setReviewModal(null); setReviewRating(5); setReviewComment(''); showToast('Review submitted! Thank you 🌟'); };

  useEffect(() => { if (!selectedVehicle) return; const dOpt = (selectedVehicle as any).delivery_option || 'both'; if (dOpt === 'pickup_only') setDeliveryType('pickup'); if (dOpt === 'delivery_only') setDeliveryType('delivery'); }, [selectedVehicle]);
  // rentalPeriod useEffect removed — handled directly in button click

  const getPeriodPrice = (v: any) => {
    if (!v) return { price: 0, unit: 'day', mult: 1 };
    const daily = v.price_per_day || v.pricePerDay || 0;
    if (rentalPeriod === 'weekly') {
      // Use weekly_price if set, otherwise calculate from daily × 7
      const wp = v.weekly_price > 0 ? v.weekly_price : daily * 7;
      return { price: wp, unit: 'week', mult: 7 };
    }
    if (rentalPeriod === 'monthly') {
      // Use monthly_price if set, otherwise calculate from daily × 28
      const mp = v.monthly_price > 0 ? v.monthly_price : daily * 28;
      return { price: mp, unit: 'month', mult: 28 };
    }
    return { price: daily, unit: 'day', mult: 1 };
  };
  const periodInfo = selectedVehicle ? getPeriodPrice(selectedVehicle) : { price: 0, unit: 'day', mult: 1 };
  const periodsCount = rentalPeriod === 'daily' ? days : rentalPeriod === 'weekly' ? Math.ceil(days / 7) : Math.ceil(days / 28);
  const base = periodInfo.price * periodsCount;
  const delFee = deliveryType === 'delivery' ? 1500 : 0;
  const depositAmt = selectedVehicle ? ((selectedVehicle as any).deposit_amount || 0) : 0;
  const total = base + delFee;
  const platformFeeAmt = Math.round(total * 0.10);
  const ownerPayoutAmt = total - platformFeeAmt;

  const confirmBooking = async () => {
    if (!selectedVehicle || bookingLoading) return;
    if (sessionRole !== 'customer') { setLoginPromptOpen(true); return; }

    // Check if pickup/return dates overlap with blocked dates
    if (filterPickup && filterReturn) {
      const { data: blocked } = await supabase
        .from('vehicle_blocked_dates')
        .select('date')
        .eq('vehicle_id', selectedVehicle.id)
        .gte('date', filterPickup)
        .lte('date', filterReturn);

      if (blocked && blocked.length > 0) {
        showToast('Selected dates include unavailable days. Please choose different dates.', 'err');
        return;
      }
    }

    setBookingLoading(true); const today = new Date().toISOString().split('T')[0]; const bookingData = { vehicle_id: selectedVehicle.id, owner_id: selectedVehicle.owner_id, customer_id: sessionRole === 'customer' ? custAcc?.id : undefined, vehicle_name: selectedVehicle.name || '', vehicle_img: selectedVehicle.image || '', shop_name: vShop(selectedVehicle) || '', location: selectedVehicle.location || '', pickup_date: filterPickup || today, return_date: filterReturn || today, pickup_time: pickupTime, days, delivery_type: deliveryType, price_per_day: vPrice(selectedVehicle) || 0, total, status: 'pending' }; const res = await bookingAPI('create', { booking: bookingData, vehicleId: selectedVehicle.id, customerId: sessionRole === 'customer' ? custAcc?.id : null, ownerId: selectedVehicle.owner_id }); if (res.error) { showToast(res.error === 'Vehicle no longer available' ? 'Sorry, this vehicle was just booked by someone else!' : 'Booking failed. Please try again.', 'err'); setBookingLoading(false); setView('home'); setSelectedVehicle(null); await refreshVehicles(); return; } if (sessionRole === 'customer' && custAcc?.id) { const { data: bdata } = await supabase.from('bookings').select('*').eq('customer_id', custAcc.id).not('status', 'eq', 'declined').order('booked_at', { ascending: false }); setCustAcc(prev => prev ? { ...prev, bookings: bdata || [] } : prev); } await refreshVehicles(); await trackBookingInDB().catch(() => {}); setBookingLoading(false); setBookingDone(true); };

  return (
    <main dir={t.dir} className={`min-h-screen bg-slate-50 text-slate-800 antialiased font-sans ${t.dir === 'rtl' ? 'text-right' : ''}`}>
      {toast && (<div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl ${toast.type === 'ok' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>{toast.msg}</div>)}

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button onClick={resetToHome} className="flex items-center gap-2 focus:outline-none flex-shrink-0">
            <DrivoLogo className="w-9 h-9"/>
            <span className="text-xl font-black tracking-tighter text-slate-900">drivo</span>
            <span className="hidden sm:block text-[9px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded uppercase">LK</span>
          </button>
          <div className="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-500">
            <button onClick={() => { resetToHome(); setRentalPeriod('daily'); }} className={`py-2 hover:text-slate-900 transition ${rentalPeriod === 'daily' ? 'text-slate-900 border-b-2 border-slate-900' : ''}`}>{t.dailyRentals}</button>
            <button onClick={() => { resetToHome(); setRentalPeriod('weekly'); }} className={`py-2 hover:text-slate-900 transition ${rentalPeriod === 'weekly' ? 'text-slate-900 border-b-2 border-slate-900' : ''}`}>Weekly</button>
            <button onClick={() => { resetToHome(); setRentalPeriod('monthly'); }} className={`py-2 hover:text-slate-900 transition ${rentalPeriod === 'monthly' ? 'text-slate-900 border-b-2 border-slate-900' : ''}`}>Monthly</button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select value={lang} onChange={e => setLang(e.target.value as LangKey)} className="bg-slate-100 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer">
              <option value="EN">🇬🇧 EN</option><option value="SI">🇱🇰 සිං</option><option value="RU">🇷🇺 RU</option><option value="DE">🇩🇪 DE</option><option value="FR">🇫🇷 FR</option><option value="AR">🇦🇪 AR</option>
            </select>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-slate-100 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer">
              <option value="LKR">🇱🇰 LKR</option><option value="USD">🇺🇸 USD</option><option value="EUR">🇪🇺 EUR</option><option value="GBP">🇬🇧 GBP</option><option value="RUB">🇷🇺 RUB</option><option value="AED">🇦🇪 AED</option>
            </select>
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="block w-5 h-0.5 bg-slate-700 mb-1"/><span className="block w-5 h-0.5 bg-slate-700 mb-1"/><span className="block w-5 h-0.5 bg-slate-700"/>
            </button>
            <div className="hidden md:flex items-center gap-2">
              {sessionRole === 'owner' ? (
                <><button onClick={() => setView('ownerDash')} className={`flex items-center gap-2 text-xs font-black px-3 py-2 rounded-xl border transition ${view === 'ownerDash' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>
                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-slate-600 flex items-center justify-center text-[9px] font-black text-white">
                      {ownerAcc?.avatar_url ? <img src={ownerAcc.avatar_url} alt="" className="w-full h-full object-cover"/> : (ownerAcc?.shop_name || 'O').charAt(0).toUpperCase()}
                    </div>
                    {t.ownerDashboard}
                  </button><button onClick={logout} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-500 transition">{t.logOut}</button></>
              ) : sessionRole === 'customer' ? (
                <><button onClick={() => setView('custDash')} className={`flex items-center gap-2 text-xs font-black px-3 py-2 rounded-xl border transition ${view === 'custDash' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>
                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-blue-600 flex items-center justify-center text-[9px] font-black text-white">
                      {(custAcc as any)?.avatar_url ? <img src={(custAcc as any).avatar_url} alt="" className="w-full h-full object-cover"/> : (custAcc?.first_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    {t.myDashboard}
                  </button><button onClick={logout} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-500 transition">{t.logOut}</button></>
              ) : (
                <><button onClick={() => openAuth('customer')} className="text-xs font-black px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition">🚗 Rent a Vehicle</button><button onClick={() => openAuth('owner')} className="text-xs font-black px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 transition">{t.partnerLogin}</button></>
              )}
            </div>
            {/* Mobile logged in indicator */}
            {sessionRole && (
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 bg-slate-900 text-white rounded-xl text-xs font-black flex-shrink-0 overflow-hidden border-2 border-slate-700 hover:border-slate-500 transition"
                onClick={() => setView(sessionRole === 'owner' ? 'ownerDash' : 'custDash')}>
                {(sessionRole === 'owner' && ownerAcc?.avatar_url) ? (
                  <img src={ownerAcc.avatar_url} alt="" className="w-full h-full object-cover"/>
                ) : (sessionRole === 'customer' && (custAcc as any)?.avatar_url) ? (
                  <img src={(custAcc as any).avatar_url} alt="" className="w-full h-full object-cover"/>
                ) : sessionRole === 'owner' ? (
                  <span>{(ownerAcc?.shop_name || 'O').charAt(0).toUpperCase()}</span>
                ) : (
                  <span>{(custAcc?.first_name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </button>
            )}
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-2 shadow-md">
            {sessionRole ? (
              <><button onClick={() => { setView(sessionRole === 'owner' ? 'ownerDash' : 'custDash'); setMobileMenuOpen(false); }} className="w-full py-2.5 text-sm font-black bg-slate-900 text-white rounded-xl">{t.myDashboard}</button><button onClick={logout} className="w-full py-2 text-sm font-bold text-red-500">{t.logOut}</button></>
            ) : (
              <><button onClick={() => openAuth('customer')} className="w-full py-2.5 text-sm font-bold bg-slate-100 rounded-xl">🚗 Rent a Vehicle</button><button onClick={() => openAuth('owner')} className="w-full py-2.5 text-sm font-black bg-slate-900 text-white rounded-xl">{t.partnerLogin}</button></>
            )}
          </div>
        )}
      </nav>

      {/* AGREEMENT MODAL */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-900">
              <div><h3 className="font-black text-white text-lg">Drivo LK Partner Agreement</h3><p className="text-xs text-slate-400 mt-0.5">Please read carefully before accepting</p></div>
              <button onClick={() => setShowAgreementModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-700 space-y-4">
              {[
                ['1. Platform Relationship','Drivo LK operates as a marketplace connecting vehicle rental partners with customers. We do not own or operate vehicles. Partners are solely responsible for their vehicles and customer interactions.'],
                ['2. Commission & Platform Fee','Drivo LK charges 10% on the total booking value. Partners receive 90% of each booking. Example: Rs. 10,000 booking = Rs. 1,000 to Drivo + Rs. 9,000 to Partner.'],
                ['3. Vehicle Standards','All vehicles must have valid Revenue Licence, Insurance, and all legally required documents. Partners must keep documents updated on the platform. Vehicles must be clean and roadworthy.'],
                ['4. Partner Responsibilities','Respond to bookings within 24 hours. Honor confirmed bookings. Verify customer driving licence. Provide accurate vehicle info and photos. Maintain minimum 3.5/5 rating.'],
                ['5. Customer Protection','No hidden fees beyond listed prices. Pickup location shared only after booking. Disputes to be resolved in good faith.'],
                ['6. Liability','Drivo LK is not liable for accidents, damages, or losses during rental. Partners must maintain adequate insurance coverage.'],
                ['7. Termination','Either party may terminate with 14 days notice. Drivo may immediately suspend accounts for false information, expired documents, or repeated complaints.'],
                ['8. Governing Law','This agreement is governed by the laws of Sri Lanka. Disputes are subject to Sri Lankan courts.'],
              ].map(([title, text]) => (
                <div key={title}><p className="font-black text-slate-900 mb-1">{title}</p><p className="text-slate-600 leading-relaxed">{text}</p></div>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4"><p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-1">Important</p><p className="text-sm text-amber-700">A full legally binding agreement document is available from Drivo LK for physical signing. Contact admin@drivo.lk to obtain the complete document.</p></div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
              <button onClick={() => setShowAgreementModal(false)} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-sm transition">Close</button>
              <button onClick={() => { setAgreementAccepted(true); setShowAgreementModal(false); }} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase transition">✓ I Accept These Terms</button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl font-black transition z-10">×</button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-bold">{lightbox.idx + 1} / {lightbox.imgs.length}</div>
          {lightbox.imgs.length > 1 && (<button onClick={e => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: (p.idx - 1 + p.imgs.length) % p.imgs.length } : null); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center text-2xl font-black transition z-10">‹</button>)}
          <img src={lightbox.imgs[lightbox.idx]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}/>
          {lightbox.imgs.length > 1 && (<button onClick={e => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: (p.idx + 1) % p.imgs.length } : null); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center text-2xl font-black transition z-10">›</button>)}
          {lightbox.imgs.length > 1 && (<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] pb-1">{lightbox.imgs.map((img, i) => (<button key={i} onClick={e => { e.stopPropagation(); setLightbox(p => p ? { ...p, idx: i } : null); }} className={`flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition ${lightbox.idx === i ? 'border-white' : 'border-white/20 hover:border-white/60'}`}><img src={img} className="w-full h-full object-cover" alt=""/></button>))}</div>)}
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 text-center"><p className="text-2xl mb-1">⭐</p><h2 className="text-white text-lg font-black">Rate Your Ride</h2><p className="text-slate-400 text-xs mt-1">{reviewModal.vehicleName}</p></div>
            <div className="p-6 space-y-4">
              <div><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 text-center">Your Rating</p><div className="flex justify-center gap-2">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setReviewRating(star)} className={`text-3xl transition-transform hover:scale-110 ${star <= reviewRating ? '' : 'opacity-30'}`}>⭐</button>))}</div><p className="text-center text-xs font-bold text-slate-500 mt-2">{reviewRating === 1 ? 'Poor' : reviewRating === 2 ? 'Fair' : reviewRating === 3 ? 'Good' : reviewRating === 4 ? 'Very Good' : 'Excellent!'}</p></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Comment (optional)</label><textarea rows={3} placeholder="Tell others about your experience..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition resize-none" value={reviewComment} onChange={e => setReviewComment(e.target.value)}/></div>
              <button onClick={submitReview} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide transition">Submit Review 🌟</button>
              <button onClick={() => setReviewModal(null)} className="w-full py-2.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN PROMPT MODAL */}
      {loginPromptOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-6 text-center"><DrivoLogo className="w-10 h-10 mx-auto mb-2"/><h2 className="text-white text-xl font-black">Login Required</h2><p className="text-slate-400 text-xs mt-1">You need an account to book a vehicle</p></div>
            <div className="p-6 space-y-3">
              <button onClick={() => { setLoginPromptOpen(false); openAuth('customer', 'login'); }} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide transition shadow-md">🔑 Sign In to My Account</button>
              <button onClick={() => { setLoginPromptOpen(false); openAuth('customer', 'register'); }} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-wide transition">✨ Create New Account</button>
              <p className="text-center text-[11px] text-slate-400 pt-1">Free account · Takes 1 minute · NIC &amp; license required</p>
              <button onClick={() => setLoginPromptOpen(false)} className="w-full py-2.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH PAGE */}
      {view === 'auth' && (
        <div className="min-h-[calc(100vh-64px)] bg-slate-100 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[460px]">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 px-5 sm:px-8 py-6 sm:py-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3"><DrivoLogo className="w-9 h-9"/><span className="text-white font-black text-xl">drivo</span><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ml-1 ${authMode === 'owner' ? 'bg-emerald-500 text-slate-900' : 'bg-blue-400 text-white'}`}>{authMode === 'owner' ? 'Partner' : 'Customer'}</span></div>
                <h2 className="text-white text-2xl font-black">{authTab === 'login' ? t.welcomeBack : authTab === 'forgot' ? 'Reset Password' : authTab === 'verify' ? 'Enter OTP' : (authMode === 'owner' ? t.createShop : t.register)}</h2>
                <p className="text-slate-400 text-sm mt-1">{authTab === 'login' ? (authMode === 'owner' ? t.manageFleet : t.myBookings) : t.startListing}</p>
                {authTab !== 'forgot' && authTab !== 'verify' && (
                  <div className="flex gap-2 mt-4 justify-center">
                    {(['customer', 'owner'] as const).map(role => (
                      <button key={role} onClick={() => setAuthMode(role)} className={`text-xs font-black px-4 py-1.5 rounded-full transition border ${authMode === role ? 'bg-white text-slate-900 border-white' : 'border-white/30 text-white/70 hover:border-white/60'}`}>
                        {role === 'owner' ? '🔑 ' + t.partnerLogin : '👤 ' + t.customerLogin}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs — only show for login/register */}
              {authTab !== 'forgot' && authTab !== 'verify' && (
                <div className="flex border-b border-slate-200">
                  {(['login', 'register'] as const).map(tab => (
                    <button key={tab} onClick={() => { setAuthTab(tab); setLoginError(''); setRegError(''); }}
                      className={`flex-1 py-3.5 text-sm font-black uppercase tracking-wide transition ${authTab === tab ? 'text-slate-900 border-b-2 border-slate-900 bg-white' : 'text-slate-400 bg-slate-50 hover:text-slate-700'}`}>
                      {tab === 'login' ? t.signIn : t.register}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-5 sm:px-8 py-5 sm:py-7">
                {/* LOGIN */}
                {authTab === 'login' && (
                  <div className="space-y-4">
                    {[
                      { l: t.email, v: loginEmail, s: setLoginEmail, t: 'email' },
                      { l: t.password, v: loginPassword, s: setLoginPassword, t: 'pw' },
                    ].map((f, i) => (
                      <div key={i}>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{f.l}</label>
                        <div className="relative">
                          <input type={f.t === 'pw' ? (showLoginPw ? 'text' : 'password') : 'email'} placeholder={f.t === 'pw' ? '••••••••' : 'you@example.com'}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-14 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                            value={f.v} onChange={e => f.s(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
                          {f.t === 'pw' && <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black px-1">{showLoginPw ? 'HIDE' : 'SHOW'}</button>}
                        </div>
                      </div>
                    ))}
                    {loginError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {loginError}</div>}
                    {/* FORGOT PASSWORD LINK */}
                    <div className="text-right -mt-2">
                      <button onClick={() => setAuthTab('forgot')} className="text-xs text-slate-400 hover:text-slate-700 font-semibold transition">Forgot password?</button>
                    </div>
                    <button onClick={handleLogin} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">{t.signIn} →</button>
                    <p className="text-center text-xs text-slate-400">{t.noAccount} <button onClick={() => setAuthTab('register')} className="text-slate-700 font-black hover:underline">{t.registerHere}</button></p>
                  </div>
                )}

                {/* REGISTER */}
                {authTab === 'register' && (
                  <div className="space-y-3">
                    <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.email} <span className="text-red-400">*</span></label><input type="email" placeholder="you@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300" value={regEmail} onChange={e => setRegEmail(e.target.value)}/></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.password} <span className="text-red-400">*</span></label><div className="relative"><input type={showRegPw ? 'text' : 'password'} placeholder="Min 6" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regPassword} onChange={e => setRegPassword(e.target.value)}/><button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{showRegPw ? 'HIDE' : 'SHOW'}</button></div></div>
                      <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.confirmPw} <span className="text-red-400">*</span></label><input type="password" placeholder="Repeat" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regConfirm} onChange={e => setRegConfirm(e.target.value)}/></div>
                    </div>
                    <div className="pt-1 border-t border-slate-100 space-y-3">
                      {authMode === 'owner' ? (
                        <>
                          <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.shopName} <span className="text-red-400">*</span></label><input type="text" placeholder="e.g. Galle Road Rentals" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regShop} onChange={e => setRegShop(e.target.value)}/></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.ownerName}</label><input type="text" placeholder="Your name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regFirst} onChange={e => setRegFirst(e.target.value)}/></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.phone} <span className="text-red-400">*</span></label><input type="tel" placeholder="077XXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regPhone} onChange={e => setRegPhone(e.target.value)}/></div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <input type="checkbox" id="agreeCheck" checked={agreementAccepted} onChange={e => setAgreementAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-slate-900 cursor-pointer flex-shrink-0"/>
                              <label htmlFor="agreeCheck" className="text-xs text-slate-600 cursor-pointer leading-relaxed">I have read and agree to the <button type="button" onClick={() => setShowAgreementModal(true)} className="text-slate-900 font-black underline">Drivo LK Partner Agreement</button></label>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.firstName} <span className="text-red-400">*</span></label><input type="text" placeholder="Kavinda" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regFirst} onChange={e => setRegFirst(e.target.value)}/></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.lastName}</label><input type="text" placeholder="Perera" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regLast} onChange={e => setRegLast(e.target.value)}/></div>
                          </div>
                          <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.phone} <span className="text-red-400">*</span></label><input type="tel" placeholder="077XXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regPhone} onChange={e => setRegPhone(e.target.value)}/></div>
                          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"><input type="checkbox" id="isForeign" checked={regIsForeign} onChange={e => setRegIsForeign(e.target.checked)} className="w-4 h-4 accent-slate-900 cursor-pointer"/><label htmlFor="isForeign" className="text-xs font-black text-slate-700 cursor-pointer">I am a foreign national (tourist/expat)</label></div>
                          <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{regIsForeign ? 'Passport Number' : 'NIC Number'} <span className="text-red-400">*</span></label><input type="text" placeholder={regIsForeign ? 'e.g. A12345678' : 'e.g. 200012345678 or 991234567V'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regNic} onChange={e => setRegNic(e.target.value)}/></div>
                          <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{regIsForeign ? 'International Driving License No.' : 'Driving License No.'} <span className="text-red-400">*</span></label><input type="text" placeholder={regIsForeign ? 'International license number' : 'e.g. B1234567'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regLicense} onChange={e => setRegLicense(e.target.value)}/><p className="text-[10px] text-slate-400 mt-1">⚠️ Your name on ID &amp; license must match. Required for verification.</p></div>
                        </>
                      )}
                      <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.city}</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition" value={regCity} onChange={e => setRegCity(e.target.value)}>{SL_CITIES.slice(1).map(c => <option key={c}>{c}</option>)}</select></div>
                    </div>
                    {regError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {regError}</div>}
                    <button onClick={handleRegister} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">{t.createAccount} →</button>
                    <p className="text-center text-xs text-slate-400">{t.alreadyReg} <button onClick={() => setAuthTab('login')} className="text-slate-700 font-black hover:underline">{t.signIn}</button></p>
                  </div>
                )}

                {/* FORGOT PASSWORD */}
                {authTab === 'forgot' && (
                  <ForgotPasswordForm
                    onBack={() => setAuthTab('login')}
                    onSuccess={(email) => { localStorage.setItem('drivo_reset_email', email); setAuthTab('verify'); }}
                    showToast={showToast}
                  />
                )}

                {/* VERIFY OTP */}
                {authTab === 'verify' && (
                  <VerifyOtpForm
                    onBack={() => setAuthTab('forgot')}
                    onSuccess={() => { setAuthTab('login'); showToast('Password reset! Please login. ✓'); }}
                    showToast={showToast}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DASHBOARD */}
      {view === 'custDash' && custAcc && (
        <div className="bg-slate-100 min-h-[calc(100vh-64px)]">
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl overflow-hidden flex-shrink-0">{(custAcc as any).avatar_url ? <img src={(custAcc as any).avatar_url} className="w-full h-full object-cover" alt=""/> : (custAcc.first_name || 'U').charAt(0)}</div>
                <div><p className="font-black text-slate-900 text-base">{custAcc.first_name || ''} {custAcc.last_name || ''}</p><p className="text-xs text-slate-500">{custAcc.city || ''}{custAcc.phone ? ` · ${custAcc.phone}` : ''}</p></div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="hidden sm:flex items-center gap-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"><span>{(custAcc.bookings || []).length} {t.myBookings}</span><span className="text-slate-300">|</span><span className="text-emerald-600">{(custAcc.bookings || []).filter(b => b.status === 'confirmed').length} {t.confirmed}</span><span className="text-slate-300">|</span><span className="text-amber-500">{(custAcc.bookings || []).filter(b => b.status === 'pending').length} {t.pending}</span></div>
                <button onClick={() => { setCustEditData({ firstName: custAcc.first_name || '', lastName: custAcc.last_name || '', phone: custAcc.phone || '', city: custAcc.city || 'Colombo', nic: custAcc.nic || '', drivingLicense: custAcc.driving_license || '' }); setCustEditOpen(true); }} className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">{t.editProfile}</button>
                <button onClick={resetToHome} className="text-xs font-black px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition">{t.browseVehicles}</button>
              </div>
            </div>
          </div>

          {/* Customer Edit Modal */}
          {custEditOpen && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-start sm:items-center justify-center px-4 py-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"><h3 className="font-black text-slate-900">My Profile</h3><button onClick={() => setCustEditOpen(false)} className="text-slate-400 hover:text-slate-700 text-2xl">×</button></div>
                <div className="p-6 space-y-4">
                  <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-4xl overflow-hidden border-4 border-slate-100 shadow-lg">{custAcc?.avatar_url ? <img src={custAcc.avatar_url} className="w-full h-full object-cover" alt=""/> : (custAcc?.first_name || 'U').charAt(0)}</div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-700 transition shadow-md">📷<input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file || !custAcc?.id) return; setProfilePhotoUploading(true); const ext = file.name.split('.').pop(); const path = `avatars/customer_${custAcc.id}.${ext}`; const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true }); if (!error) { const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path); await supabase.from('customers').update({ avatar_url: urlData.publicUrl }).eq('id', custAcc.id); setCustAcc(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev); showToast('Profile photo updated! 📷'); } setProfilePhotoUploading(false); }}/></label>
                    </div>
                    <p className="text-sm font-black text-slate-900">{custAcc?.first_name} {custAcc?.last_name}</p>
                    <p className="text-xs text-slate-400">{custAcc?.email}</p>
                    {profilePhotoUploading && <p className="text-xs text-blue-500 font-bold animate-pulse">Uploading...</p>}
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">{[{ l: t.firstName, k: 'firstName' }, { l: t.lastName, k: 'lastName' }].map(f => (<div key={f.k}><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition" value={(custEditData as any)[f.k]} onChange={e => setCustEditData({ ...custEditData, [f.k]: e.target.value })}/></div>))}</div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t.phone}</label><input type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition" value={custEditData.phone} onChange={e => setCustEditData({ ...custEditData, phone: e.target.value })}/></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t.city}</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none cursor-pointer" value={custEditData.city} onChange={e => setCustEditData({ ...custEditData, city: e.target.value })}>{SL_CITIES.slice(1).map(c => <option key={c}>{c}</option>)}</select></div>
                    <div className="pt-1 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">🪪 Verification Documents</p>
                      <div className="space-y-3">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">NIC / Passport Number</label><input type="text" placeholder="e.g. 200012345678 or A12345678" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition" value={(custEditData as any).nic} onChange={e => setCustEditData({ ...custEditData, nic: e.target.value } as any)}/></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Driving License Number</label><input type="text" placeholder="e.g. B1234567" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition" value={(custEditData as any).drivingLicense} onChange={e => setCustEditData({ ...custEditData, drivingLicense: e.target.value } as any)}/></div>
                        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">⚠️ Document changes will be reviewed by Drivo admin before verification.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Verified Documents</p><div className="flex items-center justify-between text-xs"><span className="text-slate-600">NIC / Passport</span><span className="font-black text-slate-900">{custAcc?.nic || '—'}</span></div><div className="flex items-center justify-between text-xs"><span className="text-slate-600">Driving License</span><span className="font-black text-slate-900">{custAcc?.driving_license || '—'}</span></div><p className="text-[10px] text-slate-400 mt-1">Documents verified at registration · Contact support to update</p></div>
                  <ChangePasswordForm userId={custAcc?.id || ''} userType="customer" showToast={showToast} />
                  <button onClick={async () => { if (!custAcc?.id) return; await supabase.from('customers').update({ first_name: custEditData.firstName, last_name: custEditData.lastName, phone: custEditData.phone, city: custEditData.city, nic: (custEditData as any).nic || '', driving_license: (custEditData as any).drivingLicense || '' }).eq('id', custAcc.id); setCustAcc(prev => prev ? { ...prev, first_name: custEditData.firstName, last_name: custEditData.lastName, phone: custEditData.phone, city: custEditData.city, nic: (custEditData as any).nic || '', driving_license: (custEditData as any).drivingLicense || '' } : prev); setCustEditOpen(false); showToast(t.profileUpdated); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.saveProfile}</button>
                  <div className="border-t border-slate-100 pt-3">
                    <button onClick={() => { setCustEditOpen(false); deleteAccount('customer'); }}
                      className="w-full py-2.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-wide transition">
                      🗑 Delete My Account
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1.5">Permanently deletes your account & data</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedBooking && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="font-black text-slate-900">{t.bookingDetails}</h3><button onClick={() => setSelectedBooking(null)} className="text-slate-400 text-2xl hover:text-slate-700">×</button></div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex gap-4">
                    <img src={selectedBooking.vehicle_img || ''} className="w-24 h-16 sm:w-28 sm:h-20 rounded-xl object-cover flex-shrink-0" alt=""/>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{selectedBooking.vehicle_name || ''}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{selectedBooking.shop_name || ''} · {selectedBooking.location}</p>
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor(selectedBooking.status)}`}>{statusLabel(selectedBooking.status)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"><div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0">{([['Rental Period', `${selectedBooking.pickup_date || ''} → ${selectedBooking.return_date || ''}`], ['Pickup Time', (selectedBooking as any).pickup_time || '—'], ['Days', `${selectedBooking.days} day${selectedBooking.days > 1 ? 's' : ''}`], ['Pickup Type', (selectedBooking.delivery_type || 'pickup') === 'delivery' ? t.delivery : t.selfPickup], ['Vehicle Rate', `Rs. ${(selectedBooking.price_per_day || 0).toLocaleString()} /day`], ...((selectedBooking.delivery_type || 'pickup') === 'delivery' ? [['Delivery Fee', 'Rs. 1,500']] : []), ['Total Paid', `Rs. ${(selectedBooking.total || 0).toLocaleString()}`], ['Status', statusLabel(selectedBooking.status)], ['Booked On', selectedBooking.booked_at ? new Date(selectedBooking.booked_at).toLocaleDateString() : '']] as [string, string][]).map(([k, v]) => (<div key={k} className="flex justify-between px-4 py-2.5 text-xs border-b border-slate-100 last:border-0"><span className="text-slate-400 font-semibold">{k}</span><span className="font-black text-slate-900 text-right ml-2">{v}</span></div>))}</div></div>
                  {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (<button onClick={async () => { await cancelBooking(selectedBooking.id, 'customer'); setSelectedBooking(null); }} className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-sm uppercase tracking-wide transition">✕ Cancel This Booking</button>)}
                  {(selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (<button onClick={async () => { if (!confirm('Remove this booking from your history?')) return; await supabase.from('bookings').update({ customer_id: null }).eq('id', selectedBooking.id); const { data: bdata } = await supabase.from('bookings').select('*').eq('customer_id', custAcc.id).not('status', 'eq', 'declined').order('booked_at', { ascending: false }); setCustAcc(prev => prev ? { ...prev, bookings: bdata || [] } : prev); setSelectedBooking(null); showToast('Removed from history'); }} className="w-full py-3 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 rounded-xl font-black text-xs uppercase transition">🗑 Remove from History</button>)}
                  <button onClick={() => setSelectedBooking(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">Close</button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex gap-2 mb-5 flex-wrap">
              {([
                { key: 'all', label: t.myBookings, icon: '📋' },
                { key: 'upcoming', label: t.upcomingRentals, icon: '🗓️' },
                { key: 'past', label: t.pastRentals, icon: '✅' },
                { key: 'favourites', label: 'My Favourites', icon: '❤️' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setOwnerSubTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition ${ownerSubTab === tab.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                  <span>{tab.icon}</span> {tab.label}
                  {tab.key === 'favourites' && wishlist.length > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{wishlist.length}</span>
                  )}
                </button>
              ))}
            </div>
            {ownerSubTab === 'favourites' ? (
              <div>{wishlist.length === 0 ? (<div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20"><p className="text-5xl mb-3">🤍</p><p className="font-black text-slate-700">No favourites yet</p><button onClick={resetToHome} className="mt-5 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">Browse Vehicles</button></div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{allVehicles.filter(v => wishlist.includes(v.id)).map(v => (<div key={v.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedVehicle(v); setView('detail'); }}><div className="relative aspect-video bg-slate-100 overflow-hidden"><img src={v.image} alt={v.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/><button onClick={e => { e.stopPropagation(); toggleWishlist(v.id); }} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition">❤️</button></div><div className="p-3"><p className="font-black text-slate-900 text-sm">{v.name}</p><p className="text-xs text-slate-400 mt-0.5">{vShop(v)} · {v.location}</p><p className="font-black text-slate-900 text-sm mt-2">Rs. {vPrice(v).toLocaleString()} <span className="text-xs font-normal text-slate-400">/day</span></p></div></div>))}</div>)}</div>
            ) : (custAcc.bookings || []).length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20"><p className="text-5xl mb-3">🗓️</p><p className="font-black text-slate-700">{t.noBookings}</p><button onClick={resetToHome} className="mt-5 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.browseVehicles}</button></div>
            ) : (
              <div className="space-y-3">
                {(custAcc.bookings || []).filter(b => ownerSubTab === 'all' ? true : ownerSubTab === 'upcoming' ? b.status !== 'completed' && b.status !== 'cancelled' : b.status === 'completed' || b.status === 'cancelled').map(b => (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden">
                    <div className="flex gap-4 p-4"><img src={b.vehicle_img || ''} className="w-24 h-16 rounded-xl object-cover flex-shrink-0" alt=""/><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-900 text-sm">{b.vehicle_name || ''}</p><p className="text-xs text-slate-400 mt-0.5">{b.shop_name || ''} · {b.location}</p></div><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border flex-shrink-0 ${statusColor(b.status)}`}>{statusLabel(b.status)}</span></div><div className="flex items-center gap-4 mt-1.5 flex-wrap"><span className="text-xs text-slate-500">📅 {b.pickup_date || ''} → {b.return_date || ''}</span><span className="text-xs font-black text-slate-900">Rs. {b.total.toLocaleString()}</span><span className="text-xs text-slate-400">{b.days}d · {b.delivery_type || 'pickup'}</span></div></div></div>
                    <div className="border-t border-slate-100 px-4 py-2.5 flex justify-between items-center gap-2"><span className="text-[10px] text-slate-400">{t.bookedOn}: {b.booked_at ? new Date(b.booked_at).toLocaleDateString() : ''}</span><div className="flex items-center gap-2">{(b.status === 'pending' || b.status === 'confirmed') && (<button onClick={() => cancelBooking(b.id, 'customer')} disabled={loadingBookingId === b.id} className={`text-xs font-black transition border px-3 py-1 rounded-lg flex items-center gap-1 ${loadingBookingId === b.id ? 'text-red-300 border-red-100 bg-red-50 cursor-not-allowed' : 'text-red-500 hover:text-red-700 border-red-200 bg-red-50 hover:bg-red-100'}`}>{loadingBookingId === b.id ? <><Spinner/>...</> : 'Cancel'}</button>)}{b.status === 'completed' && (<button onClick={() => { setReviewModal({ vehicleId: b.vehicle_id, bookingId: b.id, vehicleName: b.vehicle_name || '' }); setReviewRating(5); setReviewComment(''); }} className="text-xs font-black text-amber-600 hover:text-amber-700 transition border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg">⭐ Review</button>)}<button onClick={() => setSelectedBooking(b)} className="text-xs font-black text-slate-600 hover:text-slate-900 transition">{t.bookingDetails} →</button></div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OWNER DASHBOARD */}
      {view === 'ownerDash' && ownerAcc && (
        <div className="bg-slate-100 min-h-[calc(100vh-64px)]">
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">{(ownerAcc.shop_name || 'S').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap"><p className="font-black text-slate-900 text-base">{ownerAcc.shop_name || ''}</p>{(ownerAcc as any).verified && (<span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">✅ Verified</span>)}{!(ownerAcc as any).verified && (<span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">⏳ Pending Verification</span>)}</div>
                  <p className="text-xs text-slate-500">{ownerAcc.city || ''} · {ownerAcc.phone || ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="hidden sm:flex items-center gap-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"><span>{ownerFleet.length} {t.total}</span><span className="text-slate-300">|</span><span className="text-emerald-600">{ownerFleet.filter(v => vAvail(v)).length} {t.live}</span><span className="text-slate-300">|</span><span className="text-amber-500">{ownerBookings.filter(b => b.status === 'pending').length} {t.pending}</span></div>
                <button onClick={() => { setOwnerEditData({ shopName: ownerAcc.shop_name || '', ownerName: ownerAcc.owner_name || '', phone: ownerAcc.phone || '', whatsapp: ownerAcc.whatsapp || '', city: ownerAcc.city || 'Colombo', bio: '' }); setOwnerEditOpen(true); }} className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">{t.editProfile}</button>
                <button onClick={() => { setShowAddForm(true); setEditingId(null); setNewV({ name: '', type: 'car', transmission: 'Automatic', fuel: 'Petrol', pricePerDay: '' as any, weeklyPrice: '' as any, monthlyPrice: '' as any, kmPerDay: '' as any, extraKmCharge: '' as any, depositAmount: '' as any, description: '', mapLink: '', driverOption: 'self_drive', district: '', deliveryOption: 'both', revenueLicenceExpiry: '', insuranceExpiry: '' }); setPhotos([]); }} className="text-xs font-black px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"><span className="text-lg leading-none">+</span> {t.addVehicle}</button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 flex gap-0">
              {([['fleet', t.yourFleet], ['bookings', t.incomingBookings], ['earnings', '💰 Earnings']] as [string, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setOwnerSubTab(k as any)} className={`px-5 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition ${ownerSubTab === k ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                  {l} {k === 'bookings' && ownerBookings.filter(b => b.status === 'pending').length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{ownerBookings.filter(b => b.status === 'pending').length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Owner Edit Modal */}
          {ownerEditOpen && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-start sm:items-center justify-center px-4 py-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"><h3 className="font-black text-slate-900">Partner Profile</h3><button onClick={() => setOwnerEditOpen(false)} className="text-slate-400 text-2xl hover:text-slate-700">×</button></div>
                <div className="p-6 space-y-4">
                  <div className="flex flex-col items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-4xl overflow-hidden border-4 border-slate-100 shadow-lg">{ownerAcc?.avatar_url ? <img src={ownerAcc.avatar_url} className="w-full h-full object-cover" alt=""/> : (ownerAcc?.shop_name || 'S').charAt(0).toUpperCase()}</div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-700 transition shadow-md">📷<input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file || !ownerAcc?.id) return; setProfilePhotoUploading(true); const ext = file.name.split('.').pop(); const path = `avatars/owner_${ownerAcc.id}.${ext}`; const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true }); if (!error) { const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path); await supabase.from('owners').update({ avatar_url: urlData.publicUrl }).eq('id', ownerAcc.id); setOwnerAcc(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev); showToast('Profile photo updated! 📷'); } setProfilePhotoUploading(false); }}/></label>
                    </div>
                    <p className="text-sm font-black text-slate-900">{ownerAcc?.shop_name}</p>
                    <p className="text-xs text-slate-400">{ownerAcc?.email}</p>
                    {profilePhotoUploading && <p className="text-xs text-blue-500 font-bold animate-pulse">Uploading...</p>}
                  </div>
                  <div className="space-y-3">
                    {[{ l: t.shopName, k: 'shopName' }, { l: t.ownerName, k: 'ownerName' }, { l: t.phone, k: 'phone' }, { l: 'WhatsApp', k: 'whatsapp' }].map(f => (<div key={f.k}><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition" value={(ownerEditData as any)[f.k]} onChange={e => setOwnerEditData({ ...ownerEditData, [f.k]: e.target.value })}/></div>))}
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t.city}</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none cursor-pointer" value={ownerEditData.city} onChange={e => setOwnerEditData({ ...ownerEditData, city: e.target.value })}>{SL_CITIES.slice(1).map(c => <option key={c}>{c}</option>)}</select></div>
                    <ChangePasswordForm userId={ownerAcc?.id || ''} userType="owner" showToast={showToast} />
                    <button onClick={async () => { if (!sessionEmail || !ownerAcc?.id) return; await supabase.from('owners').update({ shop_name: ownerEditData.shopName, owner_name: ownerEditData.ownerName, phone: ownerEditData.phone, whatsapp: ownerEditData.whatsapp, city: ownerEditData.city }).eq('id', ownerAcc.id); setOwnerAcc({ ...ownerAcc, shop_name: ownerEditData.shopName, owner_name: ownerEditData.ownerName, phone: ownerEditData.phone, whatsapp: ownerEditData.whatsapp, city: ownerEditData.city }); setOwnerEditOpen(false); showToast(t.profileUpdated); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.saveProfile}</button>
                    <div className="border-t border-slate-100 pt-3">
                      <button onClick={() => { setOwnerEditOpen(false); deleteAccount('owner'); }}
                        className="w-full py-2.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-wide transition">
                        🗑 Delete My Account
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-1.5">Permanently deletes your account & listings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Owner Booking Detail Modal */}
          {ownerSelectedBooking && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="font-black text-slate-900">{t.bookingDetails}</h3><button onClick={() => setOwnerSelectedBooking(null)} className="text-slate-400 text-2xl hover:text-slate-700">×</button></div>
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Vehicle header */}
                  <div className="flex gap-4">
                    <img src={ownerSelectedBooking.vehicle_img || ''} className="w-24 h-16 sm:w-28 sm:h-20 rounded-xl object-cover flex-shrink-0" alt=""/>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{ownerSelectedBooking.vehicle_name || ''}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{ownerSelectedBooking.shop_name || ''} · {ownerSelectedBooking.location}</p>
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor(ownerSelectedBooking.status)}`}>{statusLabel(ownerSelectedBooking.status)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"><div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0">{([['Rental Period', `${ownerSelectedBooking.pickup_date || ''} → ${ownerSelectedBooking.return_date || ''}`], ['Pickup Time', (ownerSelectedBooking as any).pickup_time || '—'], ['Days', `${ownerSelectedBooking.days} day${ownerSelectedBooking.days > 1 ? 's' : ''}`], ['Pickup Type', (ownerSelectedBooking.delivery_type || 'pickup') === 'delivery' ? t.delivery : t.selfPickup], ['Rate', `Rs. ${(ownerSelectedBooking.price_per_day || 0).toLocaleString()} /day`], ...((ownerSelectedBooking.delivery_type || 'pickup') === 'delivery' ? [['Delivery Fee', 'Rs. 1,500']] : []), ['Customer Pays', `Rs. ${(ownerSelectedBooking.total || 0).toLocaleString()}`], ['Drivo Fee (10%)', `− Rs. ${((ownerSelectedBooking as any).platform_fee || Math.round((ownerSelectedBooking.total || 0) * 0.10)).toLocaleString()}`], ['✅ Your Payout', `Rs. ${((ownerSelectedBooking as any).owner_payout || Math.round((ownerSelectedBooking.total || 0) * 0.90)).toLocaleString()}`], ['Status', statusLabel(ownerSelectedBooking.status)], ['Booked On', ownerSelectedBooking.booked_at ? new Date(ownerSelectedBooking.booked_at).toLocaleDateString() : '']] as [string, string][]).map(([k, v]) => (<div key={k} className="flex justify-between px-4 py-2.5 text-xs border-b border-slate-100 last:border-0"><span className="text-slate-400 font-semibold">{k}</span><span className="font-black text-slate-900 text-right ml-2">{v}</span></div>))}</div></div>
                  {ownerSelectedBooking.customer_id && (<CustomerDetailCard customerId={ownerSelectedBooking.customer_id}/>)}
                  {ownerSelectedBooking.status === 'pending' && (<div className="flex gap-2"><button onClick={async () => { await updateBookingStatus(ownerSelectedBooking.id, 'confirmed'); setOwnerSelectedBooking(null); }} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wide transition">✓ Accept Booking</button><button onClick={async () => { if (!confirm('Decline this booking?')) return; await declineBooking(ownerSelectedBooking.id); setOwnerSelectedBooking(null); }} className="px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-xs uppercase transition">✕ Decline</button></div>)}
                  {ownerSelectedBooking.status === 'confirmed' && (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        <p className="text-xs font-black text-emerald-700 mb-1">🤝 Booking is Active</p>
                        <p className="text-[11px] text-emerald-600 leading-relaxed">
                          When you hand over the vehicle to the customer, click <strong>"Vehicle Given"</strong> to mark it as completed and free up your vehicle for new bookings.
                        </p>
                      </div>
                      <button onClick={async () => { await updateBookingStatus(ownerSelectedBooking.id, 'completed'); setOwnerSelectedBooking(null); }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-wide transition flex items-center justify-center gap-2">
                        🚗 Vehicle Given — Mark Complete
                      </button>
                      <button onClick={async () => { if(!confirm('Cancel this confirmed booking? Customer will be notified.')) return; await cancelBooking(ownerSelectedBooking.id, 'owner'); setOwnerSelectedBooking(null); }}
                        className="w-full py-2.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 rounded-xl font-black text-xs uppercase transition">
                        ✕ Cancel This Booking
                      </button>
                    </div>
                  )}
                  {(ownerSelectedBooking.status === 'completed' || ownerSelectedBooking.status === 'cancelled') && (<button onClick={async () => { if (!confirm('Remove this booking from history?')) return; await supabase.from('bookings').delete().eq('id', ownerSelectedBooking.id); if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id); setOwnerSelectedBooking(null); showToast('Booking removed from history'); }} className="w-full py-3 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 rounded-xl font-black text-xs uppercase transition">🗑 Remove from History</button>)}
                  <button onClick={() => setOwnerSelectedBooking(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">Close</button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

            {/* BOOKINGS TAB */}
            {ownerSubTab === 'bookings' && (
              <div className="space-y-3">
                {ownerBookings.length === 0 ? (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20"><p className="text-5xl mb-3">📬</p><p className="font-black text-slate-700">{t.noBookings}</p></div>
                ) : ownerBookings.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-3 p-4"><img src={b.vehicle_img || ''} className="w-20 h-14 rounded-xl object-cover flex-shrink-0" alt=""/><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-900 text-sm">{b.vehicle_name || ''}</p><p className="text-xs text-slate-400 mt-0.5">📅 {b.pickup_date || ''} → {b.return_date || ''} · {b.days}d</p><p className="text-xs text-slate-400">{(b.delivery_type || 'pickup') === 'delivery' ? '🚚 ' + t.delivery : '📍 ' + t.selfPickup} · <span className="font-black text-slate-900">Rs. {b.total.toLocaleString()}</span> · <span className="text-emerald-600 font-black">You get Rs. {((b as any).owner_payout || Math.round(b.total * 0.90)).toLocaleString()}</span></p></div><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border flex-shrink-0 ${statusColor(b.status)}`}>{statusLabel(b.status)}</span></div></div></div>
                    {b.status === 'pending' && (<div className="border-t border-slate-100 px-4 py-3 space-y-2"><div className="flex gap-2"><button onClick={() => updateBookingStatus(b.id, 'confirmed')} disabled={loadingBookingId === b.id} className={`flex-1 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-1.5 ${loadingBookingId === b.id && loadingAction === 'confirmed' ? 'bg-emerald-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'}`}>{loadingBookingId === b.id && loadingAction === 'confirmed' ? <><Spinner/>Processing...</> : <>✓ {t.accept}</>}</button><button onClick={async () => { if (!confirm('Decline this booking?')) return; await declineBooking(b.id); }} disabled={loadingBookingId === b.id} className={`px-5 py-2.5 border rounded-xl font-black text-xs uppercase transition flex items-center gap-1.5 ${loadingBookingId === b.id && loadingAction === 'decline' ? 'bg-red-100 border-red-200 text-red-400 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'}`}>{loadingBookingId === b.id && loadingAction === 'decline' ? <><Spinner className="border-red-400/30 border-t-red-500"/>...</> : <>✕ {t.decline}</>}</button><button onClick={() => setOwnerSelectedBooking(b)} className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase transition">Details</button></div><p className="text-[10px] text-slate-400 text-center">The customer will receive an SMS confirmation automatically when you accept</p></div>)}
                    {b.status === 'confirmed' && (
                      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                        {/* Info banner */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                          <span className="text-lg">🤝</span>
                          <div>
                            <p className="text-xs font-black text-emerald-700">Booking Confirmed!</p>
                            <p className="text-[10px] text-emerald-600">Vehicle handed over? Click "Vehicle Given" to complete the rental.</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateBookingStatus(b.id, 'completed')}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-1.5">
                            🚗 Vehicle Given — Complete
                          </button>
                          <button onClick={() => setOwnerSelectedBooking(b)}
                            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase transition">
                            Details
                          </button>
                          <button onClick={() => { if(confirm('Cancel this confirmed booking? Customer will be notified.')) cancelBooking(b.id, 'owner'); }}
                            className="px-3 py-2.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 rounded-xl font-black text-xs transition"
                            title="Cancel booking">
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                    {(b.status === 'completed' || b.status === 'cancelled') && (<div className="border-t border-slate-100 px-4 py-2.5 flex justify-end"><button onClick={() => setOwnerSelectedBooking(b)} className="text-xs font-black text-slate-500 hover:text-slate-900 transition">{t.bookingDetails} →</button></div>)}
                  </div>
                ))}
              </div>
            )}

            {/* EARNINGS TAB */}
            {ownerSubTab === 'earnings' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between"><h2 className="font-black text-slate-900 text-lg">💰 Earnings Overview</h2><div className="flex gap-1 bg-slate-100 rounded-xl p-1">{(['weekly', 'monthly', 'yearly'] as const).map(p => (<button key={p} onClick={() => setEarningsPeriod(p)} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition ${earningsPeriod === p ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}>{p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'Year'}</button>))}</div></div>
                {(() => {
                  const now = new Date();
                  const filtered = ownerBookings.filter(b => {
                    if (b.status !== 'completed') return false;
                    const d = new Date(b.booked_at || '');
                    if (earningsPeriod === 'weekly') { const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); return d >= weekAgo; }
                    else if (earningsPeriod === 'monthly') { return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
                    else { return d.getFullYear() === now.getFullYear(); }
                  });
                  const gross = filtered.reduce((s, b) => s + (b.total || 0), 0);
                  const fee = filtered.reduce((s, b) => s + ((b as any).platform_fee || Math.round((b.total || 0) * 0.10)), 0);
                  const payout = gross - fee;
                  const pending = ownerBookings.filter(b => b.status === 'pending').reduce((s, b) => s + (b.total || 0), 0);
                  const confirmed = ownerBookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.total || 0), 0);
                  return (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[{ label: 'Gross Revenue', value: `Rs. ${gross.toLocaleString()}`, icon: '📈', color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' }, { label: 'Drivo Fee (10%)', value: `Rs. ${fee.toLocaleString()}`, icon: '💳', color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' }, { label: 'Your Payout', value: `Rs. ${payout.toLocaleString()}`, icon: '💰', color: 'bg-slate-900 border-slate-900', text: 'text-white', labelText: 'text-slate-300' }, { label: 'Completed Rentals', value: filtered.length, icon: '✅', color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' }].map(s => (<div key={s.label} className={`${s.color} border rounded-2xl p-4`}><p className="text-xl mb-1">{s.icon}</p><p className={`text-xl font-black ${s.text}`}>{s.value}</p><p className={`text-xs font-semibold mt-0.5 ${(s as any).labelText || 'text-slate-500'}`}>{s.label}</p></div>))}</div>
                      <div className="grid grid-cols-2 gap-4"><div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><p className="text-lg mb-1">⏳</p><p className="text-lg font-black text-amber-700">Rs. {pending.toLocaleString()}</p><p className="text-xs text-amber-600 font-semibold">Pending approval</p></div><div className="bg-teal-50 border border-teal-200 rounded-2xl p-4"><p className="text-lg mb-1">🤝</p><p className="text-lg font-black text-teal-700">Rs. {(confirmed - fee).toLocaleString()}</p><p className="text-xs text-teal-600 font-semibold">Confirmed (incoming)</p></div></div>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><div className="px-5 py-4 border-b border-slate-100"><h3 className="font-black text-slate-900 text-sm">Completed Rentals — {earningsPeriod}</h3></div>{filtered.length === 0 ? (<div className="text-center py-12"><p className="text-3xl mb-2">📭</p><p className="text-sm font-black text-slate-500">No completed rentals this {earningsPeriod === 'weekly' ? 'week' : earningsPeriod === 'monthly' ? 'month' : 'year'}</p></div>) : (<div className="divide-y divide-slate-100">{filtered.map(b => (<div key={b.id} className="flex items-center gap-4 px-5 py-3"><img src={b.vehicle_img || ''} className="w-14 h-10 rounded-xl object-cover flex-shrink-0 bg-slate-100" alt=""/><div className="flex-1 min-w-0"><p className="font-black text-slate-900 text-sm">{b.vehicle_name}</p><p className="text-xs text-slate-400">{b.pickup_date} → {b.return_date} · {b.days}d</p></div><div className="text-right flex-shrink-0"><p className="font-black text-slate-900 text-sm">Rs. {((b as any).owner_payout || Math.round((b.total || 0) * 0.90)).toLocaleString()}</p><p className="text-[10px] text-slate-400">after 10% fee</p></div></div>))}</div>)}</div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* FLEET TAB */}
            {ownerSubTab === 'fleet' && (
              <>
                {(showAddForm || editingId) && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50"><h3 className="font-black text-slate-900">{editingId ? t.editVehicle : t.addNew}</h3><button onClick={() => { setShowAddForm(false); setEditingId(null); setPhotos([]); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-black text-xl transition">×</button></div>
                    <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.vehicleName} <span className="text-red-400">*</span></label><input required type="text" placeholder="e.g. Honda CB 150R" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition" value={newV.name} onChange={e => setNewV({ ...newV, name: e.target.value })}/></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.vehicleType}</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition" value={newV.type} onChange={e => setNewV({ ...newV, type: e.target.value })}><option value="car">🚙 {t.cars}</option><option value="van">🚐 Van</option><option value="bike">🏍️ {t.bikes}</option><option value="tuk">🛺 {t.tuks}</option></select></div>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">📍 District <span className="text-red-400">*</span></label><select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition" value={(newV as any).district || ownerAcc?.city || 'Colombo'} onChange={e => setNewV({ ...newV, district: e.target.value } as any)}>{SL_CITIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.transmission}</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer" value={newV.transmission} onChange={e => setNewV({ ...newV, transmission: e.target.value })}><option>{t.automatic}</option><option>{t.manual}</option></select></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.fuel}</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer" value={newV.fuel} onChange={e => setNewV({ ...newV, fuel: e.target.value })}><option>{t.petrol}</option><option>{t.hybrid}</option><option>{t.diesel}</option><option>{t.electric}</option></select></div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.priceDay} <span className="text-red-400">*</span></label><input type="number" required min="500" placeholder="e.g. 5000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300 placeholder:font-normal" value={newV.pricePerDay === '' ? '' : newV.pricePerDay} onChange={e => setNewV({ ...newV, pricePerDay: e.target.value === '' ? '' as any : Number(e.target.value) })}/></div>
                      </div>
                      <div>
                        {(() => {
                          const isBikeOrTuk = newV.type === 'bike' || newV.type === 'tuk';
                          const requiredCount = isBikeOrTuk ? 4 : 6;
                          const photoSlots = newV.type === 'bike'
                            ? [
                                { idx: 0, label: '📸 Cover Photo', hint: 'Best angle of bike', wide: true },
                                { idx: 1, label: '⬅️ Left Side', hint: 'Full left side' },
                                { idx: 2, label: '➡️ Right Side', hint: 'Full right side' },
                                { idx: 3, label: '🎛️ Dashboard', hint: 'Speedo & controls' },
                              ]
                            : newV.type === 'tuk'
                            ? [
                                { idx: 0, label: '📸 Cover Photo', hint: 'Best angle of tuk', wide: true },
                                { idx: 1, label: '🔜 Front View', hint: 'Straight front' },
                                { idx: 2, label: '📐 Side View', hint: 'Full side profile' },
                                { idx: 3, label: '🪑 Interior', hint: 'Passenger area' },
                              ]
                            : [
                                { idx: 0, label: '📸 Cover Photo', hint: 'Front + side angle', wide: true },
                                { idx: 1, label: '🔜 Front View', hint: 'Straight front' },
                                { idx: 2, label: '📐 Side View', hint: 'Full side profile' },
                                { idx: 3, label: '🔙 Rear View', hint: 'Back of vehicle' },
                                { idx: 4, label: '🪞 Dashboard', hint: 'Full dashboard' },
                                { idx: 5, label: '💺 Seats', hint: 'Front + rear seats' },
                              ];
                          const makeInput = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const r = new FileReader();
                            r.onloadend = () => setPhotos(prev => { const n = [...prev]; while (n.length <= idx) n.push(''); n[idx] = r.result as string; return n; });
                            r.readAsDataURL(file);
                          };
                          return (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Vehicle Photos ({requiredCount} Required)</label>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${photos.filter(Boolean).length < requiredCount ? 'bg-red-50 text-red-500 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{photos.filter(Boolean).length}/{requiredCount}</span>
                              </div>
                              {/* Cover photo wide */}
                              {photoSlots.filter(s => s.wide).map(slot => (
                                <div key={slot.idx} className="mb-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">{slot.label}</p>
                                    {photos[slot.idx] ? <span className="text-[9px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full">✓ Added</span> : <span className="text-[9px] text-red-500 font-black">Required</span>}
                                  </div>
                                  <label className="block cursor-pointer">
                                    <div className={`relative w-full aspect-[16/7] rounded-2xl overflow-hidden border-2 transition ${photos[slot.idx] ? 'border-emerald-400' : 'border-dashed border-red-300 hover:border-red-400 bg-slate-50'}`}>
                                      {photos[slot.idx] ? (<><img src={photos[slot.idx]} className="w-full h-full object-cover" alt="Cover"/><button type="button" onClick={e => { e.preventDefault(); removePhoto(slot.idx); }} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm font-black flex items-center justify-center">×</button></>) : (<div className="flex flex-col items-center justify-center h-full pointer-events-none"><p className="text-4xl mb-2">📸</p><p className="text-sm font-black text-slate-600">{slot.hint}</p></div>)}
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={makeInput(slot.idx)}/>
                                  </label>
                                </div>
                              ))}
                              {/* Other photos grid */}
                              <div className={`grid gap-2 ${photoSlots.filter(s => !s.wide).length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {photoSlots.filter(s => !s.wide).map(slot => (
                                  <div key={slot.idx}>
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-[9px] font-black text-slate-600">{slot.label}</p>
                                      {photos[slot.idx] ? <span className="text-[8px] text-emerald-600 font-black">✓</span> : <span className="text-[8px] text-red-400">req</span>}
                                    </div>
                                    <label className="block cursor-pointer">
                                      <div className={`relative aspect-video rounded-xl overflow-hidden border-2 transition ${photos[slot.idx] ? 'border-emerald-400' : 'border-dashed border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                                        {photos[slot.idx] ? (<><img src={photos[slot.idx]} className="w-full h-full object-cover" alt={slot.label}/><button type="button" onClick={e => { e.preventDefault(); removePhoto(slot.idx); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">×</button></>) : (<div className="flex flex-col items-center justify-center h-full pointer-events-none py-2"><p className="text-lg">📷</p><p className="text-[9px] text-slate-400 font-bold text-center px-1">{slot.hint}</p></div>)}
                                      </div>
                                      <input type="file" accept="image/*" className="hidden" onChange={makeInput(slot.idx)}/>
                                    </label>
                                  </div>
                                ))}
                              </div>
                              {/* Helmet option — bikes only */}
                              {newV.type === 'bike' && (
                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                                  <input type="checkbox" id="helmetCheck" checked={(newV as any).helmetIncluded || false} onChange={e => setNewV({ ...newV, helmetIncluded: e.target.checked } as any)} className="w-4 h-4 accent-slate-900 cursor-pointer flex-shrink-0"/>
                                  <label htmlFor="helmetCheck" className="cursor-pointer">
                                    <p className="text-xs font-black text-amber-800">🪖 Helmet Included with this Bike</p>
                                    <p className="text-[10px] text-amber-600 mt-0.5">Tick if you provide a helmet to the renter</p>
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">📍 Pickup Location — Google Maps Link <span className="text-red-400">*</span></label>
                        <input type="url" required
                          placeholder="Paste your Google Maps link here..."
                          className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:bg-white transition placeholder:text-slate-300 ${newV.mapLink ? 'border-emerald-400 focus:border-emerald-500' : 'border-red-300 focus:border-slate-900'}`}
                          value={newV.mapLink}
                          onChange={e => setNewV({ ...newV, mapLink: e.target.value })}
                        />
                        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 space-y-1">
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide">How to get your Google Maps link:</p>
                          <p className="text-[11px] text-blue-600">1. Open <strong>Google Maps</strong> on your phone or PC</p>
                          <p className="text-[11px] text-blue-600">2. Search your pickup location (shop, road, landmark)</p>
                          <p className="text-[11px] text-blue-600">3. Tap <strong>Share</strong> → Copy link → Paste above</p>
                          {newV.mapLink && (
                            <a href={newV.mapLink} target="_blank" rel="noopener noreferrer"
                              className="inline-block mt-1 text-[11px] font-black text-emerald-600 hover:text-emerald-700 underline">
                              ✅ Preview your location →
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">📄 Revenue Licence Expiry</label><input type="date" className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white transition cursor-pointer ${(newV as any).revenueLicenceExpiry && new Date((newV as any).revenueLicenceExpiry) < new Date() ? 'border-red-400 bg-red-50 text-red-600' : (newV as any).revenueLicenceExpiry ? 'border-emerald-400 text-slate-800' : 'border-slate-200 text-slate-800'}`} value={(newV as any).revenueLicenceExpiry || ''} onChange={e => setNewV({ ...newV, revenueLicenceExpiry: e.target.value } as any)} style={{ colorScheme: 'light' }}/></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🛡️ Insurance Expiry</label><input type="date" className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white transition cursor-pointer ${(newV as any).insuranceExpiry && new Date((newV as any).insuranceExpiry) < new Date() ? 'border-red-400 bg-red-50 text-red-600' : (newV as any).insuranceExpiry ? 'border-emerald-400 text-slate-800' : 'border-slate-200 text-slate-800'}`} value={(newV as any).insuranceExpiry || ''} onChange={e => setNewV({ ...newV, insuranceExpiry: e.target.value } as any)} style={{ colorScheme: 'light' }}/></div>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.description}</label><textarea rows={2} placeholder="AC, helmet, insurance..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition resize-none" value={newV.description} onChange={e => setNewV({ ...newV, description: e.target.value })}/></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">📆 Weekly Price (Rs.)</label><input type="number" min="0" placeholder="0 = N/A" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition" value={(newV as any).weeklyPrice === 0 ? '' : (newV as any).weeklyPrice} onChange={e => setNewV({ ...newV, weeklyPrice: e.target.value === '' ? '' as any : Number(e.target.value) } as any)} placeholder="e.g. 30000" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🗓️ Monthly Price (Rs.)</label><input type="number" min="0" placeholder="0 = N/A" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition" value={(newV as any).monthlyPrice === 0 ? '' : (newV as any).monthlyPrice} onChange={e => setNewV({ ...newV, monthlyPrice: e.target.value === '' ? '' as any : Number(e.target.value) } as any)} placeholder="e.g. 100000" /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🛣️ KM/Day</label><input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition" value={(newV as any).kmPerDay === 0 ? '' : (newV as any).kmPerDay} onChange={e => setNewV({ ...newV, kmPerDay: e.target.value === '' ? '' as any : Number(e.target.value) } as any)} placeholder="e.g. 200" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">⚡ Extra KM (Rs.)</label><input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition" value={(newV as any).extraKmCharge === 0 ? '' : (newV as any).extraKmCharge} onChange={e => setNewV({ ...newV, extraKmCharge: e.target.value === '' ? '' as any : Number(e.target.value) } as any)} placeholder="e.g. 50" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🔐 Deposit (Rs.)</label><input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition" value={(newV as any).depositAmount} onChange={e => setNewV({ ...newV, depositAmount: e.target.value === '' ? '' as any : Number(e.target.value) } as any)} placeholder="0 = no deposit" /></div>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">🚚 Delivery Option</label><div className="grid grid-cols-3 gap-2">{([['pickup_only', '📍 Self Pickup Only', 'Customer comes to you'], ['delivery_only', '🚚 Delivery Only', 'You deliver'], ['both', '✅ Both Options', 'Customer chooses']] as [string, string, string][]).map(([val, label, note]) => (<button key={val} type="button" onClick={() => setNewV({ ...newV, deliveryOption: val } as any)} className={`py-2.5 px-2 rounded-xl border text-center transition ${(newV as any).deliveryOption === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'}`}><p className="text-xs font-black">{label}</p><p className="text-[10px] opacity-60 mt-0.5">{note}</p></button>))}</div></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">🧑‍✈️ Driver Option</label><div className="grid grid-cols-3 gap-2">{([['self_drive', '🚗 Self Drive', 'Customer drives'], ['with_driver', '🧑‍✈️ With Driver', 'Driver included'], ['both', '✅ Both Options', 'Customer chooses']] as [string, string, string][]).map(([val, label, note]) => (<button key={val} type="button" onClick={() => setNewV({ ...newV, driverOption: val })} className={`py-2.5 px-2 rounded-xl border text-center transition ${(newV as any).driverOption === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'}`}><p className="text-xs font-black">{label}</p><p className="text-[10px] opacity-60 mt-0.5">{note}</p></button>))}</div></div>
                      <div className="flex gap-3"><button type="button" onClick={() => { setShowAddForm(false); setEditingId(null); setPhotos([]); }} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition">{t.cancel}</button><button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wide transition shadow-md">{editingId ? t.saveChanges : t.publishLive}</button></div>
                    </form>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-4"><h3 className="font-black text-slate-800 text-base">{t.yourFleet}</h3><span className="text-xs font-bold text-slate-500">{ownerFleet.filter(v => vAvail(v)).length} {t.live} · {ownerFleet.filter(v => !vAvail(v)).length} {t.hidden}</span></div>
                  {ownerFleet.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20"><p className="text-5xl mb-3">🚗</p><p className="font-black text-slate-700">{t.noVehicles}</p><button onClick={() => setShowAddForm(true)} className="mt-5 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.addFirst}</button></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{ownerFleet.map(v => (<div key={v.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition ${vAvail(v) ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}><div className="relative aspect-[16/9] bg-slate-100 overflow-hidden"><img src={v.image} alt={v.name} className="w-full h-full object-cover"/><div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm ${vAvail(v) ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}`}>{vAvail(v) ? t.liveLabel : t.hiddenLabel}</div><div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-black">{typeIcon(v.type)}</div></div><div className="p-4"><div className="flex items-start justify-between gap-2 mb-1"><h4 className="font-black text-slate-900 text-sm leading-tight">{v.name}</h4><div className="text-right flex-shrink-0"><p className="font-black text-slate-900 text-sm">Rs.{vPrice(v).toLocaleString()}</p><p className="text-[10px] text-emerald-600 font-bold">You get Rs.{Math.round(vPrice(v) * 0.90).toLocaleString()}/day</p></div></div><p className="text-xs text-slate-400 mb-1">{v.transmission} · {v.fuel} · {v.location}</p><div className="flex gap-2 pt-3 border-t border-slate-100"><button onClick={() => toggleAvail(v.id)} className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-wide border transition ${vAvail(v) ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>{vAvail(v) ? t.hide : t.goLive}</button><button onClick={() => { setEditingId(v.id); setShowAddForm(false); setNewV({ name: v.name, type: v.type, transmission: v.transmission, fuel: v.fuel, pricePerDay: vPrice(v), description: v.description || '', mapLink: (v as any).mapLink || '', weeklyPrice: (v as any).weekly_price || '' as any, monthlyPrice: (v as any).monthly_price || '' as any, kmPerDay: (v as any).km_per_day || 200, extraKmCharge: (v as any).extra_km_charge || 50, depositAmount: (v as any).deposit_amount || 0, driverOption: (v as any).driver_option || 'self_drive', district: v.location || '', deliveryOption: (v as any).delivery_option || 'both', revenueLicenceExpiry: (v as any).revenue_licence_expiry || '', insuranceExpiry: (v as any).insurance_expiry || '' }); setPhotos(v.images && v.images.length > 0 ? [...v.images] : [v.image]); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 py-2 rounded-xl font-black text-[11px] uppercase border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition">Edit</button><button onClick={() => deleteVehicle(v.id)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition">🗑</button></div>
                          {/* Calendar toggle */}
                          <details className="border-t border-slate-100 pt-3 mt-1">
                            <summary className="text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition list-none flex items-center gap-1.5">
                              <span>📅 Availability Calendar</span>
                            </summary>
                            <div className="mt-3">
                              <VehicleCalendar vehicleId={v.id} ownerId={ownerAcc?.id} isOwner={true} />
                            </div>
                          </details>
                        </div></div>))}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* HOME + DETAIL */}
      {(view === 'home' || view === 'detail') && (
        <>
          {view === 'home' && (
            <>
              <header className="relative bg-slate-900 text-white pt-14 pb-12 px-4 text-center overflow-hidden">
                <HeroBgSlider />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/50 to-slate-900/90 pointer-events-none"/>
                <div className="relative max-w-7xl mx-auto flex items-center gap-8">
                  {/* Left — text */}
                  <div className="flex-1 space-y-3 pointer-events-none">
                    <span className="inline-block text-xs bg-white/10 border border-white/20 text-white/80 font-bold px-3 py-1 rounded-full">🇱🇰 Sri Lanka's #1 Vehicle Rental Platform</span>
                    <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-tight">Rent cars, bikes &<br className="hidden sm:block"/> tuk-tuks in<br className="hidden sm:block"/> Sri Lanka</h1>
                    <p className="text-slate-300 text-sm md:text-base font-medium">Verified hubs · No hidden fees · Book in 60 seconds</p>
                  <HeroStats />
                  </div>


                </div>
              </header>
              <div className="bg-white border-b border-slate-200 shadow-md">
                <div className="max-w-6xl mx-auto px-4 py-4">
                  <div className="grid grid-cols-2 md:flex gap-2">
                    {[
                      { label: t.cityLoc, el: <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none">{SL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select> },
                      { label: t.vehicleType, el: <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none"><option value="all">{t.allTypes}</option><option value="car">🚙 {t.cars}</option><option value="van">🚐 Van</option><option value="bike">🏍️ {t.bikes}</option><option value="tuk">🛺 {t.tuks}</option></select> },
                      { label: t.pickupDate, el: <input type="date" value={filterPickup} onChange={e => setFilterPickup(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none" style={{ colorScheme: 'light' }}/> },
                      { label: t.returnDate, el: <input type="date" value={filterReturn} onChange={e => setFilterReturn(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none" style={{ colorScheme: 'light' }}/> },
                    ].map(f => (<div key={f.label} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 hover:border-slate-400 focus-within:border-red-400 rounded-xl px-4 py-3 transition"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1.5">{f.label}</p>{f.el}</div>))}
                    <button onClick={() => showToast(`${displayed.length} ${t.vehicles} ${t.available}${filterCity !== 'All Sri Lanka' ? ' in ' + filterCity : ''}`, 'ok')} className="flex-none bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black rounded-xl px-8 py-3 text-sm uppercase tracking-wide transition shadow-md flex items-center gap-2 whitespace-nowrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>{t.search}</button>
                  </div>
                </div>
              </div>
              <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
                  <button onClick={() => setShowAdvFilter(!showAdvFilter)} className={`flex items-center gap-2 text-xs font-black px-3 py-2 rounded-xl border transition ${showAdvFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'}`}>⚙️ Advanced Filters {showAdvFilter ? '▲' : '▼'}</button>
                  {(filterPriceMax < 50000 || filterTrans !== 'all' || filterFuel !== 'all') && (<button onClick={() => { setFilterPriceMin(0); setFilterPriceMax(50000); setFilterTrans('all'); setFilterFuel('all'); }} className="text-xs font-bold text-red-500 hover:text-red-700 transition">Clear filters ×</button>)}
                </div>
                {showAdvFilter && (<div className="max-w-6xl mx-auto px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3"><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Min Price (Rs.)</label><input type="number" min="0" max="50000" step="500" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900 transition" value={filterPriceMin || ''} placeholder="0" onChange={e => setFilterPriceMin(Number(e.target.value) || 0)}/></div><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Max Price (Rs.)</label><input type="number" min="0" max="100000" step="500" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900 transition" value={filterPriceMax === 50000 ? '' : filterPriceMax} placeholder="Any" onChange={e => setFilterPriceMax(Number(e.target.value) || 50000)}/></div><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Transmission</label><select value={filterTrans} onChange={e => setFilterTrans(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition"><option value="all">Any</option><option value="automatic">Automatic</option><option value="manual">Manual</option></select></div><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fuel Type</label><select value={filterFuel} onChange={e => setFilterFuel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition"><option value="all">Any</option><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option></select></div><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">🧑‍✈️ Driver</label><select value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition"><option value="all">Any</option><option value="self_drive">Self Drive</option><option value="with_driver">With Driver</option></select></div></div>)}
              </div>
              <NearbyVehiclesSection allVehicles={allVehicles} onVehicleClick={(v) => { setSelectedVehicle(v); setView('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>
              <section className="max-w-7xl mx-auto px-4 pt-5 pb-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[{ label: t.allDeals, city: 'All Sri Lanka', type: 'all' }, { label: '🚙 ' + t.cars, city: 'All Sri Lanka', type: 'car' }, { label: '🏍️ ' + t.bikes, city: 'All Sri Lanka', type: 'bike' }, { label: '🚐 Vans', city: 'All Sri Lanka', type: 'van' }, { label: '🛺 ' + t.tuks, city: 'All Sri Lanka', type: 'tuk' }, { label: '📍 Colombo', city: 'Colombo', type: 'all' }, { label: '📍 Galle', city: 'Galle', type: 'all' }, { label: '📍 Kandy', city: 'Kandy', type: 'all' }, { label: '📍 Gampaha', city: 'Gampaha', type: 'all' }, { label: '📍 Matara', city: 'Matara', type: 'all' }, { label: '📍 Negombo', city: 'Negombo', type: 'all' }, { label: '📍 Jaffna', city: 'Jaffna', type: 'all' }, { label: '📍 Trincomalee', city: 'Trincomalee', type: 'all' }, { label: '📍 Batticaloa', city: 'Batticaloa', type: 'all' }, { label: '📍 Anuradhapura', city: 'Anuradhapura', type: 'all' }, { label: '📍 Ella/Badulla', city: 'Badulla', type: 'all' }, { label: '📍 Nuwara Eliya', city: 'Nuwara Eliya', type: 'all' }, { label: '📍 Ratnapura', city: 'Ratnapura', type: 'all' }, { label: '📍 Hambantota', city: 'Hambantota', type: 'all' }].map(tag => (<button key={tag.label} onClick={() => { setFilterCity(tag.city); setFilterType(tag.type); }} className={`text-xs font-bold border px-4 py-2 rounded-xl whitespace-nowrap transition ${filterCity === tag.city && filterType === tag.type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>{tag.label}</button>))}
                </div>
              </section>
              <section className="max-w-7xl mx-auto px-4 mt-2 mb-24">
                <h2 className="text-xl font-black text-slate-900 mb-5"><span className="text-red-500">{displayed.length}</span> {t.vehicles} {t.available}{filterCity !== 'All Sri Lanka' ? ` in ${filterCity}` : ''}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                  {displayed.map(v => (
                    <article key={v.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer" onClick={() => { setSelectedVehicle(v); setView('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden"><img src={v.image} alt={v.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onClick={e => { e.stopPropagation(); const allImgs = (v as any).images?.filter(Boolean) || [v.image].filter(Boolean); if (allImgs.length > 0) setLightbox({ imgs: allImgs, idx: 0 }); }}/>{(v as any).owner_verified === true && (<span className="absolute top-2 left-2 bg-blue-600 text-white text-[11px] w-6 h-6 rounded-full shadow flex items-center justify-center">✅</span>)}<div className="absolute top-3 right-3 flex items-center gap-1.5"><button onClick={e => { e.stopPropagation(); toggleWishlist(v.id); }} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${wishlist.includes(v.id) ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-400 hover:text-red-500'}`}>{wishlist.includes(v.id) ? '❤️' : '🤍'}</button><span className="text-lg">{typeIcon(v.type)}</span></div></div>
                      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between"><div><div className="flex items-center gap-1.5 mb-2 flex-wrap"><span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{v.transmission}</span><span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{v.fuel}</span>{(v as any).driver_option === 'with_driver' && <span className="text-[9px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 uppercase">🧑‍✈️ Driver</span>}{(v as any).driver_option === 'both' && <span className="text-[9px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 uppercase">🧑‍✈️ Optional</span>}<span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase ml-auto">{v.location}</span></div><h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-red-500 transition-colors">{v.name}</h3><p className="text-xs text-slate-400 mt-1">{vShop(v)}</p></div><div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100"><div><span className="text-sm font-black text-slate-900">{fmt(vPrice(v))}</span><span className="text-[10px] text-slate-400 font-bold ml-1">/{t.perDay.toLowerCase()}</span></div><div className="flex items-center gap-1">{(v.rating && v.rating > 0) ? (<><span className="text-amber-400 text-xs">★</span><span className="text-xs font-bold text-slate-700">{v.rating.toFixed(1)}</span></>) : (<span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">New</span>)}</div></div></div>
                    </article>
                  ))}
                  {displayed.length === 0 && (<div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200"><p className="text-5xl mb-4">🚗</p><p className="text-base font-black text-slate-700">{filterCity !== 'All Sri Lanka' || filterType !== 'all' ? t.noVehiclesFound : 'No vehicles listed yet'}</p><p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">{filterCity !== 'All Sri Lanka' || filterType !== 'all' ? <button onClick={() => { setFilterCity('All Sri Lanka'); setFilterType('all'); }} className="text-red-500 underline font-bold">{t.clearFilters}</button> : 'Vehicle owners can list their cars, bikes & tuk-tuks via Partner Hub'}</p></div>)}
                </div>
              </section>
              <LiveStatsSection />
              <PartnerLeaderboard />
              <FaqSection />
              <section className="bg-white py-16 px-4 border-t border-slate-100">
                <div className="max-w-5xl mx-auto">
                  <div className="text-center mb-12"><span className="text-xs font-black text-red-500 uppercase tracking-widest">All Inclusive with Drivo</span><h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">Why Book with Us?</h2><p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">Every vehicle on Drivo is verified. Simply book, show up, and enjoy your ride.</p></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">{[{ icon: '✅', title: 'Verified Vehicles', desc: 'Every car, bike & tuk-tuk is inspected and verified by our team' }, { icon: '🛡️', title: 'Secure Booking', desc: 'NIC & license verified renters. Your vehicle is in safe hands' }, { icon: '💬', title: 'WhatsApp Support', desc: 'Direct contact with the shop. 24/7 communication guaranteed' }, { icon: '🗺️', title: 'GPS Pickup Location', desc: 'Every listing has a Google Maps pin. No confusion at pickup' }, { icon: '🚗', title: 'Cars, Bikes & Tuk-tuks', desc: 'Sri Lanka largest multi-vehicle rental marketplace' }, { icon: '💸', title: 'No Hidden Fees', desc: 'Transparent pricing. Only a 10% booking fee, nothing more' }, { icon: '🇱🇰', title: 'Support Local', desc: 'Every booking supports a local Sri Lankan vehicle owner' }, { icon: '⚡', title: 'Book in 60 Seconds', desc: 'Pick dates, select time, confirm. Instant booking request sent' }].map(item => (<div key={item.title} className="text-center group"><div className="w-16 h-16 bg-slate-50 border-2 border-slate-100 group-hover:border-red-200 group-hover:bg-red-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 transition-all duration-300">{item.icon}</div><h3 className="font-black text-slate-900 text-sm mb-1">{item.title}</h3><p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p></div>))}</div>
                  <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">{[{ num: '100%', label: 'Verified Listings' }, { num: '60s', label: 'Average Booking Time' }, { num: '0', label: 'Hidden Charges' }, { num: '24/7', label: 'WhatsApp Support' }].map(s => (<div key={s.label} className="bg-slate-900 rounded-2xl p-5 text-center"><p className="text-2xl font-black text-white">{s.num}</p><p className="text-xs text-slate-400 mt-1 font-semibold">{s.label}</p></div>))}</div>
                </div>
              </section>
              <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 pt-14 pb-8 px-4">
                <div className="max-w-6xl mx-auto">
                  {/* Top section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

                    {/* Brand */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5">
                        <DrivoLogo className="w-9 h-9"/>
                        <span className="text-white font-black text-xl tracking-tight">drivo</span>
                        <span className="text-[9px] bg-white text-slate-900 font-black px-1.5 py-0.5 rounded uppercase">LK</span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                        Sri Lanka's #1 vehicle rental marketplace. Rent verified cars, bikes & tuk-tuks island-wide.
                      </p>
                      {/* Social Media */}
                      <div className="flex items-center gap-3 pt-1">
                        {/* Facebook */}
                        <a href="https://www.facebook.com/share/1Ej3syDQw9/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 bg-slate-800 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-200 group">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400 group-hover:text-white transition">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                          </svg>
                        </a>
                        {/* Instagram */}
                        <a href="https://www.instagram.com/drivo_lk?igsh=azAxcXcxemc1ODVy" target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 bg-slate-800 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 rounded-xl flex items-center justify-center transition-all duration-200 group">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-white transition">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                          </svg>
                        </a>
                        {/* WhatsApp */}
                        <a href="https://wa.me/94767868513" target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 bg-slate-800 hover:bg-[#25D366] rounded-xl flex items-center justify-center transition-all duration-200 group">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400 group-hover:text-white transition">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.098.546 4.07 1.5 5.787L0 24l6.396-1.676A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.487-5.187-1.34l-.371-.22-3.8.996 1.013-3.695-.241-.381A9.938 9.938 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                      <p className="text-white font-black text-sm uppercase tracking-wider">Quick Links</p>
                      <div className="space-y-2.5">
                        {[
                          { label: '🚙 Rent a Car', href: '/?type=car' },
                          { label: '🏍️ Rent a Bike', href: '/?type=bike' },
                          { label: '🚐 Rent a Van', href: '/?type=van' },
                          { label: '🛺 Rent a Tuk-Tuk', href: '/?type=tuk' },
                          { label: '🔑 Partner Login', href: '#partner' },
                        ].map(l => (
                          <a key={l.label} href={l.href}
                            className="block text-sm text-slate-400 hover:text-white transition-colors">
                            {l.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                      <p className="text-white font-black text-sm uppercase tracking-wider">Contact Us</p>
                      <div className="space-y-3">
                        <a href="mailto:admin@drivo.lk" className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group">
                          <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-slate-700 transition">✉️</span>
                          admin@drivo.lk
                        </a>
                        <a href="https://wa.me/94767868513" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors group">
                          <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-slate-700 transition">📱</span>
                          +94 76 786 8513
                        </a>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">🇱🇰</span>
                          Sri Lanka — Island-wide
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">⏰</span>
                          <span className="text-slate-400">Support: <span className="text-emerald-400 font-bold">24/7 WhatsApp</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-800 pt-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-slate-600">© 2026 Drivo LK — Sri Lanka's Vehicle Rental Marketplace</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>🔒 Secure & Verified</span>
                        <span>·</span>
                        <span>No Hidden Fees</span>
                        <span>·</span>
                        <span>Book in 60 Seconds</span>
                      </div>
                    </div>
                  </div>
                </div>
              </footer>
            </>
          )}

          {view === 'detail' && selectedVehicle && (
            <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-24">
              <button onClick={() => { setView('home'); setSelectedVehicle(null); setBookingDone(false); }} className="text-sm font-bold text-slate-500 hover:text-red-500 mb-6 flex items-center gap-1.5 transition group"><span className="group-hover:-translate-x-1 transition-transform">←</span> {t.backToAll}</button>
              {bookingDone ? (
                <div className="max-w-lg mx-auto py-10 relative">
                  {/* Confetti canvas */}
                  <canvas id="confetti-canvas" className="fixed inset-0 pointer-events-none z-[500]" style={{ width: '100vw', height: '100vh' }}/>

                  {/* Celebration card */}
                  <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                    {/* Top gradient banner */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-center relative overflow-hidden">
                      {/* Background decorative circles */}
                      <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-16 -translate-y-16"/>
                      <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-20 translate-y-20"/>
                      <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2"/>

                      {/* Animated checkmark */}
                      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                        <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"/>
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      </div>

                      <h2 className="text-3xl font-black text-white mb-2">Booking Confirmed! 🎉</h2>
                      <p className="text-slate-300 text-sm">Your ride is locked in. Get ready for the road!</p>

                      {/* Vehicle name pill */}
                      <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mt-4">
                        <span className="text-white font-black text-sm">{selectedVehicle.name}</span>
                        <span className="text-slate-400 text-xs">· {vShop(selectedVehicle)}</span>
                      </div>
                    </div>

                    {/* Booking details */}
                    <div className="px-6 py-5 space-y-4">
                      {/* Key info grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { icon: '📅', label: 'Pickup', value: filterPickup || '—' },
                          { icon: '⏰', label: 'Time', value: pickupTime },
                          { icon: '🗓️', label: 'Duration', value: `${days} day${days > 1 ? 's' : ''}` },
                        ].map(item => (
                          <div key={item.label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                            <p className="text-xl mb-1">{item.icon}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{item.label}</p>
                            <p className="text-xs font-black text-slate-900 mt-0.5">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Total amount */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Total to Pay at Pickup</p>
                          <p className="text-2xl font-black text-emerald-700 mt-0.5">Rs. {Math.round(total * 0.90).toLocaleString()}</p>
                        </div>
                        <div className="text-3xl">💳</div>
                      </div>

                      {/* Steps */}
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 space-y-3">
                        <p className="text-xs font-black text-blue-700 uppercase tracking-wide">What happens next?</p>
                        {[
                          { step: '1', text: `${vShop(selectedVehicle)} will confirm via WhatsApp within 30 mins`, icon: '💬' },
                          { step: '2', text: 'Pay at pickup — cash or bank transfer', icon: '💰' },
                          { step: '3', text: 'Show your booking & valid driving license', icon: '🪪' },
                        ].map(s => (
                          <div key={s.step} className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0">{s.icon}</span>
                            <p className="text-xs text-blue-700 leading-relaxed">{s.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Contact buttons */}
                      <OwnerContactButtons vehicleId={selectedVehicle.id} ownerId={selectedVehicle.owner_id} mapLink={vMap(selectedVehicle)} vehicleName={selectedVehicle.name}/>

                      {sessionRole === 'customer' && (
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-emerald-500">✓</span>
                          <p className="text-xs text-emerald-600 font-bold">Saved to your booking history</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {sessionRole === 'customer' && (
                          <button onClick={() => setView('custDash')}
                            className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-sm transition">
                            📋 My Bookings
                          </button>
                        )}
                        <button onClick={resetToHome}
                          className={`py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm transition ${sessionRole !== 'customer' ? 'col-span-2' : ''}`}>
                          🏠 Back to Home
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confetti script */}
                  <script dangerouslySetInnerHTML={{ __html: `
                    (function() {
                      const canvas = document.getElementById('confetti-canvas');
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      canvas.width = window.innerWidth;
                      canvas.height = window.innerHeight;
                      const pieces = [];
                      const colors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
                      for (let i = 0; i < 150; i++) {
                        pieces.push({
                          x: Math.random() * canvas.width,
                          y: Math.random() * canvas.height - canvas.height,
                          w: Math.random() * 10 + 5,
                          h: Math.random() * 6 + 3,
                          color: colors[Math.floor(Math.random() * colors.length)],
                          rotation: Math.random() * 360,
                          speed: Math.random() * 3 + 2,
                          spin: Math.random() * 6 - 3,
                          swing: Math.random() * 3,
                          swingSpeed: Math.random() * 0.05,
                          swingAngle: Math.random() * Math.PI * 2,
                          opacity: 1,
                        });
                      }
                      let frame = 0;
                      function draw() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        frame++;
                        let alive = false;
                        pieces.forEach(p => {
                          p.y += p.speed;
                          p.rotation += p.spin;
                          p.swingAngle += p.swingSpeed;
                          p.x += Math.sin(p.swingAngle) * p.swing;
                          if (frame > 120) p.opacity = Math.max(0, p.opacity - 0.008);
                          if (p.y < canvas.height + 20 && p.opacity > 0) alive = true;
                          ctx.save();
                          ctx.globalAlpha = p.opacity;
                          ctx.translate(p.x + p.w/2, p.y + p.h/2);
                          ctx.rotate(p.rotation * Math.PI / 180);
                          ctx.fillStyle = p.color;
                          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
                          ctx.restore();
                        });
                        if (alive) requestAnimationFrame(draw);
                        else canvas.style.display = 'none';
                      }
                      draw();
                    })();
                  ` }}/>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2"><span className="text-xl">{typeIcon(selectedVehicle.type)}</span><span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded border border-blue-100 uppercase">{selectedVehicle.type}</span><span className="text-xs text-amber-500 font-bold">★ {selectedVehicle.rating.toFixed(1)}</span></div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{selectedVehicle.name}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap"><p className="text-sm text-slate-500">{vShop(selectedVehicle)} · <span className="text-blue-600 font-medium">{selectedVehicle.location}</span></p>{(selectedVehicle as any).owner_verified && (<span className="inline-flex items-center gap-1 text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">✅ Verified Partner</span>)}</div>
                      <p className="text-xs text-slate-400 mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 inline-flex items-center gap-2">🔒 <span>Pickup location revealed after booking & payment</span></p>
                    </div>
                    {(() => {
                      const imgs = selectedVehicle.images && selectedVehicle.images.filter(Boolean).length > 0 ? selectedVehicle.images.filter(Boolean) : [selectedVehicle.image].filter(Boolean);
                      const labels = ['Cover', 'Front', 'Side', 'Rear', 'Dashboard', 'Seats'];
                      return (
                        <div className="space-y-3">
                          {imgs[0] && (<div className="relative aspect-[16/8] bg-slate-200 rounded-2xl overflow-hidden cursor-zoom-in group" onClick={() => setLightbox({ imgs, idx: 0 })}><img src={imgs[0]} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/><span className="absolute top-3 left-3 text-[10px] bg-slate-900/80 text-white font-black px-2.5 py-1 rounded-xl uppercase backdrop-blur-sm">Cover · Front & Side</span><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center"><span className="opacity-0 group-hover:opacity-100 transition bg-black/60 text-white text-xs font-black px-3 py-1.5 rounded-xl backdrop-blur-sm">🔍 View all {imgs.length} photos</span></div></div>)}
                          {imgs.slice(1, 4).length > 0 && (<div className="grid grid-cols-3 gap-2">{imgs.slice(1, 4).map((img, i) => (<div key={i} className="relative aspect-video bg-slate-200 rounded-xl overflow-hidden cursor-zoom-in group" onClick={() => setLightbox({ imgs, idx: i + 1 })}><img src={img} alt={labels[i + 1]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/><span className="absolute bottom-1.5 left-1.5 text-[8px] bg-black/60 text-white font-black px-1.5 py-0.5 rounded uppercase backdrop-blur-sm">{labels[i + 1]}</span></div>))}</div>)}
                          {imgs.slice(4, 6).length > 0 && (<div className="grid grid-cols-2 gap-2">{imgs.slice(4, 6).map((img, i) => (<div key={i} className="relative aspect-[4/3] bg-slate-200 rounded-xl overflow-hidden cursor-zoom-in group" onClick={() => setLightbox({ imgs, idx: i + 4 })}><img src={img} alt={labels[i + 4]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/><span className="absolute bottom-1.5 left-1.5 text-[8px] bg-black/60 text-white font-black px-1.5 py-0.5 rounded uppercase backdrop-blur-sm">{labels[i + 4]}</span></div>))}</div>)}
                        </div>
                      );
                    })()}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="flex border-b border-slate-200 bg-slate-50">{([['details', t.details], ['docs', t.documents], ['faq', t.faq]] as [string, string][]).map(([k, l]) => (<button key={k} onClick={() => setDetailTab(k as any)} className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition ${detailTab === k ? 'bg-white text-slate-900 border-b-2 border-red-500' : 'text-slate-400 hover:text-slate-700'}`}>{l}</button>))}</div>
                      <div className="p-5">
                        {detailTab === 'details' && (<div className="space-y-4"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">{([[t.transmission, selectedVehicle.transmission], [t.fuel, selectedVehicle.fuel], ['KM/Day', (selectedVehicle as any).km_per_day > 0 ? `${(selectedVehicle as any).km_per_day} km` : 'Unlimited'], ['Deposit', (selectedVehicle as any).deposit_amount > 0 ? `Rs. ${(selectedVehicle as any).deposit_amount.toLocaleString()}` : 'No deposit']] as [string, string][]).map(([l, v]) => (<div key={l} className="bg-slate-50 p-3 rounded-xl border border-slate-200"><p className="text-[10px] text-slate-400 font-bold uppercase">{l}</p><p className="font-bold text-sm text-slate-800 mt-0.5">{v}</p></div>))}</div>{(selectedVehicle as any).extra_km_charge > 0 && (selectedVehicle as any).km_per_day > 0 && (<p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200">🛣️ First <span className="font-bold">{(selectedVehicle as any).km_per_day} km/day</span> included · Extra km charged at <span className="font-bold">Rs. {(selectedVehicle as any).extra_km_charge}/km</span></p>)}{((selectedVehicle as any).weekly_price > 0 || (selectedVehicle as any).monthly_price > 0) && (<div className="grid grid-cols-2 gap-3">{(selectedVehicle as any).weekly_price > 0 && (<div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center"><p className="text-[10px] text-blue-400 font-black uppercase">Weekly Rate</p><p className="font-black text-blue-700 text-lg">Rs. {(selectedVehicle as any).weekly_price.toLocaleString()}</p><p className="text-[10px] text-blue-400">per week (7 days)</p></div>)}{(selectedVehicle as any).monthly_price > 0 && (<div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center"><p className="text-[10px] text-emerald-400 font-black uppercase">Monthly Rate</p><p className="font-black text-emerald-700 text-lg">Rs. {(selectedVehicle as any).monthly_price.toLocaleString()}</p><p className="text-[10px] text-emerald-400">per month (28 days)</p></div>)}</div>)}<p className="text-sm text-slate-600 leading-relaxed">{selectedVehicle.description}</p><VehicleReviews vehicleId={selectedVehicle.id}/></div>)}
                        {detailTab === 'docs' && (<div className="space-y-2 text-sm"><p className="font-bold text-slate-900 mb-3">Required at pickup:</p>{['National ID (NIC)', 'Valid Driving License', 'Phone for WhatsApp'].map(i => (<div key={i} className="flex items-center gap-2 text-slate-700"><span className="text-emerald-500 font-bold">✓</span>{i}</div>))}</div>)}
                        {detailTab === 'faq' && (<div className="space-y-3">{[['Is fuel included?', 'No — return with same level.'], ['Can I extend?', 'Yes — WhatsApp the shop.'], ['Security deposit?', 'Most vehicles: no deposit.']].map(([q, a]) => (<div key={q} className="bg-slate-50 p-3 rounded-xl border border-slate-200"><p className="font-bold text-slate-900 text-sm">{q}</p><p className="text-slate-500 mt-0.5 text-xs">{a}</p></div>))}</div>)}
                      </div>
                    </div>
                  </div>

                  {/* BOOKING SIDEBAR */}
                  <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4 lg:sticky lg:top-24">
                    <div className="flex items-baseline justify-between"><h3 className="font-black text-lg text-slate-900">{t.bookThisRide}</h3><span className="text-sm font-black text-red-500">{fmt(vPrice(selectedVehicle))}<span className="text-xs font-semibold text-slate-400">/{t.perDay.toLowerCase()}</span></span></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Rental Period</label><div className="grid grid-cols-3 gap-1.5">{([['daily', '📅 Daily', `Rs. ${(vPrice(selectedVehicle)).toLocaleString()}/day`], ['weekly', '📆 Weekly', (selectedVehicle as any).weekly_price > 0 ? `Rs. ${((selectedVehicle as any).weekly_price).toLocaleString()}/wk` : 'N/A'], ['monthly', '🗓️ Monthly', (selectedVehicle as any).monthly_price > 0 ? `Rs. ${((selectedVehicle as any).monthly_price).toLocaleString()}/mo` : 'N/A']] as [string, string, string][]).map(([val, label, price]) => (<button key={val} onClick={() => {
                          const newPeriod = val as 'daily'|'weekly'|'monthly';
                          setRentalPeriod(newPeriod);
                          // Immediately snap days to correct period
                          let newDays = days;
                          if (newPeriod === 'weekly') {
                            newDays = Math.max(7, Math.ceil(days / 7) * 7);
                          } else if (newPeriod === 'monthly') {
                            newDays = Math.max(28, Math.ceil(days / 28) * 28);
                          } else {
                            // daily — keep days as is, no reset
                            newDays = Math.max(1, days);
                          }
                          setDays(newDays);
                          // Sync return date
                          if (filterPickup) {
                            const p = new Date(filterPickup);
                            p.setDate(p.getDate() + newDays);
                            setFilterReturn(p.toISOString().split('T')[0]);
                          }
                        }} disabled={val === 'weekly' && !((selectedVehicle as any).weekly_price > 0) || val === 'monthly' && !((selectedVehicle as any).monthly_price > 0)} className={`py-2 rounded-xl border text-center transition disabled:opacity-40 disabled:cursor-not-allowed ${rentalPeriod === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}><p className="text-[11px] font-black">{label}</p><p className="text-[9px] opacity-70 mt-0.5">{price}</p></button>))}</div></div>
                    <div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.pickupDate}</label><input type="date" className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer" value={filterPickup} onChange={e => setFilterPickup(e.target.value)}/></div><div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.returnDate}</label><input type="date" className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer" value={filterReturn} onChange={e => setFilterReturn(e.target.value)}/></div></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t.duration}</label><div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50"><button onClick={() => {
                          if (rentalPeriod === 'weekly') setDays(d => Math.max(7, d - 7));
                          else if (rentalPeriod === 'monthly') setDays(d => Math.max(28, d - 28));
                          else setDays(d => Math.max(1, d - 1));
                        }} className="px-4 py-2.5 font-black hover:bg-slate-200 transition text-lg">−</button><span className="w-full text-center font-black text-sm text-slate-900">
                          {rentalPeriod === 'weekly'
                            ? `${Math.ceil(days / 7)} week${Math.ceil(days / 7) > 1 ? 's' : ''} (${days} days)`
                            : rentalPeriod === 'monthly'
                            ? `${Math.ceil(days / 28)} month${Math.ceil(days / 28) > 1 ? 's' : ''} (${days} days)`
                            : `${days} day${days > 1 ? 's' : ''}`}
                        </span><button onClick={() => {
                          if (rentalPeriod === 'weekly') setDays(d => d + 7);
                          else if (rentalPeriod === 'monthly') setDays(d => d + 28);
                          else setDays(d => d + 1);
                        }} className="px-4 py-2.5 font-black hover:bg-slate-200 transition text-lg">+</button></div></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">⏰ Pickup Time</label><div className="grid grid-cols-4 gap-1.5">{['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(ti => (<button key={ti} onClick={() => setPickupTime(ti)} className={`py-2 rounded-xl text-[11px] font-black border transition ${pickupTime === ti ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}>{ti}</button>))}</div><p className="text-[10px] text-slate-400 mt-1.5">Selected: <span className="font-black text-slate-700">{pickupTime}</span></p></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t.pickupMethod}</label>{(() => { const dOpt = (selectedVehicle as any).delivery_option || 'both'; if (dOpt === 'pickup_only') return (<div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"><p className="text-sm font-black text-slate-900">📍 {t.selfPickup}</p><p className="text-xs text-slate-400 mt-1">This vehicle is pickup only</p></div>); if (dOpt === 'delivery_only') return (<div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"><p className="text-sm font-black text-slate-900">🚚 {t.delivery}</p><p className="text-xs text-emerald-600 font-bold mt-1">+Rs. 1,500 delivery fee</p></div>); return (<div className="grid grid-cols-2 gap-2">{([['pickup', '📍 ' + t.selfPickup, 'Free'], ['delivery', '🚚 ' + t.delivery, '+Rs.1,500']] as [string, string, string][]).map(([val, label, note]) => (<button key={val} onClick={() => setDeliveryType(val as any)} className={`py-2.5 text-xs font-bold rounded-xl border transition ${deliveryType === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{label}<br/><span className="text-[10px] font-medium opacity-70">{note}</span></button>))}</div>); })()}</div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 font-semibold text-slate-600">
                      <div className="flex justify-between"><span>{fmt(periodInfo.price)} × {periodsCount} {periodInfo.unit}{periodsCount > 1 ? 's' : ''}</span><span className="font-bold text-slate-900">{fmt(base)}</span></div>
                      {deliveryType === 'delivery' && <div className="flex justify-between"><span>🚚 {t.delivery}</span><span className="font-bold">{fmt(delFee)}</span></div>}
                      <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200 text-slate-900"><span>Rental Total</span><span>{fmt(total)}</span></div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 space-y-1">
                        <div className="flex justify-between text-xs text-blue-600"><span>🔒 Booking fee (10%)</span><span className="font-black">{fmt(platformFeeAmt)}</span></div>
                        <div className="flex justify-between text-sm font-black text-blue-800 border-t border-blue-100 pt-1"><span>💳 Pay at pickup</span><span className="text-emerald-600">{fmt(total - platformFeeAmt)}</span></div>
                      </div>
                      {depositAmt > 0 && (<div className="flex justify-between text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"><span>🔐 Security Deposit (refundable)</span><span className="font-black">{fmt(depositAmt)}</span></div>)}
                      {(selectedVehicle as any).km_per_day > 0 && (<div className="text-[10px] text-slate-500 bg-slate-100 rounded-lg px-3 py-2 space-y-0.5"><p>🛣️ <span className="font-bold">{(selectedVehicle as any).km_per_day} km/day</span> included</p>{(selectedVehicle as any).extra_km_charge > 0 && <p>Extra km: <span className="font-bold">Rs. {(selectedVehicle as any).extra_km_charge}/km</span></p>}</div>)}
                    </div>
                    <button onClick={confirmBooking} disabled={bookingLoading} className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wide shadow-md transition flex items-center justify-center gap-2 ${bookingLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95'} text-white`}>{bookingLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Processing...</> : 'Confirm Booking →'}</button>
                    {/* Mobile sticky bottom bar */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 shadow-2xl">
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 font-semibold">{selectedVehicle?.name}</p>
                        <p className="font-black text-slate-900 text-sm">{fmt(total)} <span className="text-xs font-normal text-slate-400">· {days} day{days>1?'s':''}</span></p>
                      </div>
                      <button onClick={confirmBooking} disabled={bookingLoading}
                        className={`px-6 py-3 rounded-xl font-black text-sm text-white shadow-lg transition ${bookingLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95'}`}>
                        {bookingLoading ? '...' : 'Book Now →'}
                      </button>
                    </div>
                    <p className="text-[10px] text-center text-slate-400">{t.noPayment}</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
      {/* FLOATING WHATSAPP SUPPORT BUTTON */}
      {view === 'home' && <WhatsAppWidget />}
    </main>
  );
}