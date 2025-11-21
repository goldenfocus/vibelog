import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transcript Lab — VibeLog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TranscriptLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
