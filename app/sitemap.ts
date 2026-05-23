import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const BASE_URL = 'https://www.thedrivo.com';
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/admin`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.1,
    },
  ];
}