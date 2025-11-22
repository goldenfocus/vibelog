import { Metadata } from 'next';

import { generateCanonicalUrl, generateHreflangLinks, type Locale } from '@/lib/seo/hreflang';

interface FAQLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: FAQLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = generateCanonicalUrl('/faq', locale as Locale);
  const hreflangLinks = generateHreflangLinks('/faq', locale as Locale);

  return {
    title: 'FAQ — VibeLog Frequently Asked Questions',
    description:
      'Find answers to common questions about VibeLog. Learn about voice recording, AI content generation, publishing, pricing, and more.',
    openGraph: {
      title: 'FAQ — VibeLog Frequently Asked Questions',
      description:
        'Find answers to common questions about VibeLog. Learn about voice recording, AI content generation, publishing, and more.',
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: 'https://vibelog.io/og-image.png',
          width: 1200,
          height: 630,
          alt: 'VibeLog FAQ',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'FAQ — VibeLog Frequently Asked Questions',
      description:
        'Find answers to common questions about VibeLog. Learn about voice recording, AI content generation, and publishing.',
      images: ['https://vibelog.io/twitter-image.png'],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
  };
}

export default function FAQLayout({ children }: FAQLayoutProps) {
  return children;
}
