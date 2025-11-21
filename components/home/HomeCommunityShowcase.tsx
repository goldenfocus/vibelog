'use client';

import { useCallback, useEffect, useState } from 'react';

import RecentComments from '@/components/RecentComments';

import { FuturisticCarousel } from './FuturisticCarousel';
import { MemberCarousel } from './MemberCarousel';

export interface HomeFeedVibelog {
  id: string;
  title: string;
  slug?: string | null;
  public_slug?: string | null;
  teaser?: string | null;
  content: string;
  cover_image_url?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
  published_at: string;
  read_time?: number | null;
  author: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface HomeFeedMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  header_image?: string | null;
  bio?: string | null;
  total_vibelogs?: number | null;
  created_at: string;
  latest_vibelog?: {
    id: string;
    title: string;
    teaser?: string | null;
    slug?: string | null;
    public_slug?: string | null;
    published_at?: string | null;
    audio_url?: string | null;
  } | null;
}

interface HomeCommunityShowcaseProps {
  onRemix?: (content: string) => void;
  onRefreshRequest?: (refreshFn: () => void) => void; // Callback to expose refresh function to parent
}

export default function HomeCommunityShowcase({
  onRefreshRequest,
  onRemix: _onRemix,
}: HomeCommunityShowcaseProps) {
  const [latestVibelogs, setLatestVibelogs] = useState<HomeFeedVibelog[]>([]);
  const [newMembers, setNewMembers] = useState<HomeFeedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/home-feed', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load community highlights');
      }
      const data = await response.json();
      setLatestVibelogs(data.latestVibelogs || []);
      setNewMembers(data.newestMembers || []);
    } catch (err) {
      console.error('[HomeCommunityShowcase] fetch error', err);
      setError('Unable to load community highlights right now. Please try again in a bit.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load feed on mount and expose refresh function to parent
  useEffect(() => {
    loadFeed();
    onRefreshRequest?.(loadFeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - loadFeed is stable (empty deps in useCallback)

  return (
    <section className="mx-auto max-w-6xl rounded-[32px] border border-border/40 bg-card/40 px-4 py-12 sm:px-8">
      {error && (
        <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Latest Vibelogs - Futuristic Carousel */}
      {loading ? (
        <div className="mb-12">
          <div className="mb-6 px-4 md:px-6">
            <div className="h-8 w-48 animate-pulse rounded-full bg-border/70" />
          </div>
          <div className="flex gap-5 overflow-hidden px-4 md:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`latest-skeleton-${index}`}
                className="h-[480px] w-80 flex-shrink-0 animate-pulse rounded-3xl border border-border/40 bg-card/60 backdrop-blur"
              />
            ))}
          </div>
        </div>
      ) : (
        <FuturisticCarousel
          vibelogs={latestVibelogs}
          title="Latest vibelogs"
          subtitle="Discover the newest voices in the community"
        />
      )}

      {/* Newest members - Futuristic Carousel */}
      {loading ? (
        <div className="py-6">
          <div className="mb-5 px-4 md:px-6">
            <div className="h-6 w-36 animate-pulse rounded-full bg-border/70" />
          </div>
          <div className="flex gap-3 overflow-hidden px-4 md:px-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`member-skeleton-${index}`}
                className="h-[200px] w-[160px] flex-shrink-0 animate-pulse rounded-2xl border border-border/40 bg-card/60 backdrop-blur"
              />
            ))}
          </div>
        </div>
      ) : (
        <MemberCarousel
          members={newMembers}
          title="Newest members"
          subtitle="Welcome to the community"
        />
      )}

      {/* Recent Comments */}
      <div className="mt-12">
        <RecentComments />
      </div>
    </section>
  );
}
