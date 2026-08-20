import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Decra — booking-generation platform',
  description:
    'Decra finds accommodation demand, identifies empty dates and turns those opportunities into direct bookings.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Decra',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
