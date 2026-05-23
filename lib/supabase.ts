import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Types matching DB tables
export type DbOwner = {
  id?: string;
  email: string;
  password_hash: string;
  shop_name: string;
  owner_name?: string;
  phone: string;
  whatsapp?: string;
  city: string;
  blocked?: boolean;
  created_at?: string;
};

export type DbCustomer = {
  id?: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name?: string;
  phone: string;
  city?: string;
  blocked?: boolean;
  created_at?: string;
};

export type DbVehicle = {
  id?: string;
  owner_id: string;
  name: string;
  type: 'car' | 'bike' | 'tuk';
  transmission: string;
  fuel: string;
  price_per_day: number;
  location: string;
  shop_name: string;
  rating?: number;
  description?: string;
  map_link?: string;
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
  days: number;
  delivery_type: 'pickup' | 'delivery';
  price_per_day: number;
  total: number;
  status: 'pending' | 'confirmed' | 'completed';
  booked_at?: string;
};

// ── Simple hash (use bcrypt in production)
export function hashPassword(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h) + pw.charCodeAt(i);
    h |= 0;
  }
  return 'h_' + Math.abs(h).toString(36) + '_' + pw.length;
}

export function checkPassword(pw: string, hash: string): boolean {
  return hashPassword(pw) === hash;
}

// ── Upload photo to Supabase Storage
export async function uploadPhoto(file: File | string, vehicleId: string, index: number): Promise<string> {
  // If already a URL (not base64), return as-is
  if (typeof file === 'string' && !file.startsWith('data:')) return file;

  let blob: Blob;
  if (typeof file === 'string') {
    // base64 → blob
    const res = await fetch(file);
    blob = await res.blob();
  } else {
    blob = file;
  }

  const ext  = blob.type.split('/')[1] || 'jpg';
  const path = `${vehicleId}/${index}.${ext}`;

  const { data, error } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, blob, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('vehicle-photos')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// ══════════════════════════════════════════════
//  AUTH FUNCTIONS
// ══════════════════════════════════════════════

// ── Register Owner
export async function registerOwner(
  email: string, password: string,
  profile: { shopName: string; ownerName: string; phone: string; whatsapp: string; city: string }
): Promise<{ data: DbOwner | null; error: string | null }> {
  const key = email.toLowerCase().trim();

  // Check duplicate
  const { data: existing } = await supabase
    .from('owners').select('id').eq('email', key).single();
  if (existing) return { data: null, error: 'Email already registered.' };

  const { data, error } = await supabase.from('owners').insert({
    email: key,
    password_hash: hashPassword(password),
    shop_name: profile.shopName,
    owner_name: profile.ownerName,
    phone: profile.phone,
    whatsapp: profile.whatsapp || profile.phone,
    city: profile.city,
  }).select().single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ── Login Owner
export async function loginOwner(
  email: string, password: string
): Promise<{ data: DbOwner | null; error: string | null }> {
  const { data, error } = await supabase
    .from('owners').select('*').eq('email', email.toLowerCase().trim()).single();
  if (error || !data) return { data: null, error: 'Account not found.' };
  if (!checkPassword(password, data.password_hash)) return { data: null, error: 'Wrong password.' };
  if (data.blocked) return { data: null, error: 'Account blocked. Contact support.' };
  return { data, error: null };
}

// ── Register Customer
export async function registerCustomer(
  email: string, password: string,
  profile: { firstName: string; lastName: string; phone: string; city: string }
): Promise<{ data: DbCustomer | null; error: string | null }> {
  const key = email.toLowerCase().trim();
  const { data: existing } = await supabase
    .from('customers').select('id').eq('email', key).single();
  if (existing) return { data: null, error: 'Email already registered.' };

  const { data, error } = await supabase.from('customers').insert({
    email: key,
    password_hash: hashPassword(password),
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone,
    city: profile.city,
  }).select().single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// ── Login Customer
export async function loginCustomer(
  email: string, password: string
): Promise<{ data: DbCustomer | null; error: string | null }> {
  const { data, error } = await supabase
    .from('customers').select('*').eq('email', email.toLowerCase().trim()).single();
  if (error || !data) return { data: null, error: 'Account not found.' };
  if (!checkPassword(password, data.password_hash)) return { data: null, error: 'Wrong password.' };
  if (data.blocked) return { data: null, error: 'Account blocked. Contact support.' };
  return { data, error: null };
}

// ══════════════════════════════════════════════
//  VEHICLE FUNCTIONS
// ══════════════════════════════════════════════

// ── Get all available vehicles (homepage)
export async function getAvailableVehicles(): Promise<DbVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, vehicle_photos(storage_url, sort_order)')
    .eq('is_available', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ── Get owner's vehicles
export async function getOwnerVehicles(ownerId: string): Promise<DbVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, vehicle_photos(storage_url, sort_order)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ── Add vehicle
export async function addVehicle(
  vehicle: Omit<DbVehicle, 'id' | 'created_at'>,
  photos: string[]
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vehicles').insert({
      owner_id: vehicle.owner_id,
      name: vehicle.name,
      type: vehicle.type,
      transmission: vehicle.transmission,
      fuel: vehicle.fuel,
      price_per_day: vehicle.price_per_day,
      location: vehicle.location,
      shop_name: vehicle.shop_name,
      description: vehicle.description,
      map_link: vehicle.map_link,
      is_available: true,
    }).select().single();

  if (error || !data) return { id: null, error: error?.message || 'Failed' };

  // Upload photos
  for (let i = 0; i < photos.length; i++) {
    try {
      const url = await uploadPhoto(photos[i], data.id, i);
      await supabase.from('vehicle_photos').insert({
        vehicle_id: data.id,
        storage_url: url,
        sort_order: i,
      });
    } catch {}
  }
  return { id: data.id, error: null };
}

// ── Update vehicle
export async function updateVehicle(
  vehicleId: string,
  updates: Partial<DbVehicle>,
  newPhotos?: string[]
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vehicles').update({
      name: updates.name,
      type: updates.type,
      transmission: updates.transmission,
      fuel: updates.fuel,
      price_per_day: updates.price_per_day,
      location: updates.location,
      description: updates.description,
      map_link: updates.map_link,
      is_available: updates.is_available,
    }).eq('id', vehicleId);

  if (error) return { error: error.message };

  if (newPhotos && newPhotos.length > 0) {
    await supabase.from('vehicle_photos').delete().eq('vehicle_id', vehicleId);
    for (let i = 0; i < newPhotos.length; i++) {
      try {
        const url = await uploadPhoto(newPhotos[i], vehicleId, i);
        await supabase.from('vehicle_photos').insert({
          vehicle_id: vehicleId, storage_url: url, sort_order: i,
        });
      } catch {}
    }
  }
  return { error: null };
}

