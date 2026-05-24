'use client';

import { useState, useEffect, useCallback } from 'react';
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

// ── Local types for UI state
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

// ── Helper: map DB vehicle to RawVehicle
function mapVehicle(v: any): RawVehicle {
  return {
    ...v,
    image: v.vehicle_photos?.[0]?.storage_url || '',
    images: v.vehicle_photos
      ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((p: any) => p.storage_url) || [],
    isAvailable: v.is_available,
    mapLink: v.map_link,
  };
}

// ── Vehicle Reviews Component
function VehicleReviews({ vehicleId }: { vehicleId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reviews?vehicle_id=eq.${vehicleId}&select=*,customers(first_name,last_name)&order=created_at.desc`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }
    }).then(r=>r.json()).then(data=>{ if(Array.isArray(data)) setReviews(data); });
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
              <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-black">
                {(r.customers?.first_name || 'A').charAt(0)}
              </div>
              <p className="text-xs font-black text-slate-700">{r.customers?.first_name || 'Anonymous'}</p>
            </div>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={`text-sm ${s <= r.rating ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
              ))}
            </div>
          </div>
          {r.comment && <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>}
          <p className="text-[10px] text-slate-400 mt-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
        </div>
      ))}
    </div>
  );
}

// ── FAQ Section Component
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
      { q: 'What is the Drivo booking fee?', a: 'Drivo charges a 10% booking fee on each rental. This fee is included in the displayed price — you do not pay extra. The shop receives 90% of the total, and Drivo earns 10%.' },
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

  const tabs: {key: typeof activeTab; label: string}[] = [
    { key: 'general',   label: 'General' },
    { key: 'booking',   label: 'Booking' },
    { key: 'price',     label: 'Pricing' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <section className="bg-white py-16 px-4 border-t border-slate-100">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm mt-2">Everything you need to know about renting with Drivo</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center flex-wrap mb-8">
          {tabs.map(tab=>(
            <button key={tab.key} onClick={()=>{ setActiveTab(tab.key); setOpenIdx(0); }}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide border transition ${activeTab===tab.key?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-2">
          {faqs[activeTab].map((item, idx)=>(
            <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button onClick={()=>setOpenIdx(openIdx===idx?null:idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition">
                <span className="font-black text-slate-900 text-sm pr-4">{item.q}</span>
                <span className={`text-slate-400 text-xl font-bold flex-shrink-0 transition-transform duration-200 ${openIdx===idx?'rotate-45':''}`}>+</span>
              </button>
              {openIdx===idx && (
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

// ── Customer Detail Card for Owner Booking Modal
function CustomerDetailCard({ customerId }: { customerId: string }) {
  const [cust, setCust] = useState<any>(null);
  useEffect(() => {
    supabase.from('customers').select('first_name,last_name,phone,nic,driving_license,city').eq('id', customerId).single()
      .then(({ data }) => setCust(data));
  }, [customerId]);
  if (!cust) return <div className="text-xs text-slate-400 text-center py-2">Loading customer info...</div>;
  return (
    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2">
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Renter Details</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['Name', `${cust.first_name||''} ${cust.last_name||''}`],
          ['Phone', cust.phone||'—'],
          ['City', cust.city||'—'],
          ['NIC / Passport', cust.nic||'—'],
          ['Driving License', cust.driving_license||'—'],
        ].map(([k,v])=>(
          <div key={k}>
            <p className="text-[9px] text-slate-400 font-bold uppercase">{k}</p>
            <p className="font-black text-slate-800">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang]   = useState<LangKey>('EN');
  const t = T[lang];

  // ── vehicles & filters
  const [allVehicles, setAllVehicles] = useState<RawVehicle[]>([]);
  const [displayed,   setDisplayed]   = useState<RawVehicle[]>([]);
  const [filterCity,  setFilterCity]  = useState('All Sri Lanka');
  const [filterType,  setFilterType]  = useState('all');
  const [filterPickup,setFilterPickup]= useState('');
  const [filterReturn,setFilterReturn]= useState('');
  const [filterPriceMin, setFilterPriceMin] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(50000);
  const [filterAC,       setFilterAC]       = useState(false);
  const [filterTrans,    setFilterTrans]     = useState('all'); // all/automatic/manual
  const [filterFuel,     setFilterFuel]      = useState('all');
  const [showAdvFilter,  setShowAdvFilter]   = useState(false);
  const [wishlist,       setWishlist]        = useState<string[]>([]); // vehicle IDs
  const [reviewModal,    setReviewModal]     = useState<{vehicleId:string;bookingId:string;vehicleName:string}|null>(null);
  const [reviewRating,   setReviewRating]    = useState(5);
  const [reviewComment,  setReviewComment]   = useState('');
  const [vehicleReviews, setVehicleReviews]  = useState<Record<string,any[]>>({});

  // ── navigation
  type ViewType = 'home'|'detail'|'auth'|'ownerDash'|'custDash';
  const [view,            setView]            = useState<ViewType>('home');
  const [authMode,        setAuthMode]        = useState<'owner'|'customer'>('owner');
  const [authTab,         setAuthTab]         = useState<'login'|'register'>('login');
  const [selectedVehicle, setSelectedVehicle] = useState<RawVehicle|null>(null);
  const [detailTab,       setDetailTab]       = useState<'details'|'docs'|'faq'>('details');
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [selectedBooking,      setSelectedBooking]      = useState<Booking|null>(null);
  const [ownerSelectedBooking, setOwnerSelectedBooking] = useState<Booking|null>(null);
  const [ownerSubTab,          setOwnerSubTab]          = useState<'fleet'|'bookings'>('fleet');

  // ── booking
  const [days,         setDays]         = useState(1);
  const [deliveryType, setDeliveryType] = useState<'pickup'|'delivery'>('pickup');
  const [bookingDone,  setBookingDone]  = useState(false);
  const [pickupTime,   setPickupTime]   = useState('09:00');

  // ── currency
  const [currency, setCurrency] = useState('LKR');

  // ── session
  const [sessionEmail, setSessionEmail] = useState<string|null>(null);
  const [sessionRole,  setSessionRole]  = useState<'owner'|'customer'|null>(null);
  const [ownerAcc,     setOwnerAcc]     = useState<OwnerAccount|null>(null);
  const [custAcc,      setCustAcc]      = useState<CustomerAccount|null>(null);
  const [ownerFleet,   setOwnerFleet]   = useState<RawVehicle[]>([]);
  const [ownerBookings,setOwnerBookings]= useState<Booking[]>([]);

  // ── auth forms
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError,    setLoginError]    = useState('');
  const [showLoginPw,   setShowLoginPw]   = useState(false);
  const [regEmail,    setRegEmail]    = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm,  setRegConfirm]  = useState('');
  const [regFirst,    setRegFirst]    = useState('');
  const [regLast,     setRegLast]     = useState('');
  const [regShop,     setRegShop]     = useState('');
  const [regPhone,    setRegPhone]    = useState('');
  const [regCity,     setRegCity]     = useState('Colombo');
  const [regNic,      setRegNic]      = useState('');
  const [regLicense,  setRegLicense]  = useState('');
  const [regIsForeign,setRegIsForeign]= useState(false);
  const [regError,    setRegError]    = useState('');
  const [showRegPw,   setShowRegPw]   = useState(false);

  // login prompt modal
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  // ── vehicle form
  const [showAddForm,      setShowAddForm]      = useState(false);
  const [editingId,        setEditingId]        = useState<string|null>(null);
  const [newV, setNewV] = useState({name:'',type:'car',transmission:'Automatic',fuel:'Petrol',pricePerDay:5000,description:'',mapLink:''});
  const [photos,           setPhotos]           = useState<string[]>([]);
  const [isDragging,       setIsDragging]       = useState(false);

  // ── profile edit modals
  const [ownerEditOpen,    setOwnerEditOpen]    = useState(false);
  const [ownerEditData,    setOwnerEditData]    = useState({shopName:'',ownerName:'',phone:'',whatsapp:'',city:'Colombo'});
  const [custEditOpen,     setCustEditOpen]     = useState(false);
  const [custEditData,     setCustEditData]     = useState({firstName:'',lastName:'',phone:'',city:'Colombo'});

  // ── toast
  const [toast, setToast] = useState<{msg:string;type:'ok'|'err'}|null>(null);
  const showToast = (msg:string, type:'ok'|'err'='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null), 3200); };

  // ── currency helpers
  const CURRENCIES: Record<string,{rate:number;sign:string;dec:number}> = {
    LKR: {rate:1,      sign:'Rs.', dec:0},
    USD: {rate:0.0033, sign:'$',   dec:2},
    EUR: {rate:0.0030, sign:'€',   dec:2},
    GBP: {rate:0.0026, sign:'£',   dec:2},
    RUB: {rate:0.30,   sign:'₽',   dec:0},
    AED: {rate:0.012,  sign:'AED', dec:2},
  };
  const curr = CURRENCIES[currency] ?? CURRENCIES['LKR'];
  const fmt  = (p:number) => `${curr.sign} ${(p*curr.rate).toLocaleString(undefined,{minimumFractionDigits:curr.dec,maximumFractionDigits:curr.dec})}`;

  // ── Normalize vehicle fields
  const vPrice  = (v: any) => v?.price_per_day || v?.pricePerDay || 0;
  const vShop   = (v: any) => v?.shop_name || v?.shopName || '';
  const vAvail  = (v: any) => v?.isAvailable !== false && v?.is_available !== false;
  const vMap    = (v: any) => v?.mapLink || v?.map_link || '';
  const vImg    = (v: any) => v?.image || (v?.images?.[0]) || v?.vehicle_photos?.[0]?.storage_url || '';

  const platformFee = (amount: number) => Math.round(amount * 0.10);
  const ownerPayout = (amount: number) => Math.round(amount * 0.90);
  const typeIcon = (tp:string) => tp==='car'?'🚙':tp==='bike'?'🏍️':'🛺';
  const statusColor = (s:string) => s==='confirmed'?'bg-emerald-50 text-emerald-700 border-emerald-200':s==='completed'?'bg-blue-50 text-blue-700 border-blue-200':s==='cancelled'?'bg-slate-50 text-slate-500 border-slate-200':'bg-amber-50 text-amber-700 border-amber-200';
  const statusLabel = (s:string) => s==='confirmed'?t.confirmed:s==='completed'?t.completed:s==='cancelled'?'Cancelled':t.pending;

  // ── FIX 1: Unified vehicle refresh — updates BOTH allVehicles and ownerFleet
  const refreshVehicles = useCallback(async (ownerId?: string) => {
    // Refresh public listing (only available vehicles)
    const vehicles = await getAvailableVehicles();
    setAllVehicles(vehicles.map(mapVehicle));

    // If owner id provided, also refresh their full fleet (including unavailable)
    if (ownerId) {
      const ownerVehicles = await getOwnerVehicles(ownerId);
      const fleet = ownerVehicles.map(mapVehicle);
      setOwnerFleet(fleet);
      setOwnerAcc(prev => prev ? { ...prev, fleet } : prev);
    }
  }, []);

  // ── bootstrap
  useEffect(() => {
    trackVisitInDB().catch(()=>{});
    getAvailableVehicles().then(vehicles => {
      setAllVehicles(vehicles.map(mapVehicle));
    }).catch(()=>{});
    const s = getSession();
    if (s) restoreSession(s.id, s.email, s.role);
  }, []);

  const restoreSession = async (id: string, email: string, role: 'owner'|'customer') => {
    if (role === 'owner') {
      const { data } = await supabase.from('owners').select('*').eq('id', id).single();
      if (data) {
        const vehicles = await getOwnerVehicles(id);
        const fleet = vehicles.map(mapVehicle);
        // FIX 2: Fetch ALL bookings for owner (not just pending) ordered newest first
        const { data: bdata } = await supabase
          .from('bookings')
          .select('*')
          .eq('owner_id', id)
          .not('status', 'eq', 'declined')
          .order('booked_at', { ascending: false });
        setSessionEmail(email); setSessionRole('owner');
        setOwnerAcc({ ...data, fleet, bookings: bdata || [] });
        setOwnerFleet(fleet);
        setOwnerBookings(bdata || []);
      }
    } else {
      const { data } = await supabase.from('customers').select('*').eq('id', id).single();
      if (data) {
        const { data: bdata } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_id', id)
          .not('status', 'eq', 'declined')
          .order('booked_at', { ascending: false });
        setSessionEmail(email); setSessionRole('customer');
        setCustAcc({ ...data, bookings: bdata || [] });
      }
    }
  };

  // ── FIX 1b: Filter displayed from allVehicles — only show is_available = true
  useEffect(() => {
    let filtered = allVehicles.filter(v => v.is_available === true || v.isAvailable === true);
    if (filterCity !== 'All Sri Lanka') filtered = filtered.filter(v => v.location?.toLowerCase() === filterCity.toLowerCase());
    if (filterType !== 'all') filtered = filtered.filter(v => v.type === filterType);
    if (filterPriceMin > 0) filtered = filtered.filter(v => vPrice(v) >= filterPriceMin);
    if (filterPriceMax < 50000) filtered = filtered.filter(v => vPrice(v) <= filterPriceMax);
    if (filterTrans !== 'all') filtered = filtered.filter(v => v.transmission?.toLowerCase() === filterTrans.toLowerCase());
    if (filterFuel !== 'all') filtered = filtered.filter(v => v.fuel?.toLowerCase() === filterFuel.toLowerCase());
    setDisplayed(filtered);
  }, [allVehicles, filterCity, filterType, filterPriceMin, filterPriceMax, filterTrans, filterFuel]);

  // Load wishlist from Supabase on login
  useEffect(() => {
    if (sessionRole === 'customer' && custAcc?.id) {
      supabase.from('wishlist').select('vehicle_id').eq('customer_id', custAcc.id)
        .then(({ data }) => { if (data) setWishlist(data.map(w => w.vehicle_id)); });
    }
  }, [sessionRole, custAcc?.id]);

  useEffect(() => {
    if (filterPickup && filterReturn) {
      const d = Math.ceil((new Date(filterReturn).getTime()-new Date(filterPickup).getTime())/86400000);
      if (d > 0) setDays(d);
      else if (d <= 0) setFilterReturn(''); // clear invalid return date
    }
  }, [filterPickup, filterReturn]);

  // Auto-set return date when days change
  useEffect(() => {
    if (filterPickup && days > 0) {
      const pickup = new Date(filterPickup);
      pickup.setDate(pickup.getDate() + days);
      const ret = pickup.toISOString().split('T')[0];
      if (ret !== filterReturn) setFilterReturn(ret);
    }
  }, [days, filterPickup]);

  // ── reset
  const resetToHome = () => {
    setView('home'); setSelectedVehicle(null); setBookingDone(false);
    setMobileMenuOpen(false); setFilterCity('All Sri Lanka'); setFilterType('all');
    setFilterPickup(''); setFilterReturn(''); setSelectedBooking(null);
  };

  // ── logout
  const logout = () => {
    clearSession();
    setSessionEmail(null); setSessionRole(null); setOwnerAcc(null); setCustAcc(null);
    setOwnerFleet([]); setOwnerBookings([]); resetToHome(); showToast('Logged out');
  };

  // ── open auth
  const openAuth = (mode:'owner'|'customer', tab:'login'|'register'='login') => {
    setAuthMode(mode); setAuthTab(tab);
    setLoginEmail(''); setLoginPassword(''); setLoginError('');
    setRegEmail(''); setRegPassword(''); setRegConfirm('');
    setRegFirst(''); setRegLast(''); setRegShop(''); setRegPhone('');
    setRegNic(''); setRegLicense(''); setRegIsForeign(false); setRegError('');
    setView('auth'); setMobileMenuOpen(false);
  };

  // ── owner login/register
  const handleOwnerLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword.trim()) { setLoginError('Email and password required'); return; }
    const { data, error } = await loginOwner(loginEmail, loginPassword);
    if (error || !data) { setLoginError(error || 'Login failed'); return; }
    saveSession({ id: data.id!, email: data.email, role: 'owner' });
    await restoreSession(data.id!, data.email, 'owner');
    setView('ownerDash'); showToast(`Welcome, ${data.shop_name}! 👋`);
  };

  const handleOwnerRegister = async () => {
    setRegError('');
    if (!regEmail.trim()) { setRegError('Email required'); return; }
    if (regPassword.length < 6) { setRegError('Password min 6 chars'); return; }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }
    if (!regShop.trim()) { setRegError('Shop name required'); return; }
    if (!regPhone.trim()) { setRegError('Phone required'); return; }
    const { data, error } = await registerOwner(regEmail, regPassword, {
      shopName: regShop, ownerName: regFirst + ' ' + regLast,
      phone: regPhone, whatsapp: regPhone, city: regCity,
    });
    if (error || !data) { setRegError(error || 'Registration failed'); return; }
    saveSession({ id: data.id!, email: data.email, role: 'owner' });
    setSessionEmail(data.email); setSessionRole('owner');
    setOwnerAcc({...data, fleet:[], bookings:[]}); setOwnerFleet([]); setOwnerBookings([]);
    setView('ownerDash'); showToast(`Welcome, ${data.shop_name}! 🎉`);
  };

  // ── customer login/register
  const handleCustLogin = async () => {
    setLoginError('');
    const { data, error } = await loginCustomer(loginEmail, loginPassword);
    if (error || !data) { setLoginError(error || 'Login failed'); return; }
    saveSession({ id: data.id!, email: data.email, role: 'customer' });
    await restoreSession(data.id!, data.email, 'customer');
    setView('custDash'); showToast(`Welcome back, ${data.first_name}! 👋`);
  };

  const handleCustRegister = async () => {
    setRegError('');
    if (!regEmail.trim()) { setRegError('Email required'); return; }
    if (regPassword.length < 6) { setRegError('Password min 6 chars'); return; }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }
    if (!regFirst.trim()) { setRegError('First name required'); return; }
    if (!regPhone.trim()) { setRegError('Phone required'); return; }
    if (!regNic.trim()) { setRegError(regIsForeign ? 'Passport number required' : 'NIC number required'); return; }
    if (!regLicense.trim()) { setRegError(regIsForeign ? 'International driving license required' : 'Driving license number required'); return; }
    const { data, error } = await registerCustomer(regEmail, regPassword, {
      firstName: regFirst, lastName: regLast, phone: regPhone, city: regCity,
      nic: regNic, drivingLicense: regLicense,
    });
    if (error || !data) { setRegError(error || 'Registration failed'); return; }
    saveSession({ id: data.id!, email: data.email, role: 'customer' });
    setSessionEmail(data.email); setSessionRole('customer');
    setCustAcc({...data, bookings:[]});
    setView('custDash'); showToast(`Welcome, ${data.first_name}! 🎉`);
  };

  const handleLogin    = () => authMode==='owner' ? handleOwnerLogin()    : handleCustLogin();
  const handleRegister = () => authMode==='owner' ? handleOwnerRegister() : handleCustRegister();

  // ── vehicle submit
  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newV.name.trim()) { showToast('Vehicle name required!','err'); return; }
    if (photos.length < 3) { showToast('Minimum 3 photos required!','err'); return; }

    const ownerId = ownerAcc?.id;
    if (!ownerId) { showToast('Please login again','err'); return; }

    if (editingId) {
      const { error } = await updateVehicle(editingId, {
        name: newV.name, type: newV.type as any,
        transmission: newV.transmission, fuel: newV.fuel,
        price_per_day: Number(newV.pricePerDay),
        description: newV.description, map_link: newV.mapLink,
      }, photos);
      if (error) { showToast(error, 'err'); return; }
      showToast('Vehicle updated ✓');
    } else {
      const { id, error } = await addVehicle({
        owner_id: ownerId,
        name: newV.name, type: newV.type as any,
        transmission: newV.transmission, fuel: newV.fuel,
        price_per_day: Number(newV.pricePerDay),
        location: ownerAcc?.city || 'Colombo',
        shop_name: ownerAcc?.shop_name || '',
        description: newV.description, map_link: newV.mapLink,
      }, photos);
      if (error || !id) { showToast(error || 'Failed', 'err'); return; }
      showToast('Vehicle published! 🚀');
    }

    // FIX 1: Use unified refresh that updates both states
    await refreshVehicles(ownerId);
    setNewV({name:'',type:'car',transmission:'Automatic',fuel:'Petrol',pricePerDay:5000,description:'',mapLink:''});
    setPhotos([]); setShowAddForm(false); setEditingId(null);
  };

  const toggleAvail = async (id: string) => {
    const v = ownerFleet.find(v => v.id === id);
    if (!v) return;
    const newAvail = !vAvail(v);
    await toggleVehicleAvailability(id, newAvail);
    // Update ownerFleet state immediately (optimistic)
    const updated = ownerFleet.map(x => x.id === id ? { ...x, isAvailable: newAvail, is_available: newAvail } : x);
    setOwnerFleet(updated);
    // Also refresh public listing
    const vehicles = await getAvailableVehicles();
    setAllVehicles(vehicles.map(mapVehicle));
    showToast(newAvail ? `"${v.name}" is now live!` : `"${v.name}" hidden`);
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    await dbDeleteVehicle(id);
    setOwnerFleet(ownerFleet.filter(v => v.id !== id));
    const vehicles = await getAvailableVehicles();
    setAllVehicles(vehicles.map(mapVehicle));
    showToast('Deleted','err');
  };

  const processImg = (file: File) => {
    if (photos.length >= 5) { showToast('Maximum 5 photos allowed', 'err'); return; }
    const r = new FileReader();
    r.onloadend = () => setPhotos(prev => [...prev, r.result as string]);
    r.readAsDataURL(file);
  };
  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));
  const movePhoto   = (from: number, to: number) => {
    setPhotos(prev => { const a = [...prev]; const [item] = a.splice(from, 1); a.splice(to, 0, item); return a; });
  };

  // ── Helper: call booking API
  const bookingAPI = async (action: string, params: Record<string,any>) => {
    const res = await fetch('/api/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
    return res.json();
  };

  // ── FIX 2: Owner refresh bookings from DB (source of truth)
  const refreshOwnerBookings = async (ownerId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', ownerId)
      .not('status', 'eq', 'declined')
      .order('booked_at', { ascending: false });
    setOwnerBookings(data || []);
    setOwnerAcc(prev => prev ? { ...prev, bookings: data || [] } : prev);
  };

  // ── FIX 3: Owner accept booking — refresh from DB after action
  const updateBookingStatus = async (bookingId: string, status: 'confirmed'|'completed') => {
    if (status === 'confirmed') {
      const res = await bookingAPI('accept', { bookingId });
      if (res.error) { showToast(res.error, 'err'); return; }
      // Refresh bookings from DB (declined ones will not appear due to filter)
      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
      await refreshVehicles(ownerAcc?.id);
      showToast('Booking confirmed! Customer notified via SMS. ✓');
    } else {
      const res = await bookingAPI('complete', { bookingId });
      if (res.error) { showToast(res.error, 'err'); return; }
      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
      await refreshVehicles(ownerAcc?.id);
      showToast('Rental completed! Vehicle is available again. ✓');
    }
  };

  // ── FIX 3: Owner decline — refresh from DB after action
  const declineBooking = async (bookingId: string) => {
    const res = await bookingAPI('decline', { bookingId });
    if (res.error) { showToast(res.error, 'err'); return; }
    if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
    await refreshVehicles(ownerAcc?.id);
    showToast('Booking declined. Vehicle is available again.');
  };

  // ── FIX 4: Cancel booking — refresh customer bookings from DB after action
  const cancelBooking = async (bookingId: string, role: 'owner'|'customer') => {
    const msg = role === 'owner'
      ? 'Cancel this booking? The customer will be notified and the vehicle will become available again.'
      : 'Cancel this booking? The shop will be notified.';
    if (!confirm(msg)) return;

    const res = await bookingAPI('cancel', {
      bookingId,
      ownerId: role === 'owner' ? ownerAcc?.id : null,
      customerId: role === 'customer' ? custAcc?.id : null,
    });
    if (res.error) { showToast(res.error, 'err'); return; }

    if (role === 'owner') {
      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
      await refreshVehicles(ownerAcc?.id);
    } else if (custAcc?.id) {
      // FIX 4: Re-fetch from DB instead of relying on stale state
      const { data: bdata } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', custAcc.id)
        .not('status', 'eq', 'declined')
        .order('booked_at', { ascending: false });
      setCustAcc(prev => prev ? { ...prev, bookings: bdata || [] } : prev);
      await refreshVehicles();
    }
    showToast('Booking cancelled. Vehicle is available again.');
  };

  // ── Toggle wishlist
  const toggleWishlist = async (vehicleId: string) => {
    if (sessionRole !== 'customer' || !custAcc?.id) {
      setLoginPromptOpen(true); return;
    }
    const isWishlisted = wishlist.includes(vehicleId);
    if (isWishlisted) {
      await supabase.from('wishlist').delete().eq('customer_id', custAcc.id).eq('vehicle_id', vehicleId);
      setWishlist(prev => prev.filter(id => id !== vehicleId));
      showToast('Removed from favourites');
    } else {
      await supabase.from('wishlist').insert({ customer_id: custAcc.id, vehicle_id: vehicleId });
      setWishlist(prev => [...prev, vehicleId]);
      showToast('Saved to favourites ❤️');
    }
  };

  // ── Submit review
  const submitReview = async () => {
    if (!reviewModal || !custAcc?.id) return;
    if (reviewRating < 1 || reviewRating > 5) { showToast('Select a rating', 'err'); return; }
    const { error } = await supabase.from('reviews').insert({
      vehicle_id: reviewModal.vehicleId,
      customer_id: custAcc.id,
      booking_id: reviewModal.bookingId,
      owner_id: allVehicles.find(v => v.id === reviewModal.vehicleId)?.owner_id,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    if (error) { showToast('Review failed: ' + error.message, 'err'); return; }
    // Update vehicle rating in DB
    const { data: reviews } = await supabase.from('reviews').select('rating').eq('vehicle_id', reviewModal.vehicleId);
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await supabase.from('vehicles').update({ rating: Math.round(avg * 10) / 10 }).eq('id', reviewModal.vehicleId);
    }
    setReviewModal(null); setReviewRating(5); setReviewComment('');
    showToast('Review submitted! Thank you 🌟');
  };

  // ── confirm booking (customer)
  const base           = selectedVehicle ? (selectedVehicle.price_per_day || (selectedVehicle as any).pricePerDay || 0) * days : 0;
  const delFee         = deliveryType==='delivery' ? 1500 : 0;
  const total          = base + delFee;
  const platformFeeAmt = Math.round(total * 0.10);   // Drivo's cut (hidden from customer)
  const ownerPayoutAmt = total - platformFeeAmt;      // what owner receives

  const confirmBooking = async () => {
    if (!selectedVehicle) return;
    // Require login to book
    if (sessionRole !== 'customer') {
      setLoginPromptOpen(true);
      return;
    }
    const today = new Date().toISOString().split('T')[0];

    const bookingData = {
      vehicle_id: selectedVehicle.id,
      owner_id: selectedVehicle.owner_id,
      customer_id: sessionRole === 'customer' ? custAcc?.id : undefined,
      vehicle_name: selectedVehicle.name || '',
      vehicle_img: selectedVehicle.image || '',
      shop_name: vShop(selectedVehicle) || '',
      location: selectedVehicle.location || '',
      pickup_date: filterPickup || today,
      return_date: filterReturn || today,
      pickup_time: pickupTime,
      days,
      delivery_type: deliveryType,
      price_per_day: vPrice(selectedVehicle) || 0,
      total,
      status: 'pending',
    };

    const res = await bookingAPI('create', {
      booking: bookingData,
      vehicleId: selectedVehicle.id,
      customerId: sessionRole === 'customer' ? custAcc?.id : null,
      ownerId: selectedVehicle.owner_id,
    });

    if (res.error) {
      showToast(res.error === 'Vehicle no longer available'
        ? 'Sorry, this vehicle was just booked by someone else!'
        : 'Booking failed. Please try again.', 'err');
      setView('home'); setSelectedVehicle(null);
      await refreshVehicles();
      return;
    }

    // FIX 4: Re-fetch customer bookings from DB
    if (sessionRole === 'customer' && custAcc?.id) {
      const { data: bdata } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', custAcc.id)
        .not('status', 'eq', 'declined')
        .order('booked_at', { ascending: false });
      setCustAcc(prev => prev ? { ...prev, bookings: bdata || [] } : prev);
    }
    await refreshVehicles();
    await trackBookingInDB().catch(()=>{});
    setBookingDone(true);
  };

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <main dir={t.dir} className={`min-h-screen bg-slate-50 text-slate-800 antialiased font-sans ${t.dir==='rtl'?'text-right':''}`}>

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl ${toast.type==='ok'?'bg-slate-900 text-white':'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* ══ NAV ══ */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button onClick={resetToHome} className="flex items-center gap-2 focus:outline-none flex-shrink-0">
            <DrivoLogo className="w-9 h-9"/>
            <span className="text-xl font-black tracking-tighter text-slate-900">drivo</span>
            <span className="hidden sm:block text-[9px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded uppercase">LK</span>
          </button>
          <div className="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-500">
            <button onClick={resetToHome} className={`py-2 hover:text-slate-900 transition ${view==='home'?'text-slate-900 border-b-2 border-slate-900':''}`}>{t.dailyRentals}</button>
            <button className="py-2 hover:text-slate-900 transition">{t.monthly}</button>
            <button className="py-2 hover:text-slate-900 transition">{t.longterm}</button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select value={lang} onChange={e=>setLang(e.target.value as LangKey)} className="bg-slate-100 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer">
              <option value="EN">🇬🇧 EN</option>
              <option value="SI">🇱🇰 සිං</option>
              <option value="RU">🇷🇺 RU</option>
              <option value="DE">🇩🇪 DE</option>
              <option value="FR">🇫🇷 FR</option>
              <option value="AR">🇦🇪 AR</option>
            </select>
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="bg-slate-100 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer">
              <option value="LKR">🇱🇰 LKR</option>
              <option value="USD">🇺🇸 USD</option>
              <option value="EUR">🇪🇺 EUR</option>
              <option value="GBP">🇬🇧 GBP</option>
              <option value="RUB">🇷🇺 RUB</option>
              <option value="AED">🇦🇪 AED</option>
            </select>
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="block w-5 h-0.5 bg-slate-700 mb-1"/><span className="block w-5 h-0.5 bg-slate-700 mb-1"/><span className="block w-5 h-0.5 bg-slate-700"/>
            </button>
            <div className="hidden md:flex items-center gap-2">
              {sessionRole==='owner' ? (
                <>
                  <button onClick={()=>setView('ownerDash')} className={`text-xs font-black px-3 py-2 rounded-xl border transition ${view==='ownerDash'?'bg-slate-900 text-white border-slate-900':'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>{t.ownerDashboard}</button>
                  <button onClick={logout} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-500 transition">{t.logOut}</button>
                </>
              ) : sessionRole==='customer' ? (
                <>
                  <button onClick={()=>setView('custDash')} className={`text-xs font-black px-3 py-2 rounded-xl border transition ${view==='custDash'?'bg-slate-900 text-white border-slate-900':'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>{t.myDashboard}</button>
                  <button onClick={logout} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-500 transition">{t.logOut}</button>
                </>
              ) : (
                <>
                  <button onClick={()=>openAuth('customer')} className="text-xs font-black px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition">🚗 Rent a Vehicle</button>
                  <button onClick={()=>openAuth('owner')} className="text-xs font-black px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 transition">{t.partnerLogin}</button>
                </>
              )}
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-2 shadow-md">
            {sessionRole ? (
              <>
                <button onClick={()=>{ setView(sessionRole==='owner'?'ownerDash':'custDash'); setMobileMenuOpen(false); }} className="w-full py-2.5 text-sm font-black bg-slate-900 text-white rounded-xl">{t.myDashboard}</button>
                <button onClick={logout} className="w-full py-2 text-sm font-bold text-red-500">{t.logOut}</button>
              </>
            ) : (
              <>
                <button onClick={()=>openAuth('customer')} className="w-full py-2.5 text-sm font-bold bg-slate-100 rounded-xl">🚗 Rent a Vehicle</button>
                <button onClick={()=>openAuth('owner')} className="w-full py-2.5 text-sm font-black bg-slate-900 text-white rounded-xl">{t.partnerLogin}</button>
              </>
            )}
          </div>
        )}
      </nav>


      {/* ══ REVIEW MODAL ══ */}
      {reviewModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 text-center">
              <p className="text-2xl mb-1">⭐</p>
              <h2 className="text-white text-lg font-black">Rate Your Ride</h2>
              <p className="text-slate-400 text-xs mt-1">{reviewModal.vehicleName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 text-center">Your Rating</p>
                <div className="flex justify-center gap-2">
                  {[1,2,3,4,5].map(star=>(
                    <button key={star} onClick={()=>setReviewRating(star)}
                      className={`text-3xl transition-transform hover:scale-110 ${star <= reviewRating ? '' : 'opacity-30'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs font-bold text-slate-500 mt-2">
                  {reviewRating === 1 ? 'Poor' : reviewRating === 2 ? 'Fair' : reviewRating === 3 ? 'Good' : reviewRating === 4 ? 'Very Good' : 'Excellent!'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Comment (optional)</label>
                <textarea rows={3} placeholder="Tell others about your experience..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition resize-none"
                  value={reviewComment} onChange={e=>setReviewComment(e.target.value)}/>
              </div>
              <button onClick={submitReview}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide transition">
                Submit Review 🌟
              </button>
              <button onClick={()=>setReviewModal(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ LOGIN PROMPT MODAL (shown when guest tries to book) ══ */}
      {loginPromptOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-6 text-center">
              <DrivoLogo className="w-10 h-10 mx-auto mb-2"/>
              <h2 className="text-white text-xl font-black">Login Required</h2>
              <p className="text-slate-400 text-xs mt-1">You need an account to book a vehicle</p>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={()=>{ setLoginPromptOpen(false); openAuth('customer','login'); }}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wide transition shadow-md">
                🔑 Sign In to My Account
              </button>
              <button onClick={()=>{ setLoginPromptOpen(false); openAuth('customer','register'); }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-wide transition">
                ✨ Create New Account
              </button>
              <p className="text-center text-[11px] text-slate-400 pt-1">
                Free account · Takes 1 minute · NIC &amp; license required
              </p>
              <button onClick={()=>setLoginPromptOpen(false)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ AUTH PAGE ══ */}
      {view==='auth' && (
        <div className="min-h-[calc(100vh-64px)] bg-slate-100 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[460px]">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 px-8 py-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <DrivoLogo className="w-9 h-9"/>
                  <span className="text-white font-black text-xl">drivo</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ml-1 ${authMode==='owner'?'bg-emerald-500 text-slate-900':'bg-blue-400 text-white'}`}>{authMode==='owner'?'Partner':'Customer'}</span>
                </div>
                <h2 className="text-white text-2xl font-black">{authTab==='login'?t.welcomeBack:(authMode==='owner'?t.createShop:t.register)}</h2>
                <p className="text-slate-400 text-sm mt-1">{authTab==='login'?(authMode==='owner'?t.manageFleet:t.myBookings):t.startListing}</p>
                <div className="flex gap-2 mt-4 justify-center">
                  {(['customer','owner'] as const).map(role=>(
                    <button key={role} onClick={()=>setAuthMode(role)} className={`text-xs font-black px-4 py-1.5 rounded-full transition border ${authMode===role?'bg-white text-slate-900 border-white':'border-white/30 text-white/70 hover:border-white/60'}`}>
                      {role==='owner'?'🔑 '+t.partnerLogin:'👤 '+t.customerLogin}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex border-b border-slate-200">
                {(['login','register'] as const).map(tab=>(
                  <button key={tab} onClick={()=>{ setAuthTab(tab); setLoginError(''); setRegError(''); }} className={`flex-1 py-3.5 text-sm font-black uppercase tracking-wide transition ${authTab===tab?'text-slate-900 border-b-2 border-slate-900 bg-white':'text-slate-400 bg-slate-50 hover:text-slate-700'}`}>{tab==='login'?t.signIn:t.register}</button>
                ))}
              </div>
              <div className="px-8 py-7">
                {authTab==='login' && (
                  <div className="space-y-4">
                    {[{l:t.email,v:loginEmail,s:setLoginEmail,t:'email'},{l:t.password,v:loginPassword,s:setLoginPassword,t:'pw'}].map((f,i)=>(
                      <div key={i}>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{f.l}</label>
                        <div className="relative">
                          <input type={f.t==='pw'?(showLoginPw?'text':'password'):'email'} placeholder={f.t==='pw'?'••••••••':'you@example.com'}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-14 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                            value={f.v} onChange={e=>f.s(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                          {f.t==='pw' && <button type="button" onClick={()=>setShowLoginPw(!showLoginPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black px-1">{showLoginPw?'HIDE':'SHOW'}</button>}
                        </div>
                      </div>
                    ))}
                    {loginError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {loginError}</div>}
                    <button onClick={handleLogin} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">{t.signIn} →</button>
                    <p className="text-center text-xs text-slate-400">{t.noAccount} <button onClick={()=>setAuthTab('register')} className="text-slate-700 font-black hover:underline">{t.registerHere}</button></p>
                  </div>
                )}
                {authTab==='register' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.email} <span className="text-red-400">*</span></label>
                      <input type="email" placeholder="you@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300" value={regEmail} onChange={e=>setRegEmail(e.target.value)}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.password} <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <input type={showRegPw?'text':'password'} placeholder="Min 6" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regPassword} onChange={e=>setRegPassword(e.target.value)}/>
                          <button type="button" onClick={()=>setShowRegPw(!showRegPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{showRegPw?'HIDE':'SHOW'}</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.confirmPw} <span className="text-red-400">*</span></label>
                        <input type="password" placeholder="Repeat" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regConfirm} onChange={e=>setRegConfirm(e.target.value)}/>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-100 space-y-3">
                      {authMode==='owner' ? (
                        <>
                          <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.shopName} <span className="text-red-400">*</span></label><input type="text" placeholder="e.g. Galle Road Rentals" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regShop} onChange={e=>setRegShop(e.target.value)}/></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.ownerName}</label><input type="text" placeholder="Your name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regFirst} onChange={e=>setRegFirst(e.target.value)}/></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.phone} <span className="text-red-400">*</span></label><input type="tel" placeholder="077XXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regPhone} onChange={e=>setRegPhone(e.target.value)}/></div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.firstName} <span className="text-red-400">*</span></label><input type="text" placeholder="Kavinda" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regFirst} onChange={e=>setRegFirst(e.target.value)}/></div>
                            <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.lastName}</label><input type="text" placeholder="Perera" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regLast} onChange={e=>setRegLast(e.target.value)}/></div>
                          </div>
                          <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.phone} <span className="text-red-400">*</span></label><input type="tel" placeholder="077XXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300" value={regPhone} onChange={e=>setRegPhone(e.target.value)}/></div>

                          {/* Foreigner toggle */}
                          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                            <input type="checkbox" id="isForeign" checked={regIsForeign} onChange={e=>setRegIsForeign(e.target.checked)} className="w-4 h-4 accent-slate-900 cursor-pointer"/>
                            <label htmlFor="isForeign" className="text-xs font-black text-slate-700 cursor-pointer">I am a foreign national (tourist/expat)</label>
                          </div>

                          {/* ID Document */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                              {regIsForeign ? 'Passport Number' : 'NIC Number'} <span className="text-red-400">*</span>
                            </label>
                            <input type="text"
                              placeholder={regIsForeign ? 'e.g. A12345678' : 'e.g. 200012345678 or 991234567V'}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300"
                              value={regNic} onChange={e=>setRegNic(e.target.value)}/>
                          </div>

                          {/* Driving License */}
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                              {regIsForeign ? 'International Driving License No.' : 'Driving License No.'} <span className="text-red-400">*</span>
                            </label>
                            <input type="text"
                              placeholder={regIsForeign ? 'International license number' : 'e.g. B1234567'}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition placeholder:text-slate-300"
                              value={regLicense} onChange={e=>setRegLicense(e.target.value)}/>
                            <p className="text-[10px] text-slate-400 mt-1">⚠️ Your name on ID &amp; license must match. Required for verification.</p>
                          </div>
                        </>
                      )}
                      <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.city}</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition" value={regCity} onChange={e=>setRegCity(e.target.value)}>
                          {SL_CITIES.slice(1).map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    {regError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl">⚠️ {regError}</div>}
                    <button onClick={handleRegister} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">{t.createAccount} →</button>
                    <p className="text-center text-xs text-slate-400">{t.alreadyReg} <button onClick={()=>setAuthTab('login')} className="text-slate-700 font-black hover:underline">{t.signIn}</button></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CUSTOMER DASHBOARD ══ */}
      {view==='custDash' && custAcc && (
        <div className="bg-slate-100 min-h-[calc(100vh-64px)]">
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">{(custAcc.first_name||'U').charAt(0)}</div>
                <div>
                  <p className="font-black text-slate-900 text-base">{custAcc.first_name||''} {custAcc.last_name||''}</p>
                  <p className="text-xs text-slate-500">{custAcc.city||''} · {custAcc.phone||''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="hidden sm:flex items-center gap-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                  <span>{(custAcc.bookings||[]).length} {t.myBookings}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600">{(custAcc.bookings||[]).filter(b=>b.status==='confirmed').length} {t.confirmed}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-500">{(custAcc.bookings||[]).filter(b=>b.status==='pending').length} {t.pending}</span>
                </div>
                <button onClick={()=>{ setCustEditData({firstName:custAcc.first_name||'',lastName:custAcc.last_name||'',phone:custAcc.phone||'',city:custAcc.city||'Colombo'}); setCustEditOpen(true); }} className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">{t.editProfile}</button>
                <button onClick={resetToHome} className="text-xs font-black px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition">{t.browseVehicles}</button>
              </div>
            </div>
          </div>

          {custEditOpen && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="font-black text-slate-900">{t.editProfile}</h3>
                  <button onClick={()=>setCustEditOpen(false)} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
                </div>
                <div className="p-6 space-y-3">
                  {[{l:t.firstName,k:'firstName'},{l:t.lastName,k:'lastName'},{l:t.phone,k:'phone'}].map(f=>(
                    <div key={f.k}><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition"
                        value={(custEditData as any)[f.k]} onChange={e=>setCustEditData({...custEditData,[f.k]:e.target.value})}/></div>
                  ))}
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t.city}</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none cursor-pointer" value={custEditData.city} onChange={e=>setCustEditData({...custEditData,city:e.target.value})}>
                      {SL_CITIES.slice(1).map(c=><option key={c}>{c}</option>)}
                    </select></div>
                  <button onClick={async ()=>{
                    if (!custAcc?.id) return;
                    await supabase.from('customers').update({
                      first_name: custEditData.firstName,
                      last_name: custEditData.lastName,
                      phone: custEditData.phone,
                      city: custEditData.city,
                    }).eq('id', custAcc.id);
                    setCustAcc(prev => prev ? {...prev, first_name:custEditData.firstName, last_name:custEditData.lastName, phone:custEditData.phone, city:custEditData.city} : prev);
                    setCustEditOpen(false); showToast(t.profileUpdated);
                  }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.saveProfile}</button>
                </div>
              </div>
            </div>
          )}

          {selectedBooking && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="font-black text-slate-900">{t.bookingDetails}</h3>
                  <button onClick={()=>setSelectedBooking(null)} className="text-slate-400 text-2xl hover:text-slate-700">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <img src={selectedBooking.vehicle_img||''} className="w-28 h-20 rounded-xl object-cover flex-shrink-0" alt=""/>
                    <div>
                      <p className="font-black text-slate-900">{selectedBooking.vehicle_name||''}</p>
                      <p className="text-xs text-slate-500 mt-1">{selectedBooking.shop_name||''} · {selectedBooking.location}</p>
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor(selectedBooking.status)}`}>{statusLabel(selectedBooking.status)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {([
                      [t.rentalPeriod, `${selectedBooking.pickup_date||''} → ${selectedBooking.return_date||''}`],
                      ['Pickup Time', (selectedBooking as any).pickup_time || '—'],
                      ['Days', `${selectedBooking.days} day${selectedBooking.days>1?'s':''}`],
                      [t.pickupType, (selectedBooking.delivery_type||'pickup')==='delivery'?t.delivery:t.selfPickup],
                      [t.vehicleRented, `Rs. ${(selectedBooking.price_per_day||0).toLocaleString()} /day`],
                      ...((selectedBooking.delivery_type||'pickup')==='delivery' ? [[t.deliveryFee,'Rs. 1,500']] : []),
                      [t.totalPaid, `Rs. ${(selectedBooking.total||0).toLocaleString()}`],
                      [t.status, statusLabel(selectedBooking.status)],
                      [t.bookedOn, selectedBooking.booked_at ? new Date(selectedBooking.booked_at).toLocaleDateString() : ''],
                    ] as [string,string][]).map(([k,v])=>(
                      <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-slate-500 font-semibold">{k}</span>
                        <span className="font-black text-slate-900">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cancel button inside modal — only for active bookings */}
                  {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                    <button
                      onClick={async () => {
                        await cancelBooking(selectedBooking.id, 'customer');
                        setSelectedBooking(null);
                      }}
                      className="w-full py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-sm uppercase tracking-wide transition flex items-center justify-center gap-2">
                      ✕ Cancel This Booking
                    </button>
                  )}
                  {(selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (
                    <button onClick={async ()=>{
                      if (!confirm('Remove this booking from your history?')) return;
                      await supabase.from('bookings').update({ customer_id: null }).eq('id', selectedBooking.id);
                      const { data: bdata } = await supabase
                        .from('bookings').select('*')
                        .eq('customer_id', custAcc.id)
                        .not('status','eq','declined')
                        .order('booked_at',{ascending:false});
                      setCustAcc(prev => prev ? {...prev, bookings: bdata||[]} : prev);
                      setSelectedBooking(null);
                      showToast('Removed from history');
                    }} className="w-full py-3 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 rounded-xl font-black text-xs uppercase transition">
                      🗑 Remove from History
                    </button>
                  )}
                  <button
                    onClick={()=>setSelectedBooking(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex gap-2 mb-5 flex-wrap">
              {(['all','upcoming','past','favourites'] as const).map(tab=>(
                <button key={tab} onClick={()=>setOwnerSubTab(tab as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition ${ownerSubTab===tab?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                  {tab==='all'?t.myBookings:tab==='upcoming'?t.upcomingRentals:tab==='past'?t.pastRentals:'❤️ Favourites'}
                </button>
              ))}
            </div>
            {ownerSubTab === 'favourites' ? (
              <div>
                {wishlist.length === 0 ? (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20">
                    <p className="text-5xl mb-3">🤍</p>
                    <p className="font-black text-slate-700">No favourites yet</p>
                    <button onClick={resetToHome} className="mt-5 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">Browse Vehicles</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allVehicles.filter(v => wishlist.includes(v.id)).map(v => (
                      <div key={v.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                        onClick={()=>{ setSelectedVehicle(v); setView('detail'); }}>
                        <div className="relative aspect-video bg-slate-100 overflow-hidden">
                          <img src={v.image} alt={v.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/>
                          <button onClick={e=>{ e.stopPropagation(); toggleWishlist(v.id); }}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition">
                            ❤️
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="font-black text-slate-900 text-sm">{v.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{vShop(v)} · {v.location}</p>
                          <p className="font-black text-slate-900 text-sm mt-2">Rs. {vPrice(v).toLocaleString()} <span className="text-xs font-normal text-slate-400">/day</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (custAcc.bookings||[]).length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20">
                <p className="text-5xl mb-3">🗓️</p>
                <p className="font-black text-slate-700">{t.noBookings}</p>
                <button onClick={resetToHome} className="mt-5 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.browseVehicles}</button>
              </div>
            ) : (
              <div className="space-y-3">
                {(custAcc.bookings||[])
                  .filter(b=> ownerSubTab==='all'?true:ownerSubTab==='upcoming'?b.status!=='completed'&&b.status!=='cancelled':b.status==='completed'||b.status==='cancelled')
                  .map(b=>(
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <img src={b.vehicle_img||''} className="w-24 h-16 rounded-xl object-cover flex-shrink-0" alt=""/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-slate-900 text-sm">{b.vehicle_name||''}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{b.shop_name||''} · {b.location}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border flex-shrink-0 ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                          <span className="text-xs text-slate-500">📅 {b.pickup_date||''} → {b.return_date||''}</span>
                          <span className="text-xs font-black text-slate-900">Rs. {b.total.toLocaleString()}</span>
                          <span className="text-xs text-slate-400">{b.days}d · {b.delivery_type||'pickup'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-2.5 flex justify-between items-center gap-2">
                      <span className="text-[10px] text-slate-400">{t.bookedOn}: {b.booked_at ? new Date(b.booked_at).toLocaleDateString() : ''}</span>
                      <div className="flex items-center gap-2">
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <button onClick={()=>cancelBooking(b.id, 'customer')}
                            className="text-xs font-black text-red-500 hover:text-red-700 transition border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg">
                            Cancel
                          </button>
                        )}
                        {b.status === 'completed' && (
                          <button onClick={()=>{ setReviewModal({ vehicleId: b.vehicle_id, bookingId: b.id, vehicleName: b.vehicle_name||'' }); setReviewRating(5); setReviewComment(''); }}
                            className="text-xs font-black text-amber-600 hover:text-amber-700 transition border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg">
                            ⭐ Review
                          </button>
                        )}
                        <button onClick={()=>setSelectedBooking(b)} className="text-xs font-black text-slate-600 hover:text-slate-900 transition">{t.bookingDetails} →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ OWNER DASHBOARD ══ */}
      {view==='ownerDash' && ownerAcc && (
        <div className="bg-slate-100 min-h-[calc(100vh-64px)]">
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">{(ownerAcc.shop_name||'S').charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-black text-slate-900 text-base">{ownerAcc.shop_name||''}</p>
                  <p className="text-xs text-slate-500">{ownerAcc.city||''} · {ownerAcc.phone||''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="hidden sm:flex items-center gap-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                  <span>{ownerFleet.length} {t.total}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600">{ownerFleet.filter(v=>vAvail(v)).length} {t.live}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-500">{ownerBookings.filter(b=>b.status==='pending').length} {t.pending}</span>
                </div>
                <button onClick={()=>{ setOwnerEditData({shopName:ownerAcc.shop_name||'',ownerName:ownerAcc.owner_name||'',phone:ownerAcc.phone||'',whatsapp:ownerAcc.whatsapp||'',city:ownerAcc.city||'Colombo'}); setOwnerEditOpen(true); }} className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">{t.editProfile}</button>
                <button onClick={()=>{ setShowAddForm(true); setEditingId(null); setNewV({name:'',type:'car',transmission:'Automatic',fuel:'Petrol',pricePerDay:5000,description:'',mapLink:''}); setPhotos([]); }}
                  className="text-xs font-black px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm">
                  <span className="text-lg leading-none">+</span> {t.addVehicle}
                </button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 flex gap-0">
              {([['fleet',t.yourFleet],['bookings',t.incomingBookings]] as [string,string][]).map(([k,l])=>(
                <button key={k} onClick={()=>setOwnerSubTab(k as any)}
                  className={`px-5 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition ${ownerSubTab===k?'border-slate-900 text-slate-900':'border-transparent text-slate-400 hover:text-slate-700'}`}>
                  {l} {k==='bookings'&&ownerBookings.filter(b=>b.status==='pending').length>0&&
                    <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{ownerBookings.filter(b=>b.status==='pending').length}</span>}
                </button>
              ))}
            </div>
          </div>

          {ownerEditOpen && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="font-black text-slate-900">{t.editProfile}</h3>
                  <button onClick={()=>setOwnerEditOpen(false)} className="text-slate-400 text-2xl hover:text-slate-700">×</button>
                </div>
                <div className="p-6 space-y-3">
                  {[{l:t.shopName,k:'shopName'},{l:t.ownerName,k:'ownerName'},{l:t.phone,k:'phone'},{l:'WhatsApp',k:'whatsapp'}].map(f=>(
                    <div key={f.k}><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.l}</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 transition"
                        value={(ownerEditData as any)[f.k]} onChange={e=>setOwnerEditData({...ownerEditData,[f.k]:e.target.value})}/></div>
                  ))}
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t.city}</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none cursor-pointer" value={ownerEditData.city} onChange={e=>setOwnerEditData({...ownerEditData,city:e.target.value})}>
                      {SL_CITIES.slice(1).map(c=><option key={c}>{c}</option>)}
                    </select></div>
                  <button onClick={async ()=>{
                    if(!sessionEmail || !ownerAcc?.id) return;
                    await supabase.from('owners').update({
                      shop_name: ownerEditData.shopName,
                      owner_name: ownerEditData.ownerName,
                      phone: ownerEditData.phone,
                      whatsapp: ownerEditData.whatsapp,
                      city: ownerEditData.city,
                    }).eq('id', ownerAcc.id);
                    setOwnerAcc({...ownerAcc, shop_name:ownerEditData.shopName, owner_name:ownerEditData.ownerName, phone:ownerEditData.phone, whatsapp:ownerEditData.whatsapp, city:ownerEditData.city});
                    setOwnerEditOpen(false); showToast(t.profileUpdated);
                  }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.saveProfile}</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Owner Booking Detail Modal ── */}
          {ownerSelectedBooking && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="font-black text-slate-900">{t.bookingDetails}</h3>
                  <button onClick={()=>setOwnerSelectedBooking(null)} className="text-slate-400 text-2xl hover:text-slate-700">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <img src={ownerSelectedBooking.vehicle_img||''} className="w-28 h-20 rounded-xl object-cover flex-shrink-0" alt=""/>
                    <div>
                      <p className="font-black text-slate-900">{ownerSelectedBooking.vehicle_name||''}</p>
                      <p className="text-xs text-slate-500 mt-1">{ownerSelectedBooking.shop_name||''} · {ownerSelectedBooking.location}</p>
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor(ownerSelectedBooking.status)}`}>{statusLabel(ownerSelectedBooking.status)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {([
                      [t.rentalPeriod, `${ownerSelectedBooking.pickup_date||''} → ${ownerSelectedBooking.return_date||''}`],
                      ['Pickup Time', (ownerSelectedBooking as any).pickup_time || '—'],
                      ['Days', `${ownerSelectedBooking.days} day${ownerSelectedBooking.days>1?'s':''}`],
                      [t.pickupType, (ownerSelectedBooking.delivery_type||'pickup')==='delivery'?t.delivery:t.selfPickup],
                      ['Rate', `Rs. ${(ownerSelectedBooking.price_per_day||0).toLocaleString()} /day`],
                      ...((ownerSelectedBooking.delivery_type||'pickup')==='delivery' ? [['Delivery Fee','Rs. 1,500']] : []),
                      ['Customer Pays', `Rs. ${(ownerSelectedBooking.total||0).toLocaleString()}`],
                      ['Drivo Fee (10%)', `− Rs. ${((ownerSelectedBooking as any).platform_fee || Math.round((ownerSelectedBooking.total||0)*0.10)).toLocaleString()}`],
                      ['✅ Your Payout', `Rs. ${((ownerSelectedBooking as any).owner_payout || Math.round((ownerSelectedBooking.total||0)*0.90)).toLocaleString()}`],
                      [t.status, statusLabel(ownerSelectedBooking.status)],
                      ['Booked On', ownerSelectedBooking.booked_at ? new Date(ownerSelectedBooking.booked_at).toLocaleDateString() : ''],
                    ] as [string,string][]).map(([k,v])=>(
                      <div key={k} className="flex justify-between px-4 py-2.5 text-xs">
                        <span className="text-slate-500 font-semibold">{k}</span>
                        <span className="font-black text-slate-900">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer details — fetched from DB */}
                  {ownerSelectedBooking.customer_id && (
                    <CustomerDetailCard customerId={ownerSelectedBooking.customer_id} />
                  )}

                  {/* Action buttons inside modal */}
                  {ownerSelectedBooking.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={async ()=>{ await updateBookingStatus(ownerSelectedBooking.id,'confirmed'); setOwnerSelectedBooking(null); }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wide transition flex items-center justify-center gap-1.5">
                        ✓ Accept Booking
                      </button>
                      <button onClick={async ()=>{
                        if(!confirm('Decline this booking?')) return;
                        await declineBooking(ownerSelectedBooking.id);
                        setOwnerSelectedBooking(null);
                      }} className="px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-xs uppercase transition">
                        ✕ Decline
                      </button>
                    </div>
                  )}
                  {ownerSelectedBooking.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <button onClick={async ()=>{ await updateBookingStatus(ownerSelectedBooking.id,'completed'); setOwnerSelectedBooking(null); }}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase transition">
                        ✓ Mark Completed
                      </button>
                      <button onClick={async ()=>{ await cancelBooking(ownerSelectedBooking.id,'owner'); setOwnerSelectedBooking(null); }}
                        className="px-5 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-xs uppercase transition">
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                  {(ownerSelectedBooking.status === 'completed' || ownerSelectedBooking.status === 'cancelled') && (
                    <button onClick={async ()=>{
                      if (!confirm('Remove this booking from history?')) return;
                      await supabase.from('bookings').delete().eq('id', ownerSelectedBooking.id);
                      if (ownerAcc?.id) await refreshOwnerBookings(ownerAcc.id);
                      setOwnerSelectedBooking(null);
                      showToast('Booking removed from history');
                    }} className="w-full py-3 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 rounded-xl font-black text-xs uppercase transition">
                      🗑 Remove from History
                    </button>
                  )}
                  <button onClick={()=>setOwnerSelectedBooking(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
            {ownerSubTab==='bookings' && (
              <div className="space-y-3">
                {ownerBookings.length===0 ? (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20">
                    <p className="text-5xl mb-3">📬</p><p className="font-black text-slate-700">{t.noBookings}</p>
                  </div>
                ) : ownerBookings.map(b=>(
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <img src={b.vehicle_img||''} className="w-20 h-14 rounded-xl object-cover flex-shrink-0" alt=""/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-slate-900 text-sm">{b.vehicle_name||''}</p>
                            <p className="text-xs text-slate-400 mt-0.5">📅 {b.pickup_date||''} → {b.return_date||''} · {b.days}d</p>
                            <p className="text-xs text-slate-400">{(b.delivery_type||'pickup')==='delivery'?'🚚 '+t.delivery:'📍 '+t.selfPickup} · <span className="font-black text-slate-900">Rs. {b.total.toLocaleString()}</span> · <span className="text-emerald-600 font-black">You get Rs. {((b as any).owner_payout || Math.round(b.total*0.90)).toLocaleString()}</span></p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border flex-shrink-0 ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                        </div>
                      </div>
                    </div>
                    {b.status==='pending' && (
                      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                        <div className="flex gap-2">
                          <button onClick={()=>updateBookingStatus(b.id,'confirmed')}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-1.5">
                            ✓ {t.accept}
                          </button>
                          <button onClick={async ()=>{
                            if(!confirm('Decline this booking?')) return;
                            await declineBooking(b.id);
                          }} className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-xs uppercase transition">
                            ✕ {t.decline}
                          </button>
                          <button onClick={()=>setOwnerSelectedBooking(b)}
                            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase transition">
                            Details
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">The customer will receive an SMS confirmation automatically when you accept</p>
                      </div>
                    )}
                    {b.status==='confirmed' && (
                      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                        <div className="flex gap-2">
                          <button onClick={()=>updateBookingStatus(b.id,'completed')}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase transition">
                            ✓ Mark Completed
                          </button>
                          <button onClick={()=>cancelBooking(b.id, 'owner')}
                            className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-black text-xs uppercase transition">
                            ✕ Cancel
                          </button>
                          <button onClick={()=>setOwnerSelectedBooking(b)}
                            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase transition">
                            Details
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center">Cancelling will notify the customer via SMS and make the vehicle available again</p>
                      </div>
                    )}
                    {(b.status==='completed'||b.status==='cancelled') && (
                      <div className="border-t border-slate-100 px-4 py-2.5 flex justify-end">
                        <button onClick={()=>setOwnerSelectedBooking(b)}
                          className="text-xs font-black text-slate-500 hover:text-slate-900 transition">
                          {t.bookingDetails} →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ownerSubTab==='fleet' && (
              <>
                {(showAddForm||editingId) && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
                      <h3 className="font-black text-slate-900">{editingId?t.editVehicle:t.addNew}</h3>
                      <button onClick={()=>{ setShowAddForm(false); setEditingId(null); setPhotos([]); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-black text-xl transition">×</button>
                    </div>
                    <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.vehicleName} <span className="text-red-400">*</span></label>
                          <input required type="text" placeholder="e.g. Honda CB 150R" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition" value={newV.name} onChange={e=>setNewV({...newV,name:e.target.value})}/></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.vehicleType}</label>
                          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition" value={newV.type} onChange={e=>setNewV({...newV,type:e.target.value})}>
                            <option value="car">🚙 {t.cars}</option><option value="bike">🏍️ {t.bikes}</option><option value="tuk">🛺 {t.tuks}</option>
                          </select></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.transmission}</label>
                          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer" value={newV.transmission} onChange={e=>setNewV({...newV,transmission:e.target.value})}>
                            <option>{t.automatic}</option><option>{t.manual}</option></select></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.fuel}</label>
                          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer" value={newV.fuel} onChange={e=>setNewV({...newV,fuel:e.target.value})}>
                            <option>{t.petrol}</option><option>{t.hybrid}</option><option>{t.diesel}</option><option>{t.electric}</option></select></div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.priceDay} <span className="text-red-400">*</span></label>
                          <input type="number" required min="500" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition" value={newV.pricePerDay} onChange={e=>setNewV({...newV,pricePerDay:Number(e.target.value)})}/></div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Vehicle Photos</label>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${photos.length < 3 ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            {photos.length}/5 · min 3 required
                          </span>
                        </div>
                        {photos.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                            {photos.map((p, i) => (
                              <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200">
                                <img src={p} className="w-full h-full object-cover" alt={`Photo ${i+1}`}/>
                                {i === 0 && <span className="absolute top-1 left-1 text-[9px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded uppercase">Cover</span>}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                                  {i > 0 && <button type="button" onClick={()=>movePhoto(i,i-1)} className="w-6 h-6 bg-white rounded-full text-slate-700 text-xs font-black flex items-center justify-center">←</button>}
                                  <button type="button" onClick={()=>removePhoto(i)} className="w-6 h-6 bg-red-500 rounded-full text-white text-xs font-black flex items-center justify-center">×</button>
                                  {i < photos.length-1 && <button type="button" onClick={()=>movePhoto(i,i+1)} className="w-6 h-6 bg-white rounded-full text-slate-700 text-xs font-black flex items-center justify-center">→</button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {photos.length < 5 && (
                          <div
                            onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
                            onDragLeave={()=>setIsDragging(false)}
                            onDrop={e=>{e.preventDefault();setIsDragging(false);Array.from(e.dataTransfer.files).slice(0,5-photos.length).forEach(f=>processImg(f));}}
                            className={`border-2 border-dashed rounded-2xl relative flex items-center justify-center transition cursor-pointer py-5 ${isDragging?'border-emerald-500 bg-emerald-50':'border-slate-200 bg-slate-50 hover:border-slate-400'}`}>
                            <input type="file" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              onChange={e=>{if(e.target.files) Array.from(e.target.files).slice(0,5-photos.length).forEach(f=>processImg(f));}}/>
                            <div className="text-center pointer-events-none">
                              <p className="text-2xl mb-1">📸</p>
                              <p className="text-sm font-black text-slate-700">Drag & drop or click to add photos</p>
                              <p className="text-xs text-slate-400 mt-0.5">{5-photos.length} more can be added · First photo = cover</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Pickup Location (Google Maps)</label>
                        <input type="url"
                          placeholder="Paste Google Maps link — e.g. https://maps.google.com/?q=..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition"
                          value={newV.mapLink} onChange={e=>setNewV({...newV,mapLink:e.target.value})}/>
                        <p className="text-[10px] text-slate-400 mt-1.5">Google Maps eke "Share" → "Copy link" karala paste karanna · Optional but recommended</p>
                        {newV.mapLink && (
                          <a href={newV.mapLink} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-600 hover:underline">
                            📍 Preview location →
                          </a>
                        )}
                      </div>

                      <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t.description}</label>
                        <textarea rows={2} placeholder="AC, helmet, insurance..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition resize-none" value={newV.description} onChange={e=>setNewV({...newV,description:e.target.value})}/></div>
                      <div className="flex gap-3">
                        <button type="button" onClick={()=>{ setShowAddForm(false); setEditingId(null); setPhotos([]); }} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition">{t.cancel}</button>
                        <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wide transition shadow-md">{editingId?t.saveChanges:t.publishLive}</button>
                      </div>
                    </form>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 text-base">{t.yourFleet}</h3>
                    <span className="text-xs font-bold text-slate-500">{ownerFleet.filter(v=>vAvail(v)).length} {t.live} · {ownerFleet.filter(v=>!vAvail(v)).length} {t.hidden}</span>
                  </div>
                  {ownerFleet.length===0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20">
                      <p className="text-5xl mb-3">🚗</p><p className="font-black text-slate-700">{t.noVehicles}</p>
                      <button onClick={()=>setShowAddForm(true)} className="mt-5 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">{t.addFirst}</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {ownerFleet.map(v=>(
                        <div key={v.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition ${vAvail(v)?'border-slate-200':'border-slate-200 opacity-70'}`}>
                          <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                            <img src={v.image} alt={v.name} className="w-full h-full object-cover"/>
                            <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm ${vAvail(v)?'bg-emerald-500 text-white':'bg-slate-700 text-white'}`}>{vAvail(v)?t.liveLabel:t.hiddenLabel}</div>
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-black">{typeIcon(v.type)}</div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-black text-slate-900 text-sm leading-tight">{v.name}</h4>
                              <div className="text-right flex-shrink-0">
                              <p className="font-black text-slate-900 text-sm">Rs.{vPrice(v).toLocaleString()}</p>
                              <p className="text-[10px] text-emerald-600 font-bold">You get Rs.{Math.round(vPrice(v)*0.90).toLocaleString()}/day</p>
                            </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">{v.transmission} · {v.fuel} · {v.location}</p>
                            <div className="flex gap-2 pt-3 border-t border-slate-100">
                              <button onClick={()=>toggleAvail(v.id)} className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-wide border transition ${vAvail(v)?'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600':'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>{vAvail(v)?t.hide:t.goLive}</button>
                              <button onClick={()=>{ setEditingId(v.id); setShowAddForm(false); setNewV({name:v.name,type:v.type,transmission:v.transmission,fuel:v.fuel,pricePerDay:vPrice(v),description:v.description||'',mapLink:(v as any).mapLink||''}); setPhotos(v.images&&v.images.length>0?[...v.images]:[v.image]); window.scrollTo({top:0,behavior:'smooth'}); }} className="flex-1 py-2 rounded-xl font-black text-[11px] uppercase border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition">Edit</button>
                              <button onClick={()=>deleteVehicle(v.id)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition">🗑</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ HOME + DETAIL ══ */}
      {(view==='home'||view==='detail') && (
        <>
          {view==='home' && (
            <>
              <header className="relative bg-slate-900 text-white pt-14 pb-12 px-4 text-center overflow-hidden">
                <div className="absolute inset-0 pointer-events-none select-none">
                  <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600" className="w-full h-full object-cover opacity-20" alt=""/>
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 to-slate-900/80"/>
                </div>
                <div className="relative max-w-3xl mx-auto space-y-3 pointer-events-none">
                  <span className="inline-block text-xs bg-white/10 border border-white/20 text-white/80 font-bold px-3 py-1 rounded-full">🇱🇰 Sri Lanka's #1 Vehicle Rental Platform</span>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">Rent cars, bikes &<br/>tuk-tuks in Sri Lanka</h1>
                  <p className="text-slate-300 text-sm md:text-base font-medium">Verified hubs · No hidden fees · Book in 60 seconds</p>
                </div>
              </header>
              <div className="bg-white border-b border-slate-200 shadow-md">
                <div className="max-w-6xl mx-auto px-4 py-4">
                  <div className="flex flex-col md:flex-row gap-2">
                    {[
                      {label:t.cityLoc, el:<select value={filterCity} onChange={e=>setFilterCity(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none">{SL_CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select>},
                      {label:t.vehicleType, el:<select value={filterType} onChange={e=>setFilterType(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none"><option value="all">{t.allTypes}</option><option value="car">🚙 {t.cars}</option><option value="bike">🏍️ {t.bikes}</option><option value="tuk">🛺 {t.tuks}</option></select>},
                      {label:t.pickupDate, el:<input type="date" value={filterPickup} onChange={e=>setFilterPickup(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none" style={{colorScheme:'light'}}/>},
                      {label:t.returnDate, el:<input type="date" value={filterReturn} onChange={e=>setFilterReturn(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none" style={{colorScheme:'light'}}/>},
                    ].map(f=>(
                      <div key={f.label} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 hover:border-slate-400 focus-within:border-red-400 rounded-xl px-4 py-3 transition">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1.5">{f.label}</p>
                        {f.el}
                      </div>
                    ))}
                    <button onClick={()=>showToast(`${displayed.length} ${t.vehicles} ${t.available}${filterCity!=='All Sri Lanka'?' in '+filterCity:''}`, 'ok')}
                      className="flex-none bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black rounded-xl px-8 py-3 text-sm uppercase tracking-wide transition shadow-md flex items-center gap-2 whitespace-nowrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      {t.search}
                    </button>
                  </div>
                </div>
              </div>
              {/* ══ ADVANCED FILTERS ══ */}
              <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
                  <button onClick={()=>setShowAdvFilter(!showAdvFilter)}
                    className={`flex items-center gap-2 text-xs font-black px-3 py-2 rounded-xl border transition ${showAdvFilter?'bg-slate-900 text-white border-slate-900':'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    ⚙️ Advanced Filters {showAdvFilter ? '▲' : '▼'}
                  </button>
                  {(filterPriceMax < 50000 || filterTrans !== 'all' || filterFuel !== 'all') && (
                    <button onClick={()=>{ setFilterPriceMin(0); setFilterPriceMax(50000); setFilterTrans('all'); setFilterFuel('all'); }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 transition">Clear filters ×</button>
                  )}
                </div>
                {showAdvFilter && (
                  <div className="max-w-6xl mx-auto px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Min Price (Rs.)</label>
                      <input type="number" min="0" max="50000" step="500"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900 transition"
                        value={filterPriceMin || ''} placeholder="0"
                        onChange={e=>setFilterPriceMin(Number(e.target.value)||0)}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Max Price (Rs.)</label>
                      <input type="number" min="0" max="100000" step="500"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900 transition"
                        value={filterPriceMax === 50000 ? '' : filterPriceMax} placeholder="Any"
                        onChange={e=>setFilterPriceMax(Number(e.target.value)||50000)}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Transmission</label>
                      <select value={filterTrans} onChange={e=>setFilterTrans(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition">
                        <option value="all">Any</option>
                        <option value="automatic">Automatic</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fuel Type</label>
                      <select value={filterFuel} onChange={e=>setFilterFuel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition">
                        <option value="all">Any</option>
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="electric">Electric</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <section className="max-w-7xl mx-auto px-4 pt-5 pb-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[{label:t.allDeals,city:'All Sri Lanka',type:'all'},{label:'🚙 '+t.cars,city:'All Sri Lanka',type:'car'},{label:'🏍️ '+t.bikes,city:'All Sri Lanka',type:'bike'},{label:'🛺 '+t.tuks,city:'All Sri Lanka',type:'tuk'},{label:'📍 Colombo',city:'Colombo',type:'all'},{label:'📍 Galle',city:'Galle',type:'all'},{label:'📍 Kandy',city:'Kandy',type:'all'}].map(tag=>(
                    <button key={tag.label} onClick={()=>{ setFilterCity(tag.city); setFilterType(tag.type); }}
                      className={`text-xs font-bold border px-4 py-2 rounded-xl whitespace-nowrap transition ${filterCity===tag.city&&filterType===tag.type?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>{tag.label}</button>
                  ))}
                </div>
              </section>
              <section className="max-w-7xl mx-auto px-4 mt-2 mb-24">
                <h2 className="text-xl font-black text-slate-900 mb-5"><span className="text-red-500">{displayed.length}</span> {t.vehicles} {t.available}{filterCity!=='All Sri Lanka'?` in ${filterCity}`:''}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {displayed.map(v=>(
                    <article key={v.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
                      onClick={()=>{ setSelectedVehicle(v); setView('detail'); window.scrollTo({top:0,behavior:'smooth'}); }}>
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                        <img src={v.image} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                        <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow uppercase">{t.verified}</span>
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <button onClick={e=>{ e.stopPropagation(); toggleWishlist(v.id); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${wishlist.includes(v.id)?'bg-red-500 text-white':'bg-white/90 text-slate-400 hover:text-red-500'}`}>
                            {wishlist.includes(v.id) ? '❤️' : '🤍'}
                          </button>
                          <span className="text-lg">{typeIcon(v.type)}</span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{v.transmission}</span>
                            <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{v.fuel}</span>
                            <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase ml-auto">{v.location}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-red-500 transition-colors">{v.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{vShop(v)}</p>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.perDay}</p>
                            <span className="text-base font-black text-slate-900">{fmt(vPrice(v))}</span>
                            <p className="text-[9px] text-blue-500 font-bold mt-0.5">+{fmt(Math.round(vPrice(v)*0.10))} booking fee</p>
                          </div>
                          <div className="flex items-center gap-1"><span className="text-amber-400 text-xs">★</span><span className="text-xs font-bold text-slate-700">{v.rating.toFixed(1)}</span></div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {displayed.length===0 && (
                    <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-5xl mb-4">🚗</p>
                      <p className="text-base font-black text-slate-700">
                        {filterCity !== 'All Sri Lanka' || filterType !== 'all' ? t.noVehiclesFound : 'No vehicles listed yet'}
                      </p>
                      <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
                        {filterCity !== 'All Sri Lanka' || filterType !== 'all'
                          ? <button onClick={()=>{ setFilterCity('All Sri Lanka'); setFilterType('all'); }} className="text-red-500 underline font-bold">{t.clearFilters}</button>
                          : 'Vehicle owners can list their cars, bikes & tuk-tuks via Partner Hub'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
              {/* ══ FAQ SECTION ══ */}
              <FaqSection />

              {/* ══ WHY BOOK WITH DRIVO ══ */}
              <section className="bg-white py-16 px-4 border-t border-slate-100">
                <div className="max-w-5xl mx-auto">
                  <div className="text-center mb-12">
                    <span className="text-xs font-black text-red-500 uppercase tracking-widest">All Inclusive with Drivo</span>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">Why Book with Us?</h2>
                    <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">Every vehicle on Drivo is verified. Simply book, show up, and enjoy your ride.</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                      { icon: '✅', title: 'Verified Vehicles', desc: 'Every car, bike & tuk-tuk is inspected and verified by our team' },
                      { icon: '🛡️', title: 'Secure Booking', desc: 'NIC & license verified renters. Your vehicle is in safe hands' },
                      { icon: '💬', title: 'WhatsApp Support', desc: 'Direct contact with the shop. 24/7 communication guaranteed' },
                      { icon: '🗺️', title: 'GPS Pickup Location', desc: 'Every listing has a Google Maps pin. No confusion at pickup' },
                      { icon: '🚗', title: 'Cars, Bikes & Tuk-tuks', desc: 'Sri Lanka largest multi-vehicle rental marketplace' },
                      { icon: '💸', title: 'No Hidden Fees', desc: 'Transparent pricing. Only a 10% booking fee, nothing more' },
                      { icon: '🇱🇰', title: 'Support Local', desc: 'Every booking supports a local Sri Lankan vehicle owner' },
                      { icon: '⚡', title: 'Book in 60 Seconds', desc: 'Pick dates, select time, confirm. Instant booking request sent' },
                    ].map(item => (
                      <div key={item.title} className="text-center group">
                        <div className="w-16 h-16 bg-slate-50 border-2 border-slate-100 group-hover:border-red-200 group-hover:bg-red-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 transition-all duration-300">
                          {item.icon}
                        </div>
                        <h3 className="font-black text-slate-900 text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stats bar */}
                  <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { num: '100%', label: 'Verified Listings' },
                      { num: '60s', label: 'Average Booking Time' },
                      { num: '0', label: 'Hidden Charges' },
                      { num: '24/7', label: 'WhatsApp Support' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-900 rounded-2xl p-5 text-center">
                        <p className="text-2xl font-black text-white">{s.num}</p>
                        <p className="text-xs text-slate-400 mt-1 font-semibold">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <footer className="bg-slate-900 text-slate-500 py-8 px-4 text-center text-xs">
                <div className="flex items-center justify-center gap-2 mb-2"><DrivoLogo className="w-6 h-6"/><span className="font-black text-white text-sm">drivo</span><span className="text-slate-700">·</span><span>Sri Lanka's Vehicle Rental Marketplace</span></div>
                <p className="text-slate-700">© 2026 Drivo LK</p>
              </footer>
            </>
          )}

          {view==='detail' && selectedVehicle && (
            <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-24">
              <button onClick={()=>{ setView('home'); setSelectedVehicle(null); setBookingDone(false); }} className="text-sm font-bold text-slate-500 hover:text-red-500 mb-6 flex items-center gap-1.5 transition group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> {t.backToAll}
              </button>
              {bookingDone ? (
                <div className="max-w-md mx-auto text-center py-16">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">{t.bookingSent}</h2>
                  <p className="text-slate-500 text-sm mb-6">{vShop(selectedVehicle)} will contact you via WhatsApp within 30 minutes.</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm space-y-2 mb-4">
                    {([
                      [t.vehicleRented, selectedVehicle.name],
                      ['Pickup Date', `${filterPickup} at ${pickupTime}`],
                      ['Return Date', filterReturn],
                      ['Days', `${days} day${days>1?'s':''}`],
                      ['Total to Pay', `Rs. ${total.toLocaleString()}`],
                    ] as [string,string][]).map(([k,v])=>(
                      <div key={k} className={`flex justify-between ${k==='Total to Pay'?'font-black text-slate-900 border-t border-slate-200 pt-2 mt-1':''}`}>
                        <span className="text-slate-500">{k}</span>
                        <span className={k==='Total to Pay'?'text-red-500 font-black':'font-bold'}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {vMap(selectedVehicle) && (
                    <a href={vMap(selectedVehicle)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 mb-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition shadow-md">
                      📍 Get Directions to Pickup Location
                    </a>
                  )}
                  {sessionRole==='customer' && <p className="text-xs text-emerald-600 font-bold mb-4">✓ Saved to your booking history</p>}
                  <div className="flex gap-3 justify-center flex-wrap">
                    {sessionRole==='customer' && <button onClick={()=>setView('custDash')} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition">{t.myBookings}</button>}
                    <button onClick={resetToHome} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition">{t.backToHome}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{typeIcon(selectedVehicle.type)}</span>
                        <span className="text-xs font-black bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded border border-blue-100 uppercase">{selectedVehicle.type}</span>
                        <span className="text-xs text-amber-500 font-bold">★ {selectedVehicle.rating.toFixed(1)}</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{selectedVehicle.name}</h2>
                      <p className="text-sm text-slate-500 mt-1">{vShop(selectedVehicle)} · <span className="text-blue-600 font-medium">{selectedVehicle.location}</span></p>
                      {(selectedVehicle as any).mapLink && (
                        <a href={(selectedVehicle as any).mapLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-sm">
                          📍 Get Directions on Google Maps
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(selectedVehicle.images&&selectedVehicle.images.length>0?selectedVehicle.images:[selectedVehicle.image]).map((img,i)=>(
                        <div key={i} className={`relative bg-slate-200 rounded-2xl overflow-hidden ${i===0?'col-span-2 sm:col-span-2 aspect-[16/9]':'aspect-video'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/>
                          {i===0 && <span className="absolute top-2 left-2 text-[10px] bg-slate-900/70 text-white font-black px-2 py-0.5 rounded uppercase backdrop-blur-sm">Cover photo</span>}
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="flex border-b border-slate-200 bg-slate-50">
                        {([['details',t.details],['docs',t.documents],['faq',t.faq]] as [string,string][]).map(([k,l])=>(
                          <button key={k} onClick={()=>setDetailTab(k as any)} className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition ${detailTab===k?'bg-white text-slate-900 border-b-2 border-red-500':'text-slate-400 hover:text-slate-700'}`}>{l}</button>
                        ))}
                      </div>
                      <div className="p-5">
                        {detailTab==='details' && <div className="space-y-4"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">{([[t.transmission,selectedVehicle.transmission],[t.fuel,selectedVehicle.fuel],['AC','Included'],['Insurance','Full Cover']] as [string,string][]).map(([l,v])=>(<div key={l} className="bg-slate-50 p-3 rounded-xl border border-slate-200"><p className="text-[10px] text-slate-400 font-bold uppercase">{l}</p><p className="font-bold text-sm text-slate-800 mt-0.5">{v}</p></div>))}</div><p className="text-sm text-slate-600 leading-relaxed">{selectedVehicle.description}</p></div>}
                        {detailTab==='docs' && <div className="space-y-2 text-sm"><p className="font-bold text-slate-900 mb-3">Required at pickup:</p>{['National ID (NIC)','Valid Driving License','Phone for WhatsApp'].map(i=>(<div key={i} className="flex items-center gap-2 text-slate-700"><span className="text-emerald-500 font-bold">✓</span>{i}</div>))}</div>}
                        {detailTab==='faq' && <div className="space-y-3">{[['Is fuel included?','No — return with same level.'],['Can I extend?','Yes — WhatsApp the shop.'],['Security deposit?','Most vehicles: no deposit.']].map(([q,a])=>(<div key={q} className="bg-slate-50 p-3 rounded-xl border border-slate-200"><p className="font-bold text-slate-900 text-sm">{q}</p><p className="text-slate-500 mt-0.5 text-xs">{a}</p></div>))}</div>}
                        {detailTab==='details' && selectedVehicle && <VehicleReviews vehicleId={selectedVehicle.id} />}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xl space-y-4 lg:sticky lg:top-24">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-black text-lg text-slate-900">{t.bookThisRide}</h3>
                      <span className="text-sm font-black text-red-500">{fmt(vPrice(selectedVehicle))}<span className="text-xs font-semibold text-slate-400">/{t.perDay.toLowerCase()}</span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.pickupDate}</label><input type="date" className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer" value={filterPickup} onChange={e=>setFilterPickup(e.target.value)}/></div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.returnDate}</label><input type="date" className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer" value={filterReturn} onChange={e=>setFilterReturn(e.target.value)}/></div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t.duration}</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <button onClick={()=>setDays(d=>Math.max(1,d-1))} className="px-4 py-2.5 font-black hover:bg-slate-200 transition text-lg">−</button>
                        <span className="w-full text-center font-black text-sm text-slate-900">{days} day{days>1?'s':''}</span>
                        <button onClick={()=>setDays(d=>d+1)} className="px-4 py-2.5 font-black hover:bg-slate-200 transition text-lg">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">⏰ Pickup Time</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(t=>(
                          <button key={t} onClick={()=>setPickupTime(t)}
                            className={`py-2 rounded-xl text-[11px] font-black border transition ${pickupTime===t?'bg-slate-900 text-white border-slate-900':'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">Selected: <span className="font-black text-slate-700">{pickupTime}</span> · Confirm with shop via WhatsApp</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{t.pickupMethod}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {([['pickup','📍 '+t.selfPickup,'Free'],['delivery','🚚 '+t.delivery,'+Rs.1,500']] as [string,string,string][]).map(([val,label,note])=>(
                          <button key={val} onClick={()=>setDeliveryType(val as any)} className={`py-2.5 text-xs font-bold rounded-xl border transition ${deliveryType===val?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{label}<br/><span className="text-[10px] font-medium opacity-70">{note}</span></button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 font-semibold text-slate-600">
                      <div className="flex justify-between"><span>{fmt(vPrice(selectedVehicle))} × {days}d</span><span className="font-bold text-slate-900">{fmt(base)}</span></div>
                      {deliveryType==='delivery' && <div className="flex justify-between"><span>🚚 {t.delivery}</span><span className="font-bold">{fmt(delFee)}</span></div>}
                      <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200 text-slate-900"><span>Total to Shop</span><span className="text-slate-900">{fmt(total)}</span></div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 mt-1 space-y-1">
                        <div className="flex justify-between text-blue-700"><span>🔒 Drivo booking fee (10%)</span><span className="font-black">{fmt(platformFeeAmt)}</span></div>
                        <p className="text-[10px] text-blue-500 font-medium">Booking fee paid to Drivo · Rest goes to shop</p>
                      </div>
                    </div>
                    <button onClick={confirmBooking} className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wide shadow-md transition">Confirm Booking →</button>
                    <p className="text-[10px] text-center text-slate-400">{t.noPayment}</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}