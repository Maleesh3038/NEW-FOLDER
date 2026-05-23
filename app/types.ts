import { Vehicle } from './data/vehicles';

export type RawVehicle = Vehicle & { isAvailable: boolean };

export type Booking = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleImg: string;
  shopName: string;
  location: string;
  pickupDate: string;
  returnDate: string;
  days: number;
  deliveryType: 'pickup' | 'delivery';
  pricePerDay: number;
  total: number;
  status: 'pending' | 'confirmed' | 'completed';
  bookedAt: string;
};

export type OwnerAccount = {
  email: string;
  password: string;
  profile: { shopName: string; ownerName: string; phone: string; whatsapp: string; city: string; };
  fleet: RawVehicle[];
  bookings: Booking[];
};

export type CustomerAccount = {
  email: string;
  password: string;
  profile: { firstName: string; lastName: string; phone: string; city: string; };
  bookings: Booking[];
};

export const FLEET_KEY   = 'drivo_fleet_v3';
export const OWN_ACCS    = 'drivo_owner_accs_v2';
export const CUST_ACCS   = 'drivo_cust_accs_v1';
export const SESSION_KEY = 'drivo_session_v2';

export const SL_CITIES = ['All Sri Lanka','Colombo','Katunayake','Kandy','Galle','Negombo','Trincomalee','Jaffna','Nuwara Eliya','Ella','Mirissa'];

export const getOwnerAccs  = (): Record<string, OwnerAccount>    => { try { return JSON.parse(localStorage.getItem(OWN_ACCS)  || '{}'); } catch { return {}; } };
export const getCustAccs   = (): Record<string, CustomerAccount> => { try { return JSON.parse(localStorage.getItem(CUST_ACCS)  || '{}'); } catch { return {}; } };
export const saveOwnerAccs = (a: Record<string, OwnerAccount>)    => localStorage.setItem(OWN_ACCS,  JSON.stringify(a));
export const saveCustAccs  = (a: Record<string, CustomerAccount>) => localStorage.setItem(CUST_ACCS, JSON.stringify(a));