import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Processing Lab — VibeLog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProcessingLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
