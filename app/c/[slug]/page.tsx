import { MessageCircle, Mic, User, Video, ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Navigation from '@/components/Navigation';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface CommentData {
  id: string;
  content: string | null;
  audio_url: string | null;
  video_url: string | null;
  slug: string | null;
  created_at: string;
  user_id: string;
  vibelog_id: string;
  parent_comment_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface ProfileData {
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface VibelogData {
  id: string;
  title: string;
  public_slug: string | null;
  cover_image_url: string | null;
  user_id: string;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Try to find by slug first, then by ID
  let comment: CommentData | null = null;

  const { data: bySlug } = await supabase
    .from('comments')
    .select('id, content, audio_url, video_url, slug, seo_title, seo_description, created_at')
    .eq('slug', slug)
    .single();

  if (bySlug) {
    comment = bySlug as CommentData;
  } else {
    // Fallback to ID lookup
    const { data: byId } = await supabase
      .from('comments')
      .select('id, content, audio_url, video_url, slug, seo_title, seo_description, created_at')
      .eq('id', slug)
      .single();
    if (byId) {
      comment = byId as CommentData;
    }
  }

  if (!comment) {
    return {
      title: 'Comment Not Found | VibeLog',
      description: 'This comment could not be found.',
    };
  }

  const commentType = comment.video_url ? 'Video' : comment.audio_url ? 'Voice' : 'Text';
  const preview = comment.content?.slice(0, 160) || `${commentType} comment on VibeLog`;

  const title = comment.seo_title || `${commentType} Vibe | VibeLog`;
  const description = comment.seo_description || preview;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: comment.created_at,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: `/c/${comment.slug || comment.id}`,
    },
  };
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function CommentPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Try to find by slug first, then by ID
  let comment: CommentData | null = null;

  const { data: bySlug } = await supabase.from('comments').select('*').eq('slug', slug).single();

  if (bySlug) {
    comment = bySlug as CommentData;
  } else {
    const { data: byId } = await supabase.from('comments').select('*').eq('id', slug).single();
    if (byId) {
      comment = byId as CommentData;
    }
  }

  if (!comment) {
    notFound();
  }

  // Fetch author profile
  let author: ProfileData | null = null;
  if (comment.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, full_name, avatar_url')
      .eq('id', comment.user_id)
      .single();
    author = profile as ProfileData;
  }

  // Fetch parent vibelog
  let vibelog: VibelogData | null = null;
  let vibelogAuthor: ProfileData | null = null;
  if (comment.vibelog_id) {
    const { data: vibelogData } = await supabase
      .from('vibelogs')
      .select('id, title, public_slug, cover_image_url, user_id')
      .eq('id', comment.vibelog_id)
      .single();
    vibelog = vibelogData as VibelogData;

    if (vibelog?.user_id) {
      const { data: authorData } = await supabase
        .from('profiles')
        .select('username, display_name, full_name, avatar_url')
        .eq('id', vibelog.user_id)
        .single();
      vibelogAuthor = authorData as ProfileData;
    }
  }

  const isVoice = !!comment.audio_url;
  const isVideo = !!comment.video_url;
  const commentType = isVideo ? 'Video' : isVoice ? 'Voice' : 'Text';
  const TypeIcon = isVideo ? Video : isVoice ? Mic : MessageCircle;
  const typeColor = isVideo ? 'text-purple-400' : isVoice ? 'text-blue-400' : 'text-electric';
  const typeBgColor = isVideo ? 'bg-purple-500/20' : isVoice ? 'bg-blue-500/20' : 'bg-electric/20';

  const displayName = author?.display_name || author?.full_name || author?.username || 'Anonymous';
  const vibelogSlug = vibelog?.public_slug || vibelog?.id;

  // JSON-LD structured data for SEO/AEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Comment',
    '@id': `https://vibelog.io/c/${comment.slug || comment.id}`,
    text: comment.content || `${commentType} comment`,
    dateCreated: comment.created_at,
    author: {
      '@type': 'Person',
      name: displayName,
      url: author?.username ? `https://vibelog.io/${author.username}` : undefined,
    },
    about: vibelog
      ? {
          '@type': 'Article',
          name: vibelog.title,
          url: `https://vibelog.io/v/${vibelogSlug}`,
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navigation />

      <main className="min-h-screen bg-background pb-20 pt-20">
        <div className="mx-auto max-w-2xl px-4">
          {/* Back navigation */}
          <Link
            href={vibelog ? `/v/${vibelogSlug}` : '/'}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {vibelog ? `Back to "${vibelog.title}"` : 'Back to home'}
          </Link>

          {/* Comment card */}
          <article className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm">
            {/* Header */}
            <div className="border-b border-border/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Type badge */}
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${typeBgColor}`}
                  >
                    <TypeIcon className={`h-4 w-4 ${typeColor}`} />
                    <span className={`text-sm font-medium ${typeColor}`}>{commentType} Vibe</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                </div>

                {/* Share button */}
                <button
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-electric/50 hover:text-foreground"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      navigator.share({
                        title: `${commentType} Vibe by ${displayName}`,
                        url: `/c/${comment.slug || comment.id}`,
                      });
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>

            {/* Author section */}
            <div className="border-b border-border/30 p-6">
              <Link
                href={author?.username ? `/${author.username}` : '#'}
                className="flex items-center gap-3 transition-opacity hover:opacity-80"
              >
                {author?.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt={displayName}
                    className="h-12 w-12 rounded-full border-2 border-electric/20 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
                    <User className="h-6 w-6 text-electric" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{displayName}</p>
                  {author?.username && (
                    <p className="text-sm text-muted-foreground">@{author.username}</p>
                  )}
                </div>
              </Link>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Video player */}
              {isVideo && comment.video_url && (
                <div className="mb-6 overflow-hidden rounded-xl border border-border/30 bg-black">
                  <video
                    src={comment.video_url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {/* Audio player */}
              {isVoice && comment.audio_url && (
                <div className="mb-6 rounded-xl border border-border/30 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mic className="h-4 w-4" />
                    <span>Voice comment</span>
                  </div>
                  <audio src={comment.audio_url} controls className="w-full" preload="metadata">
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* Text content */}
              {comment.content && (
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground">
                    {comment.content}
                  </p>
                </div>
              )}
            </div>

            {/* Reactions */}
            <div className="border-t border-border/30 p-6">
              <ReactionBar type="comment" id={comment.id} variant="expanded" showCounts />
            </div>

            {/* Parent vibelog link */}
            {vibelog && (
              <div className="border-t border-border/30 bg-muted/10 p-6">
                <p className="mb-3 text-sm text-muted-foreground">Comment on:</p>
                <Link
                  href={`/v/${vibelogSlug}`}
                  className="group flex items-start gap-4 rounded-xl border border-border/30 bg-card/50 p-4 transition-all hover:border-electric/50"
                >
                  {vibelog.cover_image_url && (
                    <img
                      src={vibelog.cover_image_url}
                      alt={vibelog.title}
                      className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-electric">
                      {vibelog.title}
                    </h3>
                    {vibelogAuthor && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        by{' '}
                        {vibelogAuthor.display_name ||
                          vibelogAuthor.full_name ||
                          vibelogAuthor.username}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
                </Link>
              </div>
            )}
          </article>

          {/* Multi-format exports */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/c/${comment.slug || comment.id}.json`}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-electric/50 hover:text-foreground"
            >
              JSON
            </Link>
            <Link
              href={`/c/${comment.slug || comment.id}.md`}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-electric/50 hover:text-foreground"
            >
              Markdown
            </Link>
            <Link
              href={`/c/${comment.slug || comment.id}.txt`}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-electric/50 hover:text-foreground"
            >
              Plain Text
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
