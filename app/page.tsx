'use client';

import { useState, useEffect, useCallback } from 'react';
import { Vehicle, mockVehicles } from './data/vehicles';

// ─── LOGO ────────────────────────────────────────────────────────────────────
function DrivoLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="28" fill="#111"/>
      <path d="M38 35H55C65.5 35 72 41.5 72 50C72 58.5 65.5 65 55 65H30V60H38V35Z" fill="white"/>
      <path d="M38 60H53C61 60 66 55.5 66 50C66 44.5 61 40 53 40H38V60Z" fill="#111"/>
    </svg>
  );
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SL_CITIES = ['All Sri Lanka','Colombo','Katunayake','Kandy','Galle','Negombo','Trincomalee','Jaffna','Nuwara Eliya','Ella','Mirissa'];
const FLEET_KEY   = 'drivo_fleet_v3';
const ACCOUNTS_KEY = 'drivo_accounts_v1';   // { [email]: { password, profile } }
const SESSION_KEY  = 'drivo_session_v1';    // logged-in email

type RawVehicle = Vehicle & { isAvailable: boolean };
type Account = {
  email: string; password: string;
  profile: { shopName: string; ownerName: string; phone: string; whatsapp: string; city: string; };
  fleet: RawVehicle[];
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Home() {

  // ── customer fleet (all available) ───────────────────────────────
  const [allVehicles, setAllVehicles]   = useState<RawVehicle[]>([]);
  const [displayed,   setDisplayed]     = useState<RawVehicle[]>([]);

  // ── filters ───────────────────────────────────────────────────────
  const [filterCity,   setFilterCity]   = useState('All Sri Lanka');
  const [filterType,   setFilterType]   = useState('all');
  const [filterPickup, setFilterPickup] = useState('');
  const [filterReturn, setFilterReturn] = useState('');

  // ── navigation ────────────────────────────────────────────────────
  const [view, setView] = useState<'home'|'detail'|'auth'|'dashboard'>('home');
  const [authTab, setAuthTab] = useState<'login'|'register'>('login');
  const [selectedVehicle, setSelectedVehicle] = useState<RawVehicle|null>(null);
  const [detailTab, setDetailTab] = useState<'details'|'docs'|'faq'>('details');

  // ── booking ───────────────────────────────────────────────────────
  const [days, setDays]               = useState(1);
  const [deliveryType, setDeliveryType] = useState<'pickup'|'delivery'>('pickup');
  const [bookingDone, setBookingDone] = useState(false);

  // ── currency ──────────────────────────────────────────────────────
  const [currency, setCurrency] = useState('LKR');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── AUTH state ────────────────────────────────────────────────────
  const [loggedInEmail, setLoggedInEmail] = useState<string|null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account|null>(null);

  // login form
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError]       = useState('');

  // register form
  const [regEmail,    setRegEmail]    = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm,  setRegConfirm]  = useState('');
  const [regShop,     setRegShop]     = useState('');
  const [regOwner,    setRegOwner]    = useState('');
  const [regPhone,    setRegPhone]    = useState('');
  const [regCity,     setRegCity]     = useState('Colombo');
  const [regError,    setRegError]    = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw,   setShowRegPw]   = useState(false);

  // ── dashboard / vehicle form ───────────────────────────────────────
  const [ownerFleet,    setOwnerFleet]    = useState<RawVehicle[]>([]);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [editingId,     setEditingId]     = useState<string|null>(null);
  const [newV, setNewV] = useState({ name:'', type:'car', transmission:'Automatic', fuel:'Petrol', pricePerDay:5000, description:'' });
  const [imgPreview,    setImgPreview]    = useState('');
  const [isDragging,    setIsDragging]    = useState(false);
  const [editProfile,   setEditProfile]   = useState(false);
  const [editProfileData, setEditProfileData] = useState({ shopName:'', ownerName:'', phone:'', whatsapp:'', city:'Colombo' });

  // ── toast ─────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{msg:string;type:'ok'|'err'}|null>(null);
  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3000);
  };

  // ─── HELPERS: accounts localStorage ─────────────────────────────
  const getAccounts = (): Record<string, Account> => {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'{}'); } catch { return {}; }
  };
  const saveAccounts = (acc: Record<string, Account>) => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
  };

  // ─── BOOTSTRAP ──────────────────────────────────────────────────
  useEffect(()=>{
    // Load base mock vehicles (for customer page)
    try {
      const raw = localStorage.getItem(FLEET_KEY);
      const base: RawVehicle[] = raw ? JSON.parse(raw) : mockVehicles.map(v=>({...v,isAvailable:true}));
      if(!raw) localStorage.setItem(FLEET_KEY, JSON.stringify(base));
      setAllVehicles(base);
    } catch {}

    // Restore session
    try {
      const email = localStorage.getItem(SESSION_KEY);
      if(email) {
        const accs = getAccounts();
        if(accs[email]) { setLoggedInEmail(email); setCurrentAccount(accs[email]); setOwnerFleet(accs[email].fleet||[]); }
      }
    } catch {}
  },[]);

  // ─── BUILD displayed (customer) from ALL accounts' live vehicles ──
  useEffect(()=>{
    // Merge mock base + all owner fleets that are available
    const accs = getAccounts();
    const ownerVehicles: RawVehicle[] = Object.values(accs).flatMap(a => (a.fleet||[]).filter(v=>v.isAvailable));
    // Deduplicate with base (prefer owner copy if same id)
    const baseAvail = allVehicles.filter(v=>v.isAvailable && !ownerVehicles.find(ov=>ov.id===v.id));
    let merged = [...ownerVehicles, ...baseAvail];
    if(filterCity !== 'All Sri Lanka') merged = merged.filter(v=>v.location.toLowerCase()===filterCity.toLowerCase());
    if(filterType !== 'all') merged = merged.filter(v=>v.type===filterType);
    setDisplayed(merged);
  },[allVehicles, filterCity, filterType, ownerFleet]);

  // auto days
  useEffect(()=>{
    if(filterPickup && filterReturn){
      const d = Math.ceil((new Date(filterReturn).getTime()-new Date(filterPickup).getTime())/86400000);
      if(d>0) setDays(d);
    }
  },[filterPickup,filterReturn]);

  // ─── CURRENCY ────────────────────────────────────────────────────
  const rate = currency==='USD'?0.0033:currency==='AED'?0.012:1;
  const sign = currency==='USD'?'$':currency==='AED'?'AED':'Rs.';
  const fmt  = (p:number)=>`${sign} ${(p*rate).toLocaleString(undefined,{maximumFractionDigits:currency==='LKR'?0:1})}`;

  // ─── SEARCH ──────────────────────────────────────────────────────
  const handleSearch = () => {
    // triggers via useEffect above — just give feedback
    showToast(`Showing ${displayed.length} vehicles${filterCity!=='All Sri Lanka'?' in '+filterCity:''}`, 'ok');
  };

  // ─── RESET HOME ──────────────────────────────────────────────────
  const resetToHome = () => {
    setView('home'); setSelectedVehicle(null); setBookingDone(false);
    setMobileMenuOpen(false); setFilterCity('All Sri Lanka'); setFilterType('all');
    setFilterPickup(''); setFilterReturn('');
  };

  // ─── LOGOUT ──────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setLoggedInEmail(null); setCurrentAccount(null); setOwnerFleet([]);
    resetToHome(); showToast('Logged out');
  };

  // ─── LOGIN ───────────────────────────────────────────────────────
  const handleLogin = () => {
    setLoginError('');
    if(!loginEmail.trim() || !loginPassword.trim()){ setLoginError('Email and password required'); return; }
    const accs = getAccounts();
    const acc = accs[loginEmail.toLowerCase().trim()];
    if(!acc){ setLoginError('Account not found. Please register first.'); return; }
    if(acc.password !== loginPassword){ setLoginError('Wrong password. Try again.'); return; }
    localStorage.setItem(SESSION_KEY, loginEmail.toLowerCase().trim());
    setLoggedInEmail(loginEmail.toLowerCase().trim());
    setCurrentAccount(acc);
    setOwnerFleet(acc.fleet||[]);
    setView('dashboard');
    showToast(`Welcome back, ${acc.profile.shopName}! 👋`);
  };

  // ─── REGISTER ────────────────────────────────────────────────────
  const handleRegister = () => {
    setRegError('');
    if(!regEmail.trim())    { setRegError('Email required'); return; }
    if(!regPassword.trim()) { setRegError('Password required'); return; }
    if(regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }
    if(regPassword.length < 6)     { setRegError('Password must be at least 6 characters'); return; }
    if(!regShop.trim())  { setRegError('Shop name required'); return; }
    if(!regPhone.trim()) { setRegError('Phone number required'); return; }
    const accs = getAccounts();
    const key = regEmail.toLowerCase().trim();
    if(accs[key]) { setRegError('Email already registered. Please login.'); return; }
    const newAcc: Account = {
      email: key, password: regPassword,
      profile: { shopName:regShop, ownerName:regOwner, phone:regPhone, whatsapp:regPhone, city:regCity },
      fleet: [],
    };
    accs[key] = newAcc;
    saveAccounts(accs);
    localStorage.setItem(SESSION_KEY, key);
    setLoggedInEmail(key); setCurrentAccount(newAcc); setOwnerFleet([]);
    setView('dashboard');
    showToast(`Welcome to Drivo, ${regShop}! 🎉`);
  };

  // ─── SAVE OWNER FLEET ────────────────────────────────────────────
  const saveOwnerFleet = useCallback((next: RawVehicle[]) => {
    if(!loggedInEmail) return;
    const accs = getAccounts();
    if(accs[loggedInEmail]) {
      accs[loggedInEmail].fleet = next;
      saveAccounts(accs);
      setCurrentAccount({...accs[loggedInEmail]});
    }
    setOwnerFleet(next);
  },[loggedInEmail]);

  // ─── VEHICLE SUBMIT ──────────────────────────────────────────────
  const handleVehicleSubmit = (e:React.FormEvent) => {
    e.preventDefault();
    if(!newV.name.trim()){ showToast('Vehicle name liyannam!','err'); return; }
    const img = imgPreview || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600';

    if(editingId){
      const next = ownerFleet.map(v=> v.id===editingId
        ? {...v,name:newV.name,type:newV.type as any,transmission:newV.transmission,fuel:newV.fuel,pricePerDay:Number(newV.pricePerDay),description:newV.description,image:imgPreview||v.image}
        : v);
      saveOwnerFleet(next); showToast('Vehicle updated ✓');
    } else {
      const fresh: RawVehicle = {
        id:`v-${Date.now()}`, name:newV.name, type:newV.type as any,
        transmission:newV.transmission, fuel:newV.fuel, pricePerDay:Number(newV.pricePerDay),
        shopName:currentAccount?.profile.shopName||'', location:currentAccount?.profile.city||'Colombo',
        rating:5.0, image:img, images:[img],
        description:newV.description||'Fresh listing from verified partner.', isAvailable:true,
      };
      saveOwnerFleet([fresh,...ownerFleet]); showToast('Vehicle published! 🚀');
    }
    setNewV({name:'',type:'car',transmission:'Automatic',fuel:'Petrol',pricePerDay:5000,description:''});
    setImgPreview(''); setShowAddForm(false); setEditingId(null);
  };

  const toggleAvail = (id:string) => {
    const next = ownerFleet.map(v=> v.id===id ? {...v,isAvailable:!v.isAvailable} : v);
    saveOwnerFleet(next);
    const v = ownerFleet.find(v=>v.id===id);
    showToast(v?.isAvailable ? `"${v.name}" hidden` : `"${v?.name}" is now live!`);
  };

  const deleteVehicle = (id:string) => {
    if(!confirm('Delete this vehicle?')) return;
    saveOwnerFleet(ownerFleet.filter(v=>v.id!==id)); showToast('Deleted','err');
  };

  const processImg = (file:File) => {
    const r=new FileReader(); r.onloadend=()=>setImgPreview(r.result as string); r.readAsDataURL(file);
  };

  const typeIcon = (t:string) => t==='car'?'🚙':t==='bike'?'🏍️':'🛺';

  // Booking
  const base   = selectedVehicle ? selectedVehicle.pricePerDay*days : 0;
  const delFee = deliveryType==='delivery' ? 1500 : 0;
  const total  = base+delFee;

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl transition-all ${toast.type==='ok'?'bg-slate-900 text-white':'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* ══════════ NAV ══════════ */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

          <button onClick={resetToHome} className="flex items-center gap-2 focus:outline-none">
            <DrivoLogo className="w-9 h-9"/>
            <span className="text-xl font-black tracking-tighter text-slate-900">drivo</span>
            <span className="hidden sm:block text-[9px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">LK</span>
          </button>

          <div className="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-500">
            <button onClick={resetToHome} className={`py-2 transition hover:text-slate-900 ${view==='home'?'text-slate-900 border-b-2 border-slate-900':''}`}>Daily Rentals</button>
            <button className="py-2 hover:text-slate-900 transition">Monthly</button>
            <button className="py-2 hover:text-slate-900 transition">Long-term</button>
          </div>

          <div className="flex items-center gap-2">
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="bg-slate-100 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer">
              <option value="LKR">LKR</option><option value="USD">USD</option><option value="AED">AED</option>
            </select>

            {/* Mobile hamburger */}
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="block w-5 h-0.5 bg-slate-700 mb-1"/><span className="block w-5 h-0.5 bg-slate-700 mb-1"/><span className="block w-5 h-0.5 bg-slate-700"/>
            </button>

            {/* Auth / Dashboard button */}
            {loggedInEmail ? (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={()=>setView('dashboard')}
                  className={`text-xs font-black px-3 py-2 rounded-xl transition border ${view==='dashboard'?'bg-slate-900 border-slate-900 text-white':'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>
                  My Dashboard
                </button>
                <button onClick={logout} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-500 transition">
                  Log out
                </button>
              </div>
            ) : (
              <button onClick={()=>{ setView('auth'); setAuthTab('login'); }}
                className="hidden md:flex text-xs font-black px-4 py-2 rounded-xl bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 transition">
                Partner Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-2 shadow-md">
            {['Daily Rentals','Monthly','Long-term','FAQ'].map(item=>(
              <button key={item} className="block w-full text-left py-2 text-sm font-semibold text-slate-700 hover:text-red-500 transition">{item}</button>
            ))}
            {loggedInEmail ? (
              <>
                <button onClick={()=>{ setView('dashboard'); setMobileMenuOpen(false); }} className="w-full py-2.5 text-sm font-black bg-slate-900 text-white rounded-xl">My Dashboard</button>
                <button onClick={logout} className="w-full py-2 text-sm font-bold text-red-500">Log out</button>
              </>
            ) : (
              <button onClick={()=>{ setView('auth'); setMobileMenuOpen(false); }} className="w-full py-2.5 text-sm font-black bg-slate-900 text-white rounded-xl">Partner Login / Register</button>
            )}
          </div>
        )}
      </nav>

      {/* ══════════ AUTH PAGE ══════════ */}
      {view==='auth' && (
        <div className="min-h-[calc(100vh-64px)] bg-slate-100 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[440px]">

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

              {/* Top banner */}
              <div className="bg-slate-900 px-8 py-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <DrivoLogo className="w-9 h-9"/>
                  <span className="text-white font-black text-xl">drivo</span>
                  <span className="text-[9px] bg-emerald-500 text-slate-900 font-black px-2 py-0.5 rounded uppercase tracking-wider ml-1">Partner</span>
                </div>
                <h2 className="text-white text-2xl font-black">
                  {authTab==='login' ? 'Welcome back' : 'Create your shop'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {authTab==='login' ? 'Sign in to manage your fleet' : 'Start listing vehicles on Drivo'}
                </p>
              </div>

              {/* Tab switcher */}
              <div className="flex border-b border-slate-200">
                {(['login','register'] as const).map(tab=>(
                  <button key={tab} onClick={()=>{ setAuthTab(tab); setLoginError(''); setRegError(''); }}
                    className={`flex-1 py-3.5 text-sm font-black uppercase tracking-wide transition ${authTab===tab?'text-slate-900 border-b-2 border-slate-900 bg-white':'text-slate-400 bg-slate-50 hover:text-slate-700'}`}>
                    {tab==='login'?'Sign In':'Register'}
                  </button>
                ))}
              </div>

              <div className="px-8 py-7">

                {/* ── LOGIN FORM ── */}
                {authTab==='login' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input type="email" placeholder="you@example.com" autoComplete="email"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                        value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                      <div className="relative">
                        <input type={showLoginPw?'text':'password'} placeholder="••••••••" autoComplete="current-password"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                          value={loginPassword} onChange={e=>setLoginPassword(e.target.value)}
                          onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                        <button type="button" onClick={()=>setShowLoginPw(!showLoginPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1">
                          {showLoginPw?'HIDE':'SHOW'}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl">
                        ⚠️ {loginError}
                      </div>
                    )}

                    <button onClick={handleLogin}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg mt-2">
                      Sign In →
                    </button>

                    <p className="text-center text-xs text-slate-400 pt-1">
                      No account?{' '}
                      <button onClick={()=>setAuthTab('register')} className="text-slate-700 font-black hover:underline">Register here</button>
                    </p>
                  </div>
                )}

                {/* ── REGISTER FORM ── */}
                {authTab==='register' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Email Address <span className="text-red-400">*</span></label>
                        <input type="email" placeholder="you@example.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                          value={regEmail} onChange={e=>setRegEmail(e.target.value)}/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Password <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <input type={showRegPw?'text':'password'} placeholder="Min 6 chars"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                            value={regPassword} onChange={e=>setRegPassword(e.target.value)}/>
                          <button type="button" onClick={()=>setShowRegPw(!showRegPw)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black">{showRegPw?'HIDE':'SHOW'}</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password <span className="text-red-400">*</span></label>
                        <input type="password" placeholder="Repeat password"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                          value={regConfirm} onChange={e=>setRegConfirm(e.target.value)}/>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Shop Details</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Shop / Hub Name <span className="text-red-400">*</span></label>
                          <input type="text" placeholder="e.g. Galle Road Rentals"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                            value={regShop} onChange={e=>setRegShop(e.target.value)}/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Your Name</label>
                            <input type="text" placeholder="Owner name"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                              value={regOwner} onChange={e=>setRegOwner(e.target.value)}/>
                          </div>
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Phone <span className="text-red-400">*</span></label>
                            <input type="tel" placeholder="077XXXXXXX"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition placeholder:text-slate-300"
                              value={regPhone} onChange={e=>setRegPhone(e.target.value)}/>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">City</label>
                          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition"
                            value={regCity} onChange={e=>setRegCity(e.target.value)}>
                            {SL_CITIES.slice(1).map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {regError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl">
                        ⚠️ {regError}
                      </div>
                    )}

                    <button onClick={handleRegister}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-black text-sm uppercase tracking-wider transition shadow-lg">
                      Create Account & Dashboard →
                    </button>

                    <p className="text-center text-xs text-slate-400">
                      Already registered?{' '}
                      <button onClick={()=>setAuthTab('login')} className="text-slate-700 font-black hover:underline">Sign in</button>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ OWNER DASHBOARD ══════════ */}
      {view==='dashboard' && currentAccount && (
        <div className="bg-slate-100 min-h-[calc(100vh-64px)]">

          {/* Dashboard topbar */}
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                  {currentAccount.profile.shopName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-slate-900 text-base leading-tight">{currentAccount.profile.shopName}</p>
                  <p className="text-xs text-slate-500 font-medium">{currentAccount.profile.city} · {currentAccount.profile.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                  <span>{ownerFleet.length} <span className="text-slate-400 font-medium">total</span></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600">{ownerFleet.filter(v=>v.isAvailable).length} <span className="font-medium text-slate-400">live</span></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-red-500">{ownerFleet.filter(v=>!v.isAvailable).length} <span className="font-medium text-slate-400">hidden</span></span>
                </div>
                <button onClick={()=>{ setEditProfile(true); setEditProfileData(currentAccount.profile); }}
                  className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">
                  Edit Profile
                </button>
                <button onClick={()=>{ setShowAddForm(true); setEditingId(null); setNewV({name:'',type:'car',transmission:'Automatic',fuel:'Petrol',pricePerDay:5000,description:''}); setImgPreview(''); }}
                  className="text-xs font-black px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm">
                  <span className="text-lg leading-none">+</span> Add Vehicle
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

            {/* Edit Profile Modal */}
            {editProfile && (
              <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-black text-slate-900">Edit Shop Profile</h3>
                    <button onClick={()=>setEditProfile(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
                  </div>
                  <div className="p-6 space-y-3">
                    {[
                      {label:'Shop Name',key:'shopName',ph:'e.g. Galle Road Rentals'},
                      {label:'Owner Name',key:'ownerName',ph:'Your name'},
                      {label:'Phone',key:'phone',ph:'077XXXXXXX'},
                      {label:'WhatsApp',key:'whatsapp',ph:'Same or different'},
                    ].map(f=>(
                      <div key={f.key}>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
                        <input type="text" placeholder={f.ph}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 transition"
                          value={(editProfileData as any)[f.key]}
                          onChange={e=>setEditProfileData({...editProfileData,[f.key]:e.target.value})}/>
                      </div>
                    ))}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">City</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer"
                        value={editProfileData.city} onChange={e=>setEditProfileData({...editProfileData,city:e.target.value})}>
                        {SL_CITIES.slice(1).map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <button onClick={()=>{
                      if(!loggedInEmail) return;
                      const accs = getAccounts();
                      if(accs[loggedInEmail]){ accs[loggedInEmail].profile = editProfileData; saveAccounts(accs); setCurrentAccount({...accs[loggedInEmail]}); }
                      setEditProfile(false); showToast('Profile updated ✓');
                    }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-wide hover:bg-slate-800 transition mt-1">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add / Edit form */}
            {(showAddForm || editingId) && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-black text-slate-900">{editingId?'📝 Edit Vehicle':'➕ Add New Vehicle'}</h3>
                  <button onClick={()=>{ setShowAddForm(false); setEditingId(null); setImgPreview(''); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-black text-xl transition">×</button>
                </div>
                <form onSubmit={handleVehicleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Name / Model <span className="text-red-400">*</span></label>
                      <input required type="text" placeholder="e.g. Honda CB 150R 2023"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition"
                        value={newV.name} onChange={e=>setNewV({...newV,name:e.target.value})}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Type</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-slate-900 transition"
                        value={newV.type} onChange={e=>setNewV({...newV,type:e.target.value})}>
                        <option value="car">🚙 Car / SUV / Van</option>
                        <option value="bike">🏍️ Bike / Scooter</option>
                        <option value="tuk">🛺 Tuk-tuk</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Transmission</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer"
                        value={newV.transmission} onChange={e=>setNewV({...newV,transmission:e.target.value})}>
                        <option>Automatic</option><option>Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fuel</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer"
                        value={newV.fuel} onChange={e=>setNewV({...newV,fuel:e.target.value})}>
                        <option>Petrol</option><option>Hybrid</option><option>Diesel</option><option>Electric</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Price / Day (LKR) <span className="text-red-400">*</span></label>
                      <input type="number" required min="500"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-slate-900 focus:bg-white transition"
                        value={newV.pricePerDay} onChange={e=>setNewV({...newV,pricePerDay:Number(e.target.value)})}/>
                    </div>
                  </div>
                  {/* Image upload */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Photo</label>
                    <div onDragOver={e=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)}
                      onDrop={e=>{e.preventDefault();setIsDragging(false);if(e.dataTransfer.files[0])processImg(e.dataTransfer.files[0]);}}
                      className={`border-2 border-dashed rounded-2xl relative min-h-[130px] flex items-center justify-center transition cursor-pointer ${isDragging?'border-emerald-500 bg-emerald-50':'border-slate-200 bg-slate-50 hover:border-slate-400'}`}>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={e=>{if(e.target.files?.[0])processImg(e.target.files[0]);}}/>
                      {imgPreview
                        ? <div className="p-3 w-full flex items-center gap-4">
                            <div className="w-36 aspect-video rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                              <img src={imgPreview} className="w-full h-full object-cover" alt=""/>
                            </div>
                            <div><p className="text-sm font-bold text-slate-700">Photo ready ✓</p><p className="text-xs text-slate-400 mt-1">Click or drag to replace</p></div>
                          </div>
                        : <div className="text-center py-4"><p className="text-3xl mb-1.5">📸</p><p className="text-sm font-black text-slate-700">Drag & drop or click</p><p className="text-xs text-slate-400">JPG, PNG, WEBP</p></div>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Description / Inclusions</label>
                    <textarea rows={2} placeholder="AC, helmet, insurance, delivery radius..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition resize-none"
                      value={newV.description} onChange={e=>setNewV({...newV,description:e.target.value})}/>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={()=>{ setShowAddForm(false); setEditingId(null); setImgPreview(''); }}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition">Cancel</button>
                    <button type="submit"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wide transition shadow-md">
                      {editingId?'💾 Save Changes':'🚀 Publish Live'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Fleet grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-lg">Your Fleet</h3>
                <span className="text-xs font-bold text-slate-500">
                  {ownerFleet.filter(v=>v.isAvailable).length} live · {ownerFleet.filter(v=>!v.isAvailable).length} hidden
                </span>
              </div>

              {ownerFleet.length===0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center py-20">
                  <p className="text-5xl mb-3">🚗</p>
                  <p className="font-black text-slate-700 text-base">No vehicles listed yet</p>
                  <p className="text-slate-400 text-sm mt-1 mb-6">Add your first vehicle to start getting bookings</p>
                  <button onClick={()=>setShowAddForm(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition">
                    + Add First Vehicle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {ownerFleet.map(v=>(
                    <div key={v.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition ${v.isAvailable?'border-slate-200':'border-slate-200 opacity-70'}`}>
                      <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                        <img src={v.image} alt={v.name} className="w-full h-full object-cover"/>
                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide shadow-sm ${v.isAvailable?'bg-emerald-500 text-white':'bg-slate-700 text-white'}`}>
                          {v.isAvailable?'● Live':'● Hidden'}
                        </div>
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-black">
                          {typeIcon(v.type)}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-black text-slate-900 text-sm leading-tight">{v.name}</h4>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-slate-900 text-sm">Rs.{v.pricePerDay.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400">/day</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">{v.transmission} · {v.fuel} · {v.location}</p>
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <button onClick={()=>toggleAvail(v.id)}
                            className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-wide border transition ${v.isAvailable?'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600':'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                            {v.isAvailable?'Hide':'Go Live'}
                          </button>
                          <button onClick={()=>{ setEditingId(v.id); setShowAddForm(false); setNewV({name:v.name,type:v.type,transmission:v.transmission,fuel:v.fuel,pricePerDay:v.pricePerDay,description:v.description||''}); setImgPreview(v.image); window.scrollTo({top:0,behavior:'smooth'}); }}
                            className="flex-1 py-2 rounded-xl font-black text-[11px] uppercase border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition">
                            Edit
                          </button>
                          <button onClick={()=>deleteVehicle(v.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition text-base">
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CUSTOMER HOME ══════════ */}
      {(view==='home'||view==='detail') && (
        <>
          {/* ── HERO ── */}
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
                  <p className="text-slate-300 text-sm md:text-base font-medium">Verified local hubs · No hidden fees · Book in 60 seconds</p>
                </div>
              </header>

              {/* Search bar */}
              <div className="bg-white border-b border-slate-200 shadow-md">
                <div className="max-w-6xl mx-auto px-4 py-4">
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 hover:border-slate-400 focus-within:border-red-400 rounded-xl px-4 py-3 transition">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1.5">City / Location</p>
                      <select value={filterCity} onChange={e=>setFilterCity(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none">
                        {SL_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 hover:border-slate-400 focus-within:border-red-400 rounded-xl px-4 py-3 transition">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1.5">Vehicle Type</p>
                      <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none">
                        <option value="all">All Types</option>
                        <option value="car">🚙 Cars & SUVs</option>
                        <option value="bike">🏍️ Bikes & Scooters</option>
                        <option value="tuk">🛺 Tuk-tuks</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 hover:border-slate-400 focus-within:border-red-400 rounded-xl px-4 py-3 transition">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1.5">Pickup Date</p>
                      <input type="date" value={filterPickup} onChange={e=>setFilterPickup(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none" style={{colorScheme:'light'}}/>
                    </div>
                    <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 hover:border-slate-400 focus-within:border-red-400 rounded-xl px-4 py-3 transition">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1.5">Return Date</p>
                      <input type="date" value={filterReturn} onChange={e=>setFilterReturn(e.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer leading-none" style={{colorScheme:'light'}}/>
                    </div>
                    <button onClick={handleSearch}
                      className="flex-none bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black rounded-xl px-8 py-3 text-sm uppercase tracking-wide transition shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick pills */}
              <section className="max-w-7xl mx-auto px-4 pt-5 pb-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    {label:'All Deals',city:'All Sri Lanka',type:'all'},
                    {label:'🚙 Cars',city:'All Sri Lanka',type:'car'},
                    {label:'🏍️ Bikes',city:'All Sri Lanka',type:'bike'},
                    {label:'🛺 Tuk-tuks',city:'All Sri Lanka',type:'tuk'},
                    {label:'📍 Colombo',city:'Colombo',type:'all'},
                    {label:'📍 Galle',city:'Galle',type:'all'},
                    {label:'📍 Kandy',city:'Kandy',type:'all'},
                    {label:'📍 Negombo',city:'Negombo',type:'all'},
                  ].map(tag=>(
                    <button key={tag.label} onClick={()=>{ setFilterCity(tag.city); setFilterType(tag.type); }}
                      className={`text-xs font-bold border px-4 py-2 rounded-xl whitespace-nowrap transition ${filterCity===tag.city&&filterType===tag.type?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900'}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Vehicle grid */}
              <section className="max-w-7xl mx-auto px-4 mt-2 mb-24">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black text-slate-900">
                    <span className="text-red-500">{displayed.length}</span> vehicle{displayed.length!==1?'s':''} available
                    {filterCity!=='All Sri Lanka'?` in ${filterCity}`:''}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {displayed.map(v=>(
                    <article key={v.id}
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
                      onClick={()=>{ setSelectedVehicle(v); setView('detail'); window.scrollTo({top:0,behavior:'smooth'}); }}>
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                        <img src={v.image} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                        <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow uppercase">✔ Verified</span>
                        <span className="absolute top-3 right-3 text-lg">{typeIcon(v.type)}</span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{v.transmission}</span>
                            <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{v.fuel}</span>
                            <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase ml-auto">{v.location}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-red-500 transition-colors">{v.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{v.shopName}</p>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Per Day</p>
                            <span className="text-base font-black text-slate-900">{fmt(v.pricePerDay)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 text-xs">★</span>
                            <span className="text-xs font-bold text-slate-700">{v.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {displayed.length===0 && (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-4xl mb-3">🔍</p>
                      <p className="text-sm font-bold text-slate-600">No vehicles found.</p>
                      <button onClick={()=>{setFilterCity('All Sri Lanka');setFilterType('all');}} className="mt-3 text-xs font-bold text-red-500 underline">Clear filters</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── DETAIL VIEW ── */}
          {view==='detail' && selectedVehicle && (
            <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-24">
              <button onClick={()=>{setView('home');setSelectedVehicle(null);setBookingDone(false);}} className="text-sm font-bold text-slate-500 hover:text-red-500 mb-6 flex items-center gap-1.5 transition group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to all vehicles
              </button>

              {bookingDone ? (
                <div className="max-w-md mx-auto text-center py-16">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Booking Request Sent!</h2>
                  <p className="text-slate-500 text-sm mb-6">{selectedVehicle.shopName} will contact you on WhatsApp within 30 minutes.</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm space-y-2 mb-6">
                    <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-bold">{selectedVehicle.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-bold">{days} day{days>1?'s':''}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-black text-red-500">{fmt(total)}</span></div>
                  </div>
                  <button onClick={resetToHome} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-sm">← Back to Home</button>
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
                      <p className="text-sm text-slate-500 mt-1">{selectedVehicle.shopName} · <span className="text-blue-600 font-medium">{selectedVehicle.location}</span></p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(selectedVehicle.images||[selectedVehicle.image]).map((img,i)=>(
                        <div key={i} className="aspect-[16/10] bg-slate-200 rounded-2xl overflow-hidden">
                          <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="flex border-b border-slate-200 bg-slate-50">
                        {[['details','Details'],['docs','Documents'],['faq','FAQ']].map(([k,l])=>(
                          <button key={k} onClick={()=>setDetailTab(k as any)}
                            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition ${detailTab===k?'bg-white text-slate-900 border-b-2 border-red-500':'text-slate-400 hover:text-slate-700'}`}>{l}</button>
                        ))}
                      </div>
                      <div className="p-5">
                        {detailTab==='details' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                              {[['Transmission',selectedVehicle.transmission],['Fuel',selectedVehicle.fuel],['AC','Included'],['Insurance','Full Cover']].map(([l,v])=>(
                                <div key={l} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{l}</p>
                                  <p className="font-bold text-sm text-slate-800 mt-0.5">{v}</p>
                                </div>
                              ))}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedVehicle.description}</p>
                          </div>
                        )}
                        {detailTab==='docs' && (
                          <div className="space-y-2 text-sm">
                            <p className="font-bold text-slate-900 mb-3">Required at pickup:</p>
                            {['National ID (NIC)','Valid Driving License','Phone for WhatsApp'].map(i=>(
                              <div key={i} className="flex items-center gap-2 text-slate-700"><span className="text-emerald-500 font-bold">✓</span>{i}</div>
                            ))}
                          </div>
                        )}
                        {detailTab==='faq' && (
                          <div className="space-y-3">
                            {[['Is fuel included?','No — return with same level.'],['Can I extend?','Yes — WhatsApp the shop.'],['Security deposit?','Most vehicles: no deposit.'],['Damage?','Basic insurance included.']].map(([q,a])=>(
                              <div key={q} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <p className="font-bold text-slate-900 text-sm">{q}</p>
                                <p className="text-slate-500 mt-0.5 text-xs">{a}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Booking panel */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xl space-y-4 lg:sticky lg:top-24">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-black text-lg text-slate-900">Book this ride</h3>
                      <span className="text-sm font-black text-red-500">{fmt(selectedVehicle.pricePerDay)}<span className="text-xs font-semibold text-slate-400">/day</span></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pickup</label>
                        <input type="date" className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer" value={filterPickup} onChange={e=>setFilterPickup(e.target.value)}/>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Return</label>
                        <input type="date" className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer" value={filterReturn} onChange={e=>setFilterReturn(e.target.value)}/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Duration</label>
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <button onClick={()=>setDays(d=>Math.max(1,d-1))} className="px-4 py-2.5 font-black hover:bg-slate-200 transition text-lg">−</button>
                        <span className="w-full text-center font-black text-sm text-slate-900">{days} day{days>1?'s':''}</span>
                        <button onClick={()=>setDays(d=>d+1)} className="px-4 py-2.5 font-black hover:bg-slate-200 transition text-lg">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Pickup Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[['pickup','📍 Self','Free'],['delivery','🚚 Delivery','+Rs.1,500']].map(([val,label,note])=>(
                          <button key={val} onClick={()=>setDeliveryType(val as any)}
                            className={`py-2.5 text-xs font-bold rounded-xl border transition ${deliveryType===val?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                            {label}<br/><span className="text-[10px] font-medium opacity-70">{note}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 font-semibold text-slate-600">
                      <div className="flex justify-between"><span>{fmt(selectedVehicle.pricePerDay)} × {days}d</span><span className="font-bold text-slate-900">{fmt(base)}</span></div>
                      {deliveryType==='delivery' && <div className="flex justify-between"><span>Delivery</span><span className="font-bold">{fmt(delFee)}</span></div>}
                      <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-200 text-slate-900"><span>Total</span><span className="text-red-500">{fmt(total)}</span></div>
                    </div>
                    <button onClick={()=>setBookingDone(true)}
                      className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wide shadow-md transition">
                      Confirm Booking →
                    </button>
                    <p className="text-[10px] text-center text-slate-400">No payment now. Shop confirms via WhatsApp.</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Footer */}
          {view==='home' && (
            <footer className="bg-slate-900 text-slate-500 py-8 px-4 text-center text-xs">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DrivoLogo className="w-6 h-6"/>
                <span className="font-black text-white text-sm">drivo</span>
                <span className="text-slate-700">·</span>
                <span>Sri Lanka's Vehicle Rental Marketplace</span>
              </div>
              <p className="text-slate-700">© 2026 Drivo LK</p>
            </footer>
          )}
        </>
      )}
    </main>
  );
}