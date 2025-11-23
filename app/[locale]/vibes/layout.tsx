import type { Metadata } from 'next';

import { generateCanonicalUrl, generateHreflangLinks, type Locale } from '@/lib/seo/hreflang';

interface VibesLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: VibesLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = generateCanonicalUrl('/vibes', locale as Locale);
  const hreflangLinks = generateHreflangLinks('/vibes', locale as Locale);

  return {
    title: 'Recent Vibes | VibeLog',
    description:
      'Explore the latest voice, video, and text vibes from the VibeLog community. Join the conversation and share your thoughts on vibelogs.',
    keywords: [
      'vibes',
      'comments',
      'community',
      'voice comments',
      'video comments',
      'vibelog community',
      'conversations',
    ],
    openGraph: {
      title: 'Recent Vibes | VibeLog',
      description:
        'Explore the latest voice, video, and text vibes from the VibeLog community. Join the conversation.',
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Recent Vibes | VibeLog',
      description:
        'Explore the latest vibes from the VibeLog community. Voice, video, and text conversations.',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
  };
}

export default function VibesLayout({ children }: VibesLayoutProps) {
  return children;
}
