// app/robots.ts — robots.txt auto generation
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: 'https://www.thedrivo.com/sitemap.xml',
    host: 'https://www.thedrivo.com',
  };
}