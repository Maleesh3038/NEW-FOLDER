import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "drivo | Rent Cars & Bikes in Sri Lanka - Best Rates",
  description: "Compare and book cars, SUVs, and motorbikes from top rental hubs near you in Sri Lanka. Transparent pricing, 10% advance booking, and no hidden fees.",
  keywords: ["rent a car sri lanka", "bike rental colombo", "drivo lanka", "scooter rent kandy", "self drive lanka", "drivo car rental"],
  authors: [{ name: "drivo Team" }],
  openGraph: {
    title: "drivo | Self-Drive Vehicle Rental Hub Sri Lanka",
    description: "Find the closest car or bike for rent with live pricing and availability.",
    url: "https://drivo.lk", // Passe ubalage domain name eka meka venuvatha danna puluwan
    siteName: "drivo Sri Lanka",
    images: [
      {
        url: "/og-image.png", // Social media share karaddi yana main branding image eka
        width: 1200,
        height: 630,
        alt: "drivo Vehicle Rentals Hub Sri Lanka",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "drivo | Vehicle Rental Platform Sri Lanka",
    description: "Rent cars and bikes across Sri Lanka seamlessly with 10% micro advance.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}