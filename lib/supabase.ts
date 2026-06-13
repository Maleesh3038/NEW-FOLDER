import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Types
export type DbOwner = {
  id?: string;
  email: string;
  password?: string;
  shop_name: string;
  owner_name?: string;
  phone: string;
  whatsapp?: string;
  city: string;
  blocked?: boolean;
  verified?: boolean;
  avatar_url?: string;
  agreement_accepted?: boolean;
  agreement_accepted_at?: string;
  deleted_at?: string;
  created_at?: string;
};

export type DbCustomer = {
  id?: string;
  email: string;
  password?: string;
  first_name: string;
  last_name?: string;
  phone: string;
  city?: string;
  nic?: string;
  driving_license?: string;
  blocked?: boolean;
  avatar_url?: string;
  deleted_at?: string;
  created_at?: string;
};

export type DbVehicle = {
  id?: string;
  owner_id: string;
  name: string;
  type: 'car' | 'bike' | 'tuk' | 'van';
  transmission: string;
  fuel: string;
  price_per_day: number;
  weekly_price?: number | null;
  monthly_price?: number | null;
  km_per_day?: number | null;
  extra_km_charge?: number | null;
  deposit_amount?: number | null;
  location: string;
  shop_name: string;
  rating?: number;
  description?: string;
  map_link?: string;
  driver_option?: string;
  delivery_option?: string;
  revenue_licence_expiry?: string;
  insurance_expiry?: string;
  is_available?: boolean;
  created_at?: string;
  vehicle_photos?: DbPhoto[];
};

export type DbPhoto = {
  id?: string;
  vehicle_id: string;
  storage_url: string;
  sort_order?: number;
};

export type DbBooking = {
  id?: string;
  vehicle_id?: string;
  owner_id?: string;
  customer_id?: string;
  vehicle_name: string;
  vehicle_img?: string;
  shop_name?: string;
  location?: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  days: number;
  delivery_type: 'pickup' | 'delivery';
  price_per_day: number;
  total: number;
  platform_fee?: number;
  owner_payout?: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';
  booked_at?: string;
};

// ── Upload photo
export async function uploadPhoto(file: File | string, vehicleId: string, index: number): Promise<string> {
  if (typeof file === 'string' && !file.startsWith('data:')) return file;
  let blob: Blob;
  if (typeof file === 'string') {
    const res = await fetch(file);
    blob = await res.blob();
  } else {
    blob = file;
  }
  const ext = blob.type.split('/')[1] || 'jpg';
  const path = `${vehicleId}/${index}.${ext}`;
  const { error } = await supabase.storage.from('vehicle-photos').upload(path, blob, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
  return urlData.publicUrl;
}

// ══════════════════════════════
//  AUTH
// ══════════════════════════════

export async function registerOwner(
  email: string,
  password: string,
  profile: {
    shopName: string;
    ownerName: string;
    phone: string;
    whatsapp: string;
    city: string;
    agreement_accepted?: boolean;
    agreement_accepted_at?: string;
  }
): Promise<{ data: DbOwner | null; error: string | null }> {
  try {
    const { data: existing } = await supabase
      .from('owners').select('id, deleted_at').eq('email', email.toLowerCase().trim()).single();
    if (existing && !existing.deleted_at) return { data: null, error: 'Email already registered.' };

    const hashRes = await fetch('/api/auth/hash-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const { hash } = await hashRes.json();

    const { data, error } = await supabase.from('owners').insert({
      email: email.toLowerCase().trim(),
      password: hash,
      shop_name: profile.shopName,
      owner_name: profile.ownerName,
      phone: profile.phone,
      whatsapp: profile.whatsapp || profile.phone,
      city: profile.city,
      agreement_accepted: profile.agreement_accepted || false,
      agreement_accepted_at: profile.agreement_accepted_at || null,
    }).select().single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Registration failed' };
  }
}

export async function loginOwner(
  email: string,
  password: string
): Promise<{ data: DbOwner | null; error: string | null }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, userType: 'owner' }),
    });
    const result = await res.json();
    if (result.error || !result.data) return { data: null, error: result.error || 'Login failed' };
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Login failed' };
  }
}

