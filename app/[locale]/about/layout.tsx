import { Metadata } from 'next';

import { generateAboutPageSchema } from '@/lib/seo/breadcrumb-schema';
import { generateCanonicalUrl, generateHreflangLinks, type Locale } from '@/lib/seo/hreflang';

interface AboutLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AboutLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = generateCanonicalUrl('/about', locale as Locale);
  const hreflangLinks = generateHreflangLinks('/about', locale as Locale);

  return {
    title: 'About VibeLog — Voice-First Content Creation',
    description:
      "Learn about VibeLog's mission to build a living web where creators focus on ideas, not tools. Voice-first AI publishing for the human internet.",
    openGraph: {
      title: 'About VibeLog — Voice-First Content Creation',
      description:
        "Learn about VibeLog's mission to build a living web where creators focus on ideas, not tools.",
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: 'https://vibelog.io/og-image.png',
          width: 1200,
          height: 630,
          alt: 'About VibeLog',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'About VibeLog — Voice-First Content Creation',
      description:
        "Learn about VibeLog's mission to build a living web where creators focus on ideas, not tools.",
      images: ['https://vibelog.io/twitter-image.png'],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
  };
}

export default async function AboutLayout({ children, params }: AboutLayoutProps) {
  const { locale } = await params;
  const aboutSchema = generateAboutPageSchema(locale);

  return (
    <>
      {/* AboutPage + BreadcrumbList schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      {children}
    </>
  );
}
