import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

// Security headers for every response (the Content-Security-Policy is set per request in src/middleware.ts).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig = (phase: string): NextConfig => ({
  // `npm run dev` builds into its own folder, so it can run next to `npm start` without breaking the live site.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  poweredByHeader: false, // don't advertise the framework
  productionBrowserSourceMaps: false, // no source maps shipped to browsers
  reactStrictMode: true,
  // The whole stylesheet is small, so it goes inside the HTML: no render-blocking CSS request before first paint
  // (measured: largest paint on a phone 0.7 s with it, 3 s without).
  experimental: { inlineCss: true },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
      { source: '/posters/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
});

export default nextConfig;
