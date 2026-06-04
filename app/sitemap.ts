// app/sitemap.ts — Next.js auto sitemap generation
import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.thedrivo.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/?type=car`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?type=bike`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/?type=van`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/?type=tuk`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // City pages
  const cities = [
    'Colombo', 'Galle', 'Kandy', 'Negombo', 'Matara',
    'Ella', 'Nuwara Eliya', 'Trincomalee', 'Jaffna',
    'Batticaloa', 'Anuradhapura', 'Hambantota', 'Ratnapura',
  ];

  const cityPages: MetadataRoute.Sitemap = cities.map(city => ({
    url: `${baseUrl}/?city=${encodeURIComponent(city)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Dynamic vehicle pages from Supabase
  let vehiclePages: MetadataRoute.Sitemap = [];
  try {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, updated_at')
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (vehicles) {
      vehiclePages = vehicles.map(v => ({
        url: `${baseUrl}/vehicles/${v.id}`,
        lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (e) {
    console.error('Sitemap vehicle fetch error:', e);
  }

  return [...staticPages, ...cityPages, ...vehiclePages];
}