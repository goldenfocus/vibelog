'use client';

import { ArrowLeft, ArrowRight, Loader2, Music2, Pause, Play, UserPlus, Video } from 'lucide-react';
import Link from 'next/link';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { VideoPlayer } from '@/components/video';
import { useAudioPlayerStore } from '@/state/audio-player-store';

interface HomeFeedVibelog {
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
}

export default function HomeCommunityShowcase(_props: HomeCommunityShowcaseProps) {
  const [latestVibelogs, setLatestVibelogs] = useState<HomeFeedVibelog[]>([]);
  const [newMembers, setNewMembers] = useState<HomeFeedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const latestRef = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);

  const { currentTrack, isPlaying, isLoading, play, pause, setPlaylist } = useAudioPlayerStore();

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

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const scrollCarousel = useCallback((ref: RefObject<HTMLDivElement>, direction: 1 | -1) => {
    if (!ref.current) {
      return;
    }
    const scrollAmount = ref.current.clientWidth * 0.8 * direction;
    ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }, []);

  const handlePreview = useCallback(
    async (vibelog: HomeFeedVibelog) => {
      if (!vibelog.audio_url) {
        toast.info('This vibe does not have audio yet');
        return;
      }

      const trackId = `vibelog-${vibelog.id}`;
      if (currentTrack?.id === trackId) {
        if (isPlaying) {
          pause();
        } else {
          try {
            await play();
          } catch (error) {
            toast.info('Tap play in the player to listen');
            console.warn('Resuming playback failed', error);
          }
        }
        return;
      }

      // Create playlist from artist's vibelogs (filter by same author)
      const artistVibelogs = latestVibelogs.filter(
        v => v.author?.username === vibelog.author?.username && v.audio_url
      );

      // Set up playlist starting from clicked vibelog
      const clickedIndex = artistVibelogs.findIndex(v => v.id === vibelog.id);
      const playlistOrder = [
        ...artistVibelogs.slice(clickedIndex),
        ...artistVibelogs.slice(0, clickedIndex),
      ];

      const tracks = playlistOrder.map(v => ({
        id: `vibelog-${v.id}`,
        url: v.audio_url!,
        title: v.title,
        author: v.author?.display_name,
        type: 'url' as const,
      }));

      // Set the playlist starting from clicked vibelog (index 0 in reordered array)
      setPlaylist(tracks, 0);

      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        await play();
        toast.success(
          `Playing ${artistVibelogs.length} vibe${artistVibelogs.length > 1 ? 's' : ''} from ${vibelog.author?.display_name}`
        );
      } catch (error) {
        toast.info('Tap play in the player to listen');
        console.warn('Starting playback failed', error);
      }
    },
    [currentTrack?.id, isPlaying, pause, play, setPlaylist, latestVibelogs]
  );

  const activeTrackId = currentTrack?.id;

  return (
    <section className="mx-auto max-w-6xl rounded-[32px] border border-border/40 bg-card/40 px-4 py-12 sm:px-8">
      {error && (
        <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Latest Vibelogs */}
      <div className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-foreground">Latest vibelogs</h3>
          <div className="hidden gap-2 lg:flex">
            <button
              aria-label="Scroll latest vibelogs left"
              className="rounded-full border border-border/40 p-3 text-foreground transition hover:border-electric/40 hover:text-electric"
              onClick={() => scrollCarousel(latestRef, -1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Scroll latest vibelogs right"
              className="rounded-full border border-border/40 p-3 text-foreground transition hover:border-electric/40 hover:text-electric"
              onClick={() => scrollCarousel(latestRef, 1)}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={latestRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6"
          style={{ scrollBehavior: 'smooth' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`latest-skeleton-${index}`}
                  className="h-72 w-80 flex-shrink-0 animate-pulse rounded-3xl border border-border/40 bg-card/60 p-6 backdrop-blur"
                >
                  <div className="mb-4 h-6 w-32 rounded-full bg-border/70" />
                  <div className="mb-6 h-4 w-48 rounded-full bg-border/60" />
                  <div className="space-y-3">
                    <div className="h-3 rounded-full bg-border/50" />
                    <div className="h-3 rounded-full bg-border/40" />
                    <div className="h-3 w-2/3 rounded-full bg-border/30" />
                  </div>
                  <div className="mt-auto h-10 w-full rounded-full bg-border/40" />
                </div>
              ))
            : latestVibelogs.map(vibelog => {
                const trackId = `vibelog-${vibelog.id}`;
                const isActive = activeTrackId === trackId;
                const isTrackPlaying = isActive && isPlaying;

                const vibelogUrl = vibelog.public_slug
                  ? `/@anonymous/${vibelog.public_slug}`
                  : vibelog.slug
                    ? `/@${vibelog.author?.username}/${vibelog.slug}`
                    : `/vibelogs/${vibelog.id}`;

                return (
                  <article
                    key={vibelog.id}
                    className="group relative flex w-80 flex-shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card/90 via-card/60 to-card/30 shadow-inner shadow-black/20 transition hover:border-electric/40 hover:shadow-electric/10"
                  >
                    {/* Video Player or Cover Image */}
                    {vibelog.video_url ? (
                      <div className="relative w-full overflow-hidden">
                        <VideoPlayer
                          videoUrl={vibelog.video_url}
                          poster={vibelog.cover_image_url || undefined}
                        />
                        {/* Video indicator badge */}
                        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                          <Video className="h-3.5 w-3.5" />
                          Video
                        </div>
                      </div>
                    ) : vibelog.cover_image_url ? (
                      <Link
                        href={vibelogUrl}
                        className="relative block aspect-video w-full overflow-hidden bg-muted"
                      >
                        <img
                          src={vibelog.cover_image_url}
                          alt={vibelog.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </Link>
                    ) : null}

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-4 flex items-center gap-3">
                        {vibelog.author?.avatar_url ? (
                          <img
                            src={vibelog.author.avatar_url}
                            alt={vibelog.author.display_name}
                            className="h-10 w-10 rounded-full border border-border/30 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/30 bg-primary/5 text-primary">
                            <Music2 className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {vibelog.author?.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{vibelog.author?.username} · {formatRelativeTime(vibelog.published_at)}
                          </p>
                        </div>
                      </div>

                      <Link href={vibelogUrl} className="mb-3 block">
                        <h4 className="text-xl font-semibold transition-colors group-hover:text-electric">
                          {vibelog.title}
                        </h4>
                      </Link>
                      <Link href={vibelogUrl} className="mb-6 block">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {vibelog.teaser || vibelog.content}
                        </p>
                      </Link>

                      {vibelog.audio_url && (
                        <div className="mt-auto">
                          <button
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/60 ${
                              isTrackPlaying
                                ? 'bg-electric text-white'
                                : 'border border-border/50 bg-white/5 text-foreground hover:border-electric/40 hover:text-electric'
                            }`}
                            onClick={e => {
                              e.stopPropagation();
                              handlePreview(vibelog);
                            }}
                          >
                            {isTrackPlaying ? (
                              <>
                                <Pause className="h-4 w-4" />
                                Playing
                              </>
                            ) : (
                              <>
                                {isActive && isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                Listen
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
        </div>
      </div>

      {/* Newest members */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-foreground">Newest members</h3>
          <div className="hidden gap-2 lg:flex">
            <button
              aria-label="Scroll newest members left"
              className="rounded-full border border-border/40 p-3 text-foreground transition hover:border-electric/40 hover:text-electric"
              onClick={() => scrollCarousel(memberRef, -1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Scroll newest members right"
              className="rounded-full border border-border/40 p-3 text-foreground transition hover:border-electric/40 hover:text-electric"
              onClick={() => scrollCarousel(memberRef, 1)}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={memberRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          style={{ scrollBehavior: 'smooth' }}
        >
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`member-skeleton-${index}`}
                  className="h-80 w-80 flex-shrink-0 animate-pulse rounded-3xl border border-border/40 bg-gradient-to-br from-card/90 via-card/60 to-card/30 p-6 shadow-inner shadow-black/20"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-border/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded-full bg-border/50" />
                      <div className="h-3 w-24 rounded-full bg-border/40" />
                      <div className="h-3 w-16 rounded-full bg-border/30" />
                    </div>
                  </div>
                  <div className="mb-4 space-y-2">
                    <div className="h-3 rounded-full bg-border/50" />
                    <div className="h-3 rounded-full bg-border/40" />
                    <div className="h-3 w-2/3 rounded-full bg-border/30" />
                  </div>
                  <div className="mb-4 h-16 rounded-2xl bg-border/40" />
                  <div className="mt-auto h-10 w-full rounded-full bg-border/40" />
                </div>
              ))
            : newMembers.map(member => {
                const profileUrl = `/@${member.username}`;
                const hasAudio = member.latest_vibelog?.audio_url;

                return (
                  <Link
                    key={member.id}
                    href={profileUrl}
                    className="group relative flex w-80 flex-shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card/90 via-card/60 to-card/30 p-6 shadow-inner shadow-black/20 transition hover:border-electric/40 hover:shadow-electric/10"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.display_name}
                          className="h-16 w-16 rounded-full border-2 border-border/30 object-cover ring-2 ring-transparent transition-all group-hover:ring-electric/20"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border/30 bg-primary/5 text-primary ring-2 ring-transparent transition-all group-hover:ring-electric/20">
                          <UserPlus className="h-7 w-7" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground transition-colors group-hover:text-electric">
                          {member.display_name}
                        </p>
                        <p className="text-sm text-muted-foreground">@{member.username}</p>
                        {member.total_vibelogs !== null && member.total_vibelogs !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {member.total_vibelogs} vibe{member.total_vibelogs !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                      {member.bio || 'Just joined the vibe. Say hi!'}
                    </p>

                    {member.latest_vibelog ? (
                      <div className="mb-4 rounded-2xl border border-border/30 bg-background/40 p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">
                          Latest vibe
                        </p>
                        <p className="line-clamp-2 text-sm font-medium text-foreground">
                          {member.latest_vibelog.title}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 rounded-2xl border border-dashed border-border/30 p-3 text-center text-sm text-muted-foreground">
                        New vibe coming soon ✨
                      </div>
                    )}

                    {/* Listen button - only show if user has audio */}
                    {hasAudio && member.latest_vibelog && (
                      <div className="relative z-10 mt-auto" onClick={e => e.preventDefault()}>
                        <Link
                          href={getVibelogHref(member.username, member.latest_vibelog)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/50 bg-white/5 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-electric/40 hover:text-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/60"
                        >
                          <Play className="h-4 w-4" />
                          Listen
                        </Link>
                      </div>
                    )}
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
}

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString();
}

function getVibelogHref(username: string, vibelog: NonNullable<HomeFeedMember['latest_vibelog']>) {
  if (username === 'anonymous' && vibelog.public_slug) {
    return `/@anonymous/${vibelog.public_slug}`;
  }
  if (vibelog.slug) {
    return `/@${username}/${vibelog.slug}`;
  }
  if (vibelog.public_slug) {
    return `/@${username}/${vibelog.public_slug}`;
  }
  return `/vibelogs/${vibelog.id}`;
}
