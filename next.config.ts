import type { NextConfig } from 'next';

// Bundle analyzer configuration
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
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
      // API egress targets
      "connect-src 'self' https://api.openai.com https://*.supabase.co https://*.supabase.in https://vercel.live",
      "media-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      "object-src 'none'",
      "form-action 'self'",
      // Upgrade insecure requests when behind HTTPS
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Allow Vercel Live frames but deny others - frame-src in CSP handles the specific allowlist
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(self)' },
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

export default withBundleAnalyzer(nextConfig);
