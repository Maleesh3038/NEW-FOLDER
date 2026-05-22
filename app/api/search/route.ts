import { NextResponse } from 'next/server';
import { mockVehicles } from '../../data/vehicles'; // Oya dapu data folder ekට path eka

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const location = searchParams.get('location')?.toLowerCase();
  const type = searchParams.get('type');
  const date = searchParams.get('date');

  let filtered = mockVehicles;

  if (location) {
    filtered = filtered.filter(v => v.location.toLowerCase().includes(location));
  }

  if (type) {
    filtered = filtered.filter(v => v.type === type);
  }

  // දැනට simple filtering, passe complete dynamic logic ekak gahamu db ekath ekka
  if (date) {
    filtered = filtered.filter(v => v.availableDates.includes(date));
  }

  return NextResponse.json(filtered);
}