// ── Delete vehicle
export async function deleteVehicle(vehicleId: string): Promise<void> {
  await supabase.storage.from('vehicle-photos').list(vehicleId).then(({ data }) => {
    if (data) {
      const paths = data.map(f => `${vehicleId}/${f.name}`);
      supabase.storage.from('vehicle-photos').remove(paths);
    }
  });
  await supabase.from('vehicles').delete().eq('id', vehicleId);
}

// ── Toggle availability
export async function toggleVehicleAvailability(vehicleId: string, isAvailable: boolean): Promise<void> {
  await supabase.from('vehicles').update({ is_available: isAvailable }).eq('id', vehicleId);
}

// ══════════════════════════════════════════════
//  BOOKING FUNCTIONS
// ══════════════════════════════════════════════

// ── Create booking
export async function createBooking(booking: Omit<DbBooking, 'id' | 'booked_at'>): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.from('bookings').insert(booking).select().single();
  if (error) return { id: null, error: error.message };

  // Track booking in traffic
  await trackBookingInDB();
  return { id: data.id, error: null };
}

// ── Get customer bookings
export async function getCustomerBookings(customerId: string): Promise<DbBooking[]> {
  const { data } = await supabase
    .from('bookings').select('*')
    .eq('customer_id', customerId)
    .order('booked_at', { ascending: false });
  return data || [];
}

// ── Get owner bookings
export async function getOwnerBookings(ownerId: string): Promise<DbBooking[]> {
  const { data } = await supabase
    .from('bookings').select('*')
    .eq('owner_id', ownerId)
    .order('booked_at', { ascending: false });
  return data || [];
}

// ── Update booking status
export async function updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'completed'): Promise<void> {
  await supabase.from('bookings').update({ status }).eq('id', bookingId);
}

// ── Get all bookings (admin)
export async function getAllBookings(): Promise<DbBooking[]> {
  const { data } = await supabase.from('bookings').select('*').order('booked_at', { ascending: false });
  return data || [];
}

// ══════════════════════════════════════════════
//  TRAFFIC FUNCTIONS
// ══════════════════════════════════════════════

export async function trackVisitInDB(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await supabase.rpc('increment_traffic', { p_date: today, p_field: 'visits' }).catch(async () => {
    const { data } = await supabase.from('traffic').select('id').eq('date', today).single();
    if (data) {
      await supabase.from('traffic').update({ visits: supabase.rpc as any }).eq('date', today);
    } else {
      await supabase.from('traffic').insert({ date: today, visits: 1, bookings: 0 });
    }
  });
  // Simple upsert approach
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
  const { data } = await supabase
    .from('traffic').select('*')
    .order('date', { ascending: true })
    .limit(30);
  return data || [];
}

// ── Admin: get all owners
export async function getAllOwners(): Promise<DbOwner[]> {
  const { data } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
  return data || [];
}

// ── Admin: get all customers
export async function getAllCustomers(): Promise<DbCustomer[]> {
  const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  return data || [];
}

// ── Admin: get all vehicles
export async function getAllVehicles(): Promise<DbVehicle[]> {
  const { data } = await supabase
    .from('vehicles')
    .select('*, vehicle_photos(storage_url, sort_order)')
    .order('created_at', { ascending: false });
  return data || [];
}

// ── Admin: toggle block
export async function toggleBlockOwner(ownerId: string, blocked: boolean): Promise<void> {
  await supabase.from('owners').update({ blocked }).eq('id', ownerId);
}
export async function toggleBlockCustomer(customerId: string, blocked: boolean): Promise<void> {
  await supabase.from('customers').update({ blocked }).eq('id', customerId);
}

// ── Session storage (localStorage for session only — not data)
const SESSION_DB_KEY = 'drivo_db_session_v1';
export type DbSession = {
  id: string;
  email: string;
  role: 'owner' | 'customer';
};

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