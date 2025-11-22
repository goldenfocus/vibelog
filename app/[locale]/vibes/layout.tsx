import type { Metadata } from 'next';

export const metadata: Metadata = {
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
    url: 'https://vibelog.io/vibes',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recent Vibes | VibeLog',
    description:
      'Explore the latest vibes from the VibeLog community. Voice, video, and text conversations.',
  },
  alternates: {
    canonical: 'https://vibelog.io/vibes',
  },
};

export default function VibesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
