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

const MOCK_MEMBERS: HomeFeedMember[] = [
  {
    id: '1',
    username: 'neon_dreamer',
    display_name: 'Neon Dreamer',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    header_image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&h=400&fit=crop',
    bio: 'Chasing electric sunsets and digital vibes.',
    total_vibelogs: 42,
    created_at: new Date().toISOString(),
    latest_vibelog: {
      id: 'v1',
      title: 'Midnight City',
      audio_url: 'mock.mp3',
    },
  },
  {
    id: '2',
    username: 'sonic_wave',
    display_name: 'Sonic Wave',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    header_image:
      'https://images.unsplash.com/photo-1514525253440-b393452e3383?w=800&h=400&fit=crop',
    bio: 'Audio engineer & storyteller. Listen to the world.',
    total_vibelogs: 128,
    created_at: new Date().toISOString(),
    latest_vibelog: {
      id: 'v2',
      title: 'Studio Sessions',
      audio_url: 'mock.mp3',
    },
  },
  {
    id: '3',
    username: 'pixel_art',
    display_name: 'Pixel Art',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    header_image: null,
    bio: 'Creating worlds pixel by pixel.',
    total_vibelogs: 15,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    username: 'nature_whisper',
    display_name: 'Nature Whisper',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    header_image:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=400&fit=crop',
    bio: 'Documenting the sounds of the wild.',
    total_vibelogs: 89,
    created_at: new Date().toISOString(),
  },
];

const MOCK_VIBELOGS: HomeFeedVibelog[] = [
  {
    id: '1',
    title: 'Welcome to the Future',
    content: 'This is a mock vibelog to demonstrate the design.',
    published_at: new Date().toISOString(),
    teaser: 'Experience the next generation of storytelling...',
    author: {
      username: 'neon_dreamer',
      display_name: 'Neon Dreamer',
      avatar_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    },
  },
  {
    id: '2',
    title: 'Audio Revolution',
    content: 'Sound is the most powerful medium.',
    published_at: new Date().toISOString(),
    teaser: 'Why audio is taking over the internet...',
    author: {
      username: 'sonic_wave',
      display_name: 'Sonic Wave',
      avatar_url:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    },
  },
];

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
      // Fallback to mock data for design demo if API fails (e.g. missing env vars)
      setNewMembers(MOCK_MEMBERS);
      setLatestVibelogs(MOCK_VIBELOGS);
      // setError('Unable to load community highlights right now. Please try again in a bit.');
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
                  className="h-[300px] w-72 flex-shrink-0 animate-pulse rounded-3xl border border-border/40 bg-card/60 backdrop-blur"
                />
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