export async function registerCustomer(
  email: string,
  password: string,
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    nic: string;
    drivingLicense: string;
  }
): Promise<{ data: DbCustomer | null; error: string | null }> {
  try {
    const { data: existing } = await supabase
      .from('customers').select('id, deleted_at').eq('email', email.toLowerCase().trim()).single();
    if (existing && !existing.deleted_at) return { data: null, error: 'Email already registered.' };

    const hashRes = await fetch('/api/auth/hash-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const { hash } = await hashRes.json();

    const { data, error } = await supabase.from('customers').insert({
      email: email.toLowerCase().trim(),
      password: hash,
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      city: profile.city,
      nic: profile.nic,
      driving_license: profile.drivingLicense,
    }).select().single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Registration failed' };
  }
}

export async function loginCustomer(
  email: string,
  password: string
): Promise<{ data: DbCustomer | null; error: string | null }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, userType: 'customer' }),
    });
    const result = await res.json();
    if (result.error || !result.data) return { data: null, error: result.error || 'Login failed' };
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Login failed' };
  }
}

// ══════════════════════════
//  VEHICLE FUNCTIONS
// ══════════════════════════

export async function getAvailableVehicles(): Promise<DbVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, vehicle_photos(storage_url, sort_order), owners(verified, avatar_url)')
    .eq('is_available', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getOwnerVehicles(ownerId: string): Promise<DbVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, vehicle_photos(storage_url, sort_order)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function addVehicle(
  vehicle: Omit<DbVehicle, 'id' | 'created_at'>,
  photos: string[]
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('vehicles').insert({
    owner_id: vehicle.owner_id,
    name: vehicle.name,
    type: vehicle.type,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    price_per_day: vehicle.price_per_day,
    location: vehicle.location,
    shop_name: vehicle.shop_name,
    description: vehicle.description || null,
    map_link: vehicle.map_link || null,
    is_available: true,
    rating: 0,
    // ✅ Only save if partner entered — otherwise NULL
    weekly_price: vehicle.weekly_price || null,
    monthly_price: vehicle.monthly_price || null,
    km_per_day: vehicle.km_per_day || null,
    extra_km_charge: vehicle.extra_km_charge || null,
    deposit_amount: vehicle.deposit_amount || 0,
    driver_option: vehicle.driver_option || 'self_drive',
    delivery_option: vehicle.delivery_option || 'both',
    revenue_licence_expiry: vehicle.revenue_licence_expiry || null,
    insurance_expiry: vehicle.insurance_expiry || null,
  }).select().single();

  if (error || !data) return { id: null, error: error?.message || 'Failed' };

  for (let i = 0; i < photos.length; i++) {
    try {
      const url = await uploadPhoto(photos[i], data.id, i);
      await supabase.from('vehicle_photos').insert({ vehicle_id: data.id, storage_url: url, sort_order: i });
    } catch {}
  }
  return { id: data.id, error: null };
}

export async function updateVehicle(
  vehicleId: string,
  updates: Partial<DbVehicle>,
  newPhotos?: string[]
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('vehicles').update({
    name: updates.name,
    type: updates.type,
    transmission: updates.transmission,
    fuel: updates.fuel,
    price_per_day: updates.price_per_day,
    location: updates.location,
    description: updates.description || null,
    map_link: updates.map_link || null,
    is_available: updates.is_available,
    driver_option: updates.driver_option,
    delivery_option: updates.delivery_option,
    revenue_licence_expiry: updates.revenue_licence_expiry || null,
    insurance_expiry: updates.insurance_expiry || null,
    // ✅ Only save if entered — otherwise NULL
    weekly_price: updates.weekly_price || null,
    monthly_price: updates.monthly_price || null,
    km_per_day: updates.km_per_day || null,
    extra_km_charge: updates.extra_km_charge || null,
    deposit_amount: updates.deposit_amount || 0,
  }).eq('id', vehicleId);

  if (error) return { error: error.message };

  if (newPhotos && newPhotos.length > 0) {
    await supabase.from('vehicle_photos').delete().eq('vehicle_id', vehicleId);
    for (let i = 0; i < newPhotos.length; i++) {
      try {
        const url = await uploadPhoto(newPhotos[i], vehicleId, i);
        await supabase.from('vehicle_photos').insert({ vehicle_id: vehicleId, storage_url: url, sort_order: i });
      } catch {}
    }
  }
  return { error: null };
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  await supabase.storage.from('vehicle-photos').list(vehicleId).then(({ data }) => {
    if (data) supabase.storage.from('vehicle-photos').remove(data.map(f => `${vehicleId}/${f.name}`));
  });
  await supabase.from('vehicle_photos').delete().eq('vehicle_id', vehicleId);
  await supabase.from('vehicles').delete().eq('id', vehicleId);
}

export async function toggleVehicleAvailability(vehicleId: string, isAvailable: boolean): Promise<void> {
  await supabase.from('vehicles').update({ is_available: isAvailable }).eq('id', vehicleId);
}

// ══════════════════════════
//  BOOKING FUNCTIONS
// ══════════════════════════

export async function createBooking(booking: Omit<DbBooking, 'id' | 'booked_at'>): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('bookings').insert(booking).select().single();
  if (error) return { id: null, error: error.message };
  await trackBookingInDB();
  return { id: data.id, error: null };
}

