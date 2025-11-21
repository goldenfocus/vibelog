import type { Metadata } from 'next';
import type { Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VibeBrainWidget } from '@/components/vibe-brain/VibeBrainWidget';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: 'Vibe → Share Everywhere | vibelog.io',
  description:
    'Transform your voice into polished stories in seconds. Create and publish content naturally with AI-powered voice technology.',
  keywords:
    'voice stories, AI content creation, voice recording, speech to text, content creation, story generator',
  authors: [{ name: 'vibelog.io' }],
  creator: 'vibelog.io',
  publisher: 'vibelog.io',
  manifest: '/manifest.json',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://vibelog.io'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Vibe → Share Everywhere | vibelog.io',
    description:
      'Transform your voice into polished stories in seconds. Create and publish content naturally with AI-powered voice technology.',
    url: 'https://vibelog.io',
    siteName: 'vibelog.io',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'vibelog.io - Turn Your Voice Into Stories',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vibe → Share Everywhere | vibelog.io',
    description:
      'Transform your voice into polished stories in seconds. Create and publish content naturally with AI-powered voice technology.',
    images: ['/twitter-image.png'],
    creator: '@vibelog_io',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ReactQueryProvider>
          <AuthProvider>
            <TooltipProvider>
              <I18nProvider>
                {children}
                <GlobalAudioPlayer />
                <VibeBrainWidget />
                <Toaster />
                <Sonner />
              </I18nProvider>
            </TooltipProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
