// app/api/og/route.tsx — Dynamic OG image generation
// Install: npm install @vercel/og
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Rent Cars, Bikes & Tuk-Tuks in Sri Lanka';
  const city = searchParams.get('city') || '';
  const price = searchParams.get('price') || '';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{ background: '#111', borderRadius: '20px', padding: '12px', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', fontSize: '28px', fontWeight: 900 }}>D</div>
          </div>
          <span style={{ color: 'white', fontSize: '36px', fontWeight: 900, letterSpacing: '-1px' }}>drivo</span>
          <span style={{ background: 'white', color: '#111', fontSize: '12px', fontWeight: 900, padding: '4px 10px', borderRadius: '6px' }}>LK</span>
        </div>

        {/* Title */}
        <div style={{ color: 'white', fontSize: price ? '48px' : '52px', fontWeight: 900, lineHeight: 1.2, maxWidth: '800px', marginBottom: '20px' }}>
          {title}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          {city && (
            <span style={{ background: '#1e40af', color: 'white', padding: '8px 20px', borderRadius: '100px', fontSize: '18px', fontWeight: 700 }}>
              📍 {city}
            </span>
          )}
          {price && (
            <span style={{ background: '#dc2626', color: 'white', padding: '8px 20px', borderRadius: '100px', fontSize: '18px', fontWeight: 700 }}>
              From {price}/day
            </span>
          )}
          <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '8px 20px', borderRadius: '100px', fontSize: '18px', fontWeight: 700 }}>
            ✅ Verified Vehicles
          </span>
          <span style={{ background: '#1e293b', color: '#94a3b8', padding: '8px 20px', borderRadius: '100px', fontSize: '18px', fontWeight: 700 }}>
            thedrivo.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}