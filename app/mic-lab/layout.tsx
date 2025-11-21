import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mic Lab — VibeLog',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MicLabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
