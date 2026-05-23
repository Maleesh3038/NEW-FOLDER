import type { Metadata } from 'next';
import './globals.css';

const BASE_URL = 'https://www.thedrivo.com';

export const metadata: Metadata = {
  // ── Core
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Drivo — Rent Cars, Bikes & Tuk-tuks in Sri Lanka',
    template: '%s | Drivo Sri Lanka',
  },
  description:
    'Find and book cars, motorbikes and tuk-tuks from verified rental shops across Sri Lanka. Best prices in Colombo, Galle, Kandy, Negombo & more. Book in 60 seconds — no hidden fees.',

  // ── Keywords (long-tail Sri Lanka focused)
  keywords: [
    'car rental sri lanka',
    'rent a car sri lanka',
    'vehicle rental sri lanka',
    'bike rental sri lanka',
    'tuk tuk rental sri lanka',
    'car hire colombo',
    'car hire galle',
    'car hire kandy',
    'motorbike rental sri lanka',
    'cheap car rental sri lanka',
    'daily car rental colombo',
    'rent car negombo',
    'vehicle hire katunayake airport',
    'drivo',
    'drivo sri lanka',
    'thedrivo',
    'thedrivo.com',
  ],

  // ── Canonical
  alternates: {
    canonical: BASE_URL,
    languages: {
      'en': BASE_URL,
      'si': `${BASE_URL}?lang=SI`,
    },
  },

  // ── Open Graph (Facebook, WhatsApp, LinkedIn preview)
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'Drivo Sri Lanka',
    title: 'Drivo — Rent Cars, Bikes & Tuk-tuks in Sri Lanka',
    description:
      'Book cars, motorbikes and tuk-tuks from verified local shops. Best rental prices in Colombo, Galle, Kandy & across Sri Lanka.',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Drivo — Sri Lanka Vehicle Rental Platform',
      },
    ],
    locale: 'en_US',
  },

  // ── Twitter / X card
  twitter: {
    card: 'summary_large_image',
    title: 'Drivo — Rent Cars, Bikes & Tuk-tuks in Sri Lanka',
    description:
      'Book vehicles from verified rental shops across Sri Lanka. No hidden fees.',
    images: [`${BASE_URL}/og-image.jpg`],
    site: '@drivosl',
    creator: '@drivosl',
  },

  // ── Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },

  // ── Manifest (PWA)
  manifest: '/manifest.json',

  // ── Verification (add keys after Google Search Console + Bing setup)
  verification: {
    // google: 'YOUR_GOOGLE_VERIFICATION_CODE',
    // yandex: 'YOUR_YANDEX_CODE',
  },

  // ── App info
  applicationName: 'Drivo Sri Lanka',
  category: 'travel',
  creator: 'Drivo LK',
  publisher: 'Drivo LK',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ── Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Drivo Sri Lanka',
              url: BASE_URL,
              logo: `${BASE_URL}/logo.png`,
              description: 'Sri Lanka vehicle rental marketplace — cars, bikes and tuk-tuks.',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'LK',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                email: 'thedrivo.info@gmail.com',
                availableLanguage: ['English', 'Sinhala'],
              },
              sameAs: [
                'https://www.facebook.com/drivolanka',
                'https://www.instagram.com/drivolanka',
              ],
            }),
          }}
        />

        {/* ── Structured Data: Website + SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Drivo Sri Lanka',
              url: BASE_URL,
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${BASE_URL}/?city={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        {/* ── Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />

        {/* ── Geo tags (Sri Lanka) */}
        <meta name="geo.region" content="LK" />
        <meta name="geo.country" content="Sri Lanka" />
        <meta name="language" content="English, Sinhala" />

        {/* ── Theme color (browser tab color on mobile) */}
        <meta name="theme-color" content="#111111" />
        <meta name="msapplication-TileColor" content="#111111" />

        {/* ── Mobile app capable */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Drivo" />
      </head>
      <body>{children}</body>
    </html>
  );
}