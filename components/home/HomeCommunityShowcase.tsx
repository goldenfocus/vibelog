'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';

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
  original_language?: string | null;
  available_languages?: string[] | null;
  translations?: Record<string, { title?: string; teaser?: string; content?: string }> | null;
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
  const { t } = useI18n();
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
            {t('home.showcase.latestVibelogs')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('home.showcase.discoverNewest')}</p>
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
            {t('home.showcase.newestMembers')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('home.showcase.welcomeToCommunity')}
          </p>
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
        <div className="flex items-center justify-between px-4 md:px-6">
          <div>
            <h2 className="bg-gradient-to-r from-electric via-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
              {t('home.showcase.recentVibes')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.showcase.joinConversation')}
            </p>
          </div>
          <Link
            href="/vibes"
            className={cn(
              'group flex items-center gap-1.5 rounded-full bg-electric/10 px-4 py-2 text-sm font-medium text-electric transition-all hover:bg-electric/20 hover:shadow-lg hover:shadow-electric/20'
            )}
          >
            {t('home.showcase.viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
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
