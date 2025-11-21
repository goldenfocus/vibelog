import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publish Lab — VibeLog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PublishLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
