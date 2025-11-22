import { Metadata } from 'next';

import { generateCanonicalUrl, generateHreflangLinks, type Locale } from '@/lib/seo/hreflang';

interface PricingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PricingLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = generateCanonicalUrl('/pricing', locale as Locale);
  const hreflangLinks = generateHreflangLinks('/pricing', locale as Locale);

  return {
    title: 'Pricing — VibeLog Plans for Creators & Agencies',
    description:
      'Flexible pricing for creators, influencers, and agencies. Start free, upgrade as you grow. Voice-to-content AI publishing that scales.',
    openGraph: {
      title: 'Pricing — VibeLog Plans for Creators & Agencies',
      description:
        'Flexible pricing for creators, influencers, and agencies. Start free, upgrade as you grow.',
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: 'https://vibelog.io/og-image.png',
          width: 1200,
          height: 630,
          alt: 'VibeLog Pricing Plans',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pricing — VibeLog Plans for Creators & Agencies',
      description:
        'Flexible pricing for creators, influencers, and agencies. Start free, upgrade as you grow.',
      images: ['https://vibelog.io/twitter-image.png'],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
  };
}

export default function PricingLayout({ children }: PricingLayoutProps) {
  return children;
}
