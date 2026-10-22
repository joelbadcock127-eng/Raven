import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // middleware.ts owns trailing slashes: mirror pages keep WordPress's
  // `/page/` URLs on the property domains, everything else strips them.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.evbuc.com' },
      { protocol: 'https', hostname: 'www.devonport.tas.gov.au' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
