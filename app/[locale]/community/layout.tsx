import { Metadata } from 'next';

import { generateCommunityPageSchema } from '@/lib/seo/breadcrumb-schema';
import { generateCanonicalUrl, generateHreflangLinks, type Locale } from '@/lib/seo/hreflang';

interface CommunityLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CommunityLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = generateCanonicalUrl('/community', locale as Locale);
  const hreflangLinks = generateHreflangLinks('/community', locale as Locale);

  return {
    title: 'Community - Discover Vibelogs | VibeLog',
    description:
      'Explore voice-to-text stories from creators around the world. Discover trending vibelogs, popular creators, and inspiring content.',
    openGraph: {
      title: 'Community - Discover Vibelogs | VibeLog',
      description:
        'Explore voice-to-text stories from creators around the world.',
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: 'https://vibelog.io/og-image.png',
          width: 1200,
          height: 630,
          alt: 'VibeLog Community',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Community - Discover Vibelogs | VibeLog',
      description: 'Explore voice-to-text stories from creators around the world.',
      images: ['https://vibelog.io/twitter-image.png'],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
  };
}

export default async function CommunityLayout({ children, params }: CommunityLayoutProps) {
  const { locale } = await params;
  const communitySchema = generateCommunityPageSchema({ locale });

  return (
    <>
      {/* CollectionPage + BreadcrumbList schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(communitySchema) }}
      />
      {children}
    </>
  );
}
