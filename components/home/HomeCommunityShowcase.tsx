'use client';

import { useCallback, useEffect, useState } from 'react';

import type { CommentCardData } from './CommentCard';
import { CommentCarousel } from './CommentCarousel';
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
  const [recentComments, setRecentComments] = useState<CommentCardData[]>([]);
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
      setRecentComments(data.recentComments || []);
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
    <div className="mx-auto max-w-6xl space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Latest Vibelogs Section */}
      <section className="space-y-4">
        {/* Title - OUTSIDE the box */}
        <div className="px-4 md:px-6">
          <h2 className="bg-gradient-to-r from-electric via-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
            Latest vibelogs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover the newest voices in the community
          </p>
        </div>

        {/* Carousel Box */}
        {loading ? (
          <div className="rounded-[32px] border border-border/40 bg-card/40 p-6">
            <div className="flex gap-5 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`latest-skeleton-${index}`}
                  className="h-[480px] w-80 flex-shrink-0 animate-pulse rounded-3xl border border-border/40 bg-card/60 backdrop-blur"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-border/40 bg-card/40 p-6">
            <FuturisticCarousel vibelogs={latestVibelogs} />
          </div>
        )}
      </section>

      {/* Newest Members Section */}
      <section className="space-y-4">
        {/* Title - OUTSIDE the box */}
        <div className="px-4 md:px-6">
          <h2 className="bg-gradient-to-r from-electric via-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
            Newest members
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome to the community</p>
        </div>

        {/* Carousel Box */}
        {loading ? (
          <div className="rounded-[32px] border border-border/40 bg-card/40 p-6">
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={`member-skeleton-${index}`}
                  className="flex flex-shrink-0 flex-col items-center"
                >
                  <div className="h-20 w-20 animate-pulse rounded-full bg-card/60 md:h-24 md:w-24" />
                  <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-card/40" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-border/40 bg-card/40 p-6">
            <MemberCarousel members={newMembers} />
          </div>
        )}
      </section>

      {/* Recent Vibes Section */}
      <section className="space-y-4">
        {/* Title - OUTSIDE the box */}
        <div className="px-4 md:px-6">
          <h2 className="bg-gradient-to-r from-electric via-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
            Recent Vibes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Join the conversation</p>
        </div>

        {/* Carousel Box */}
        {loading ? (
          <div className="rounded-[32px] border border-border/40 bg-card/40 p-6">
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`comment-skeleton-${index}`}
                  className="h-[280px] w-[260px] flex-shrink-0 animate-pulse rounded-2xl border border-border/40 bg-card/60 backdrop-blur"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-border/40 bg-card/40 p-6">
            <CommentCarousel comments={recentComments} />
          </div>
        )}
      </section>
    </div>
  );
}
