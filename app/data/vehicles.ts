export type VehicleType = 'car' | 'bike' | 'tuk';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  transmission: string;
  fuel: string;
  pricePerDay: number;
  shopName: string;
  location: string;
  rating: number;
  image: string;
  images?: string[];
  description?: string;
  isAvailable?: boolean;
  mapLink?: string;
}

// No default vehicles — owners add their own through Partner Hub
export const mockVehicles: Vehicle[] = [];