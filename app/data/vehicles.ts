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
}

export const mockVehicles: Vehicle[] = [
  {
    id: 'v001',
    name: 'Suzuki Wagon R 2022',
    type: 'car',
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: 5500,
    shopName: 'Colombo Premium Rent',
    location: 'Colombo',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600',
    ],
    description: 'Well-maintained Wagon R with dual-zone AC, Bluetooth stereo, reverse camera. Full insurance included. Free airport pickup within Colombo.',
    isAvailable: true,
  },
  {
    id: 'v002',
    name: 'Toyota Aqua Hybrid 2021',
    type: 'car',
    transmission: 'Automatic',
    fuel: 'Hybrid',
    pricePerDay: 7500,
    shopName: 'Kandy City Wheels',
    location: 'Kandy',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=600',
      'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?q=80&w=600',
    ],
    description: 'Fuel-efficient hybrid perfect for hill country. Excellent AC, GPS navigation, USB charging ports. Comprehensive insurance + roadside assist.',
    isAvailable: true,
  },
  {
    id: 'v003',
    name: 'Honda CB 150R 2023',
    type: 'bike',
    transmission: 'Manual',
    fuel: 'Petrol',
    pricePerDay: 1800,
    shopName: 'Galle Road Rentals',
    location: 'Galle',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?q=80&w=600',
    ],
    description: '150cc sport bike, recently serviced. Helmet, gloves & rain gear included. Ideal for coastal riding around Galle Fort and Unawatuna.',
    isAvailable: true,
  },
  {
    id: 'v004',
    name: 'Honda Beat Scooter 2022',
    type: 'bike',
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: 1200,
    shopName: 'Negombo Scoot & Go',
    location: 'Negombo',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?q=80&w=600',
    ],
    description: 'Easy-ride automatic scooter, great for city and beach hopping. No experience required. Helmet provided. Perfect for solo or couple rides.',
    isAvailable: true,
  },
  {
    id: 'v005',
    name: 'Suzuki Alto 800 2023',
    type: 'car',
    transmission: 'Manual',
    fuel: 'Petrol',
    pricePerDay: 4000,
    shopName: 'Jaffna Drive Hub',
    location: 'Jaffna',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=600',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600',
    ],
    description: 'Budget-friendly compact car for North Sri Lanka exploration. Great fuel economy, AC, and smooth handling on city roads and highways.',
    isAvailable: true,
  },
  {
    id: 'v006',
    name: 'Bajaj Pulsar 200NS',
    type: 'bike',
    transmission: 'Manual',
    fuel: 'Petrol',
    pricePerDay: 2200,
    shopName: 'Trinco Moto Rentals',
    location: 'Trincomalee',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?q=80&w=600',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600',
    ],
    description: '200cc performance bike for east coast adventures. Ideal for Nilaveli and Uppuveli beach rides. Helmet, jacket & fuel-up voucher included.',
    isAvailable: true,
  },
  {
    id: 'v007',
    name: 'Perodua Myvi 2022',
    type: 'car',
    transmission: 'Automatic',
    fuel: 'Petrol',
    pricePerDay: 6000,
    shopName: 'Colombo Premium Rent',
    location: 'Colombo',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?q=80&w=600',
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?q=80&w=600',
    ],
    description: 'Spacious 5-seater with excellent AC and infotainment system. Perfect for family trips or airport transfers. Free delivery within 10km of Colombo.',
    isAvailable: true,
  },
  {
    id: 'v008',
    name: 'Yamaha FZ-S V3 2023',
    type: 'bike',
    transmission: 'Manual',
    fuel: 'Petrol',
    pricePerDay: 2000,
    shopName: 'Kandy City Wheels',
    location: 'Kandy',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?q=80&w=600',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?q=80&w=600',
    ],
    description: 'Stylish street bike ideal for Kandy hill roads and tea estate routes. Fuel injection, LED lights, full insurance. Helmet and gloves included.',
    isAvailable: true,
  },
];