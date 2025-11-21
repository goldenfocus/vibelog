import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ — VibeLog Frequently Asked Questions',
  description:
    'Find answers to common questions about VibeLog. Learn about voice recording, AI content generation, publishing, pricing, and more.',
  openGraph: {
    title: 'FAQ — VibeLog Frequently Asked Questions',
    description:
      'Find answers to common questions about VibeLog. Learn about voice recording, AI content generation, publishing, and more.',
    url: 'https://vibelog.io/faq',
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
    canonical: 'https://vibelog.io/faq',
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
