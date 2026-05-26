// ── All 25 Districts of Sri Lanka
export const SL_CITIES = [
  'All Sri Lanka',
  // Western Province
  'Colombo',
  'Gampaha',
  'Kalutara',
  // Central Province
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  // Southern Province
  'Galle',
  'Matara',
  'Hambantota',
  // Northern Province
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Mullaitivu',
  'Vavuniya',
  // Eastern Province
  'Ampara',
  'Batticaloa',
  'Trincomalee',
  // North Western Province
  'Kurunegala',
  'Puttalam',
  // North Central Province
  'Anuradhapura',
  'Polonnaruwa',
  // Uva Province
  'Badulla',
  'Monaragala',
  // Sabaragamuwa Province
  'Ratnapura',
  'Kegalle',
] as const;

export type SLCity = typeof SL_CITIES[number];

// ── Vehicle types
export type VehicleType = 'car' | 'bike' | 'tuk';

// ── Booking status
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';

// ── Driver option
export type DriverOption = 'self_drive' | 'with_driver' | 'both';