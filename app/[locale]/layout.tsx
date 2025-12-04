import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import { BottomNav } from '@/components/mobile/BottomNav';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { BottomNavProvider } from '@/components/providers/BottomNavProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { VibeBrainWidget } from '@/components/vibe-brain/VibeBrainWidget';
import {
  SUPPORTED_LOCALES,
  generateHreflangLinks,
  getAlternateLocales,
  isLocaleSupported,
  type Locale,
} from '@/lib/seo/hreflang';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Generate static params for all supported locales
export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map(locale => ({ locale }));
}

// Generate metadata dynamically based on locale
export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocaleSupported(locale)) {
    return {};
  }

  const hreflangLinks = generateHreflangLinks('/', locale as Locale);
  const canonicalUrl = `https://vibelog.io/${locale}`;

  return {
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
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
    openGraph: {
      title: 'Vibe → Share Everywhere | vibelog.io',
      description:
        'Transform your voice into polished stories in seconds. Create and publish content naturally with AI-powered voice technology.',
      url: 'https://vibelog.io',
      siteName: 'vibelog.io',
      type: 'website',
      locale: locale,
      alternateLocale: getAlternateLocales(locale as Locale),
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
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!isLocaleSupported(locale)) {
    notFound();
  }

  return (
    <ReactQueryProvider>
      <AuthProvider>
        <TooltipProvider>
          <I18nProvider initialLocale={locale as Locale}>
            <BottomNavProvider>
              {children}
              <BottomNav className="lg:hidden" alwaysVisible />
              <GlobalAudioPlayer />
              <VibeBrainWidget />
              <Toaster />
              <Sonner />
            </BottomNavProvider>
          </I18nProvider>
        </TooltipProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}
