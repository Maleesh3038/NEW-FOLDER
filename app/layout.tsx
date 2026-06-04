// app/layout.tsx — REPLACE your existing layout.tsx with this
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.thedrivo.com'),
  title: {
    default: 'Drivo LK — Rent Cars, Bikes & Tuk-Tuks in Sri Lanka',
    template: '%s | Drivo LK',
  },
  description: 'Sri Lanka\'s #1 vehicle rental marketplace. Rent verified cars, motorbikes, tuk-tuks and vans island-wide. Colombo, Galle, Kandy, Negombo & more. Book in 60 seconds.',
  keywords: [
    'car rental Sri Lanka', 'vehicle rental Sri Lanka', 'rent a car Colombo',
    'motorbike rental Sri Lanka', 'tuk tuk rental Sri Lanka', 'van rental Sri Lanka',
    'car hire Galle', 'car hire Kandy', 'car hire Negombo', 'car hire Ella',
    'cheap car rental Sri Lanka', 'self drive car Sri Lanka', 'Sri Lanka travel rental',
    'tourist car rental Sri Lanka', 'Drivo LK', 'thedrivo.com',
  ],
  authors: [{ name: 'Drivo LK', url: 'https://www.thedrivo.com' }],
  creator: 'Drivo LK',
  publisher: 'Drivo LK',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.thedrivo.com',
    siteName: 'Drivo LK',
    title: 'Drivo LK — Rent Cars, Bikes & Tuk-Tuks in Sri Lanka',
    description: 'Sri Lanka\'s #1 vehicle rental marketplace. Verified cars, bikes & tuk-tuks island-wide. Book in 60 seconds.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Drivo LK — Sri Lanka Vehicle Rental',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Drivo LK — Rent Cars, Bikes & Tuk-Tuks in Sri Lanka',
    description: 'Sri Lanka\'s #1 vehicle rental marketplace. Book verified vehicles island-wide in 60 seconds.',
    images: ['/og-image.jpg'],
    creator: '@drivolanka',
  },
  alternates: {
    canonical: 'https://www.thedrivo.com',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'ADD_YOUR_GOOGLE_SEARCH_CONSOLE_CODE_HERE',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Drivo LK',
              url: 'https://www.thedrivo.com',
              logo: 'https://www.thedrivo.com/logo.png',
              description: 'Sri Lanka\'s #1 vehicle rental marketplace',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer service',
                availableLanguage: ['English', 'Sinhala'],
              },
              sameAs: [
                'https://www.facebook.com/drivolanka',
                'https://www.instagram.com/drivolanka',
              ],
            }),
          }}
        />
        {/* Structured Data — WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Drivo LK',
              url: 'https://www.thedrivo.com',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://www.thedrivo.com/?city={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {/* Structured Data — LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              '@id': 'https://www.thedrivo.com',
              name: 'Drivo LK',
              description: 'Sri Lanka vehicle rental marketplace — cars, bikes, tuk-tuks & vans island-wide',
              url: 'https://www.thedrivo.com',
              image: 'https://www.thedrivo.com/og-image.jpg',
              priceRange: 'Rs. 2,500 — Rs. 25,000 per day',
              currenciesAccepted: 'LKR',
              paymentAccepted: 'Cash, Bank Transfer',
              areaServed: {
                '@type': 'Country',
                name: 'Sri Lanka',
              },
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'LK',
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}