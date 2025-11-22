import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 - Page Not Found | VibeLog',
  description: 'The page you are looking for does not exist.',
  openGraph: {
    title: '404 - Page Not Found | VibeLog',
    description: 'The page you are looking for does not exist.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VibeLog - Voice-First Blogging Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '404 - Page Not Found | VibeLog',
    description: 'The page you are looking for does not exist.',
    images: ['/og-image.png'],
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        {/* Animated 404 */}
        <div className="mb-8 duration-700 animate-in fade-in slide-in-from-bottom-4">
          <h1 className="bg-gradient-electric bg-clip-text text-9xl font-bold text-transparent">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="mb-12 delay-150 duration-700 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Page Not Found</h2>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 delay-300 duration-700 animate-in fade-in slide-in-from-bottom-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-electric px-8 py-4 font-semibold text-white transition-all duration-200 hover:bg-electric-glow hover:shadow-lg hover:shadow-electric/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go Home
          </Link>

          <Link
            href="/community"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-card px-8 py-4 font-semibold text-foreground transition-all duration-200 hover:border-electric/50 hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Explore Community
          </Link>
        </div>

        {/* Decorative gradient orb */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-electric/10 via-purple-500/5 to-transparent blur-3xl" />
        </div>
      </div>
    </div>
  );
}