export async function getCustomerBookings(customerId: string): Promise<DbBooking[]> {
  const { data } = await supabase.from('bookings').select('*').eq('customer_id', customerId).order('booked_at', { ascending: false });
  return data || [];
}

export async function getOwnerBookings(ownerId: string): Promise<DbBooking[]> {
  const { data } = await supabase.from('bookings').select('*').eq('owner_id', ownerId).order('booked_at', { ascending: false });
  return data || [];
}

export async function updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'completed'): Promise<void> {
  await supabase.from('bookings').update({ status }).eq('id', bookingId);
}

export async function getAllBookings(): Promise<DbBooking[]> {
  const { data } = await supabase.from('bookings').select('*').order('booked_at', { ascending: false });
  return data || [];
}

// ══════════════════════════
//  TRAFFIC FUNCTIONS
// ══════════════════════════

export async function trackVisitInDB(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('traffic').select('visits').eq('date', today).single();
  if (data) {
    await supabase.from('traffic').update({ visits: (data.visits || 0) + 1 }).eq('date', today);
  } else {
    await supabase.from('traffic').insert({ date: today, visits: 1, bookings: 0 });
  }
}

export async function trackBookingInDB(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('traffic').select('bookings').eq('date', today).single();
  if (data) {
    await supabase.from('traffic').update({ bookings: (data.bookings || 0) + 1 }).eq('date', today);
  } else {
    await supabase.from('traffic').insert({ date: today, visits: 0, bookings: 1 });
  }
}

export async function getTrafficData(): Promise<{ date: string; visits: number; bookings: number }[]> {
  const { data } = await supabase.from('traffic').select('*').order('date', { ascending: true }).limit(30);
  return data || [];
}

// ══════════════════════════
//  ADMIN FUNCTIONS
// ══════════════════════════

export async function getAllOwners(): Promise<DbOwner[]> {
  const { data } = await supabase.from('owners').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  return data || [];
}

export async function getAllCustomers(): Promise<DbCustomer[]> {
  const { data } = await supabase.from('customers').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  return data || [];
}

export async function getAllVehicles(): Promise<DbVehicle[]> {
  const { data } = await supabase.from('vehicles').select('*, vehicle_photos(storage_url, sort_order)').order('created_at', { ascending: false });
  return data || [];
}

export async function toggleBlockOwner(ownerId: string, blocked: boolean): Promise<void> {
  await supabase.from('owners').update({ blocked }).eq('id', ownerId);
}

export async function toggleBlockCustomer(customerId: string, blocked: boolean): Promise<void> {
  await supabase.from('customers').update({ blocked }).eq('id', customerId);
}

// ══════════════════════════
//  SESSION
// ══════════════════════════

const SESSION_DB_KEY = 'drivo_db_session_v1';
export type DbSession = { id: string; email: string; role: 'owner' | 'customer' };

export function saveSession(session: DbSession): void {
  localStorage.setItem(SESSION_DB_KEY, JSON.stringify(session));
}
export function getSession(): DbSession | null {
  try {
    const s = localStorage.getItem(SESSION_DB_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_DB_KEY);
}