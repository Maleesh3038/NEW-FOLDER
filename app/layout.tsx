// app/layout.tsx — REPLACE your existing layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.thedrivo.com'),
  title: {
    default: 'Drivo LK — Rent a Car in Sri Lanka | Cars, Bikes & Tuk-Tuks',
    template: '%s | Drivo LK — Sri Lanka Vehicle Rental',
  },
  description: 'Rent a car in Sri Lanka from verified local owners. Best prices on cars, motorbikes, tuk-tuks & vans in Colombo, Galle, Kandy, Negombo & island-wide. Book online in 60 seconds. No hidden fees.',
  keywords: [
    // High volume primary
    'rent a car Sri Lanka',
    'car rental Sri Lanka',
    'car hire Sri Lanka',
    'vehicle rental Sri Lanka',
    // City specific
    'rent a car Colombo',
    'car rental Colombo',
    'rent a car Galle',
    'car rental Galle',
    'rent a car Kandy',
    'car rental Kandy',
    'rent a car Negombo',
    'car rental Negombo',
    'rent a car Ella',
    'rent a car Mirissa',
    'rent a car Hikkaduwa',
    // Vehicle type
    'motorbike rental Sri Lanka',
    'bike rental Sri Lanka',
    'tuk tuk rental Sri Lanka',
    'van rental Sri Lanka',
    'scooter rental Sri Lanka',
    // Tourist focused
    'cheap car rental Sri Lanka',
    'self drive car Sri Lanka',
    'car hire Colombo airport',
    'tourist car rental Sri Lanka',
    'Sri Lanka travel car',
    'best car rental Sri Lanka',
    // Long tail
    'rent a car without driver Sri Lanka',
    'daily car rental Sri Lanka',
    'monthly car rental Sri Lanka',
    'affordable car hire Sri Lanka',
    // Brand
    'Drivo LK',
    'thedrivo.com',
    'drivo car rental',
  ],
  authors: [{ name: 'Drivo LK', url: 'https://www.thedrivo.com' }],
  creator: 'Drivo LK',
  publisher: 'Drivo LK',
  category: 'travel',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.thedrivo.com',
    siteName: 'Drivo LK',
    title: 'Drivo LK — Rent a Car in Sri Lanka | Best Prices Guaranteed',
    description: 'Sri Lanka\'s #1 vehicle rental marketplace. Verified cars, bikes & tuk-tuks island-wide. Book in 60 seconds. No hidden fees.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Drivo LK — Rent a Car in Sri Lanka',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@drivolanka',
    creator: '@drivolanka',
    title: 'Drivo LK — Rent a Car in Sri Lanka',
    description: 'Sri Lanka\'s #1 vehicle rental marketplace. Verified cars, bikes & tuk-tuks island-wide. Book in 60 seconds.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://www.thedrivo.com',
    languages: {
      'en-US': 'https://www.thedrivo.com',
      'si-LK': 'https://www.thedrivo.com',
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon-16x16.png',
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  manifest: '/site.webmanifest',
  verification: {
    google: '4gPbFuHymJiBBHuVp1MW_6gfBj7kAk39-uvASA5oIEQ',
  },
  other: {
    'geo.region': 'LK',
    'geo.country': 'Sri Lanka',
    'language': 'English',
    'revisit-after': '3 days',
    'rating': 'general',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ── Structured Data: Organization */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': 'https://www.thedrivo.com/#organization',
          name: 'Drivo LK',
          url: 'https://www.thedrivo.com',
          logo: {
            '@type': 'ImageObject',
            url: 'https://www.thedrivo.com/logo.png',
            width: 512,
            height: 512,
          },
          description: "Sri Lanka's #1 vehicle rental marketplace",
          email: 'thedrivo.info@gmail.com',
          telephone: '+94767868513',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'LK',
            addressRegion: 'Southern Province',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+94767868513',
            contactType: 'customer service',
            availableLanguage: ['English', 'Sinhala'],
            contactOption: 'TollFree',
          },
          sameAs: [
            'https://www.facebook.com/share/1Ej3syDQw9/',
            'https://www.instagram.com/drivo_lk',
          ],
        })}} />

        {/* ── Structured Data: WebSite with SearchAction */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': 'https://www.thedrivo.com/#website',
          name: 'Drivo LK',
          url: 'https://www.thedrivo.com',
          description: "Sri Lanka's #1 vehicle rental marketplace",
          publisher: { '@id': 'https://www.thedrivo.com/#organization' },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: 'https://www.thedrivo.com/?city={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
          },
        })}} />

        {/* ── Structured Data: Car Rental Service */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'AutoRental',
          '@id': 'https://www.thedrivo.com/#service',
          name: 'Drivo LK — Car & Vehicle Rental Sri Lanka',
          description: 'Rent verified cars, motorbikes, tuk-tuks and vans across Sri Lanka. Best prices, no hidden fees, book in 60 seconds.',
          url: 'https://www.thedrivo.com',
          image: 'https://www.thedrivo.com/og-image.jpg',
          priceRange: 'Rs. 1,500 — Rs. 25,000 per day',
          currenciesAccepted: 'LKR',
          paymentAccepted: 'Cash, Bank Transfer',
          areaServed: [
            { '@type': 'City', name: 'Colombo' },
            { '@type': 'City', name: 'Galle' },
            { '@type': 'City', name: 'Kandy' },
            { '@type': 'City', name: 'Negombo' },
            { '@type': 'City', name: 'Matara' },
            { '@type': 'City', name: 'Ella' },
            { '@type': 'Country', name: 'Sri Lanka' },
          ],
          hasMap: 'https://www.thedrivo.com',
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
            opens: '00:00',
            closes: '23:59',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            bestRating: '5',
            worstRating: '1',
            ratingCount: '47',
          },
        })}} />

        {/* ── Structured Data: FAQPage */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'How do I rent a car in Sri Lanka with Drivo LK?',
              acceptedAnswer: { '@type': 'Answer', text: 'Browse verified vehicles on thedrivo.com, select your dates, choose pickup or delivery, and confirm your booking in 60 seconds. The vehicle owner will confirm via WhatsApp within 30 minutes.' },
            },
            {
              '@type': 'Question',
              name: 'What is the cheapest car rental in Sri Lanka?',
              acceptedAnswer: { '@type': 'Answer', text: 'Drivo LK offers Sri Lanka car rentals starting from Rs. 2,500 per day for motorbikes and from Rs. 4,500 per day for cars. Prices vary by vehicle type, location, and rental duration.' },
            },
            {
              '@type': 'Question',
              name: 'Can foreigners rent a car in Sri Lanka?',
              acceptedAnswer: { '@type': 'Answer', text: 'Yes! Foreign nationals can rent vehicles using their Passport and International Driving Permit. Select "I am a foreign national" during registration on Drivo LK.' },
            },
            {
              '@type': 'Question',
              name: 'Is Drivo LK available island-wide in Sri Lanka?',
              acceptedAnswer: { '@type': 'Answer', text: 'Yes, Drivo LK operates across all major cities and districts in Sri Lanka including Colombo, Galle, Kandy, Negombo, Ella, Matara, Trincomalee, Jaffna and more.' },
            },
            {
              '@type': 'Question',
              name: 'Do I need to pay online to book a vehicle on Drivo LK?',
              acceptedAnswer: { '@type': 'Answer', text: 'No online payment is required. You pay directly to the vehicle owner at pickup — cash or bank transfer. Drivo LK charges a small 10% booking fee included in the listed price.' },
            },
          ],
        })}} />

        {/* ── Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link rel="preconnect" href="https://jqsttpimmzqqxspusegd.supabase.co"/>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}