import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — VibeLog Plans for Creators & Agencies',
  description:
    'Flexible pricing for creators, influencers, and agencies. Start free, upgrade as you grow. Voice-to-content AI publishing that scales.',
  openGraph: {
    title: 'Pricing — VibeLog Plans for Creators & Agencies',
    description:
      'Flexible pricing for creators, influencers, and agencies. Start free, upgrade as you grow.',
    url: 'https://vibelog.io/pricing',
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
    canonical: 'https://vibelog.io/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
