import { withBotId } from 'botid/next/config';
import type { NextConfig } from 'next';

// Bundle analyzer configuration (only enabled when ANALYZE=true)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased from default 4.5MB to support video uploads
    },
  },
  // Note: App Router uses [locale] dynamic segments instead of i18n config
  // Locale detection handled in middleware.ts
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'www.vibelog.io',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrc = ["'self'", "'unsafe-inline'", 'https://vercel.live']
      .concat(isProd ? [] : ["'unsafe-eval'"])
      .join(' ');
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      // Allow Vercel Live and development tools to embed frames
      "frame-src 'self' https://vercel.live https://*.vercel.live",
      // Allow inline styles from Next.js, consider hashing for stricter CSP later
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Remove 'unsafe-eval' in production
      `script-src ${scriptSrc}`,
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com https://r2cdn.perplexity.ai",
      // API egress targets (include wss:// for Supabase Realtime WebSocket and Pusher fallback)
      // Vercel: vercel.live (toolbar), vercel-insights.com (analytics), va.vercel-scripts.com (scripts)
      // PostHog: app.posthog.com, *.posthog.com (analytics)
      // localhost: Allow Vercel toolbar local proxy (needed when viewing deployed site locally)
      "connect-src 'self' https://api.openai.com https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in wss://*.pusher.com https://vercel.live https://*.vercel.live https://vitals.vercel-insights.com https://va.vercel-scripts.com https://app.posthog.com https://*.posthog.com http://127.0.0.1:*",
      "media-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      "object-src 'none'",
      "form-action 'self'",
      // Upgrade insecure requests when behind HTTPS
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      // Static images - allow cross-origin for OG images, social sharing, etc.
      {
        source: '/:path*.(png|jpg|jpeg|gif|svg|ico|webp)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // All other routes - strict security headers
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Allow Vercel Live frames but deny others - frame-src in CSP handles the specific allowlist
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(self), microphone=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // 2 years HSTS; ensure HTTPS enabled before enabling preload
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withBotId(withBundleAnalyzer(nextConfig));
