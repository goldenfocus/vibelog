import { ArrowLeft, ExternalLink, MessageCircle, Mic, Share2, User, Video } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Navigation from '@/components/Navigation';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: comment } = await supabase
    .from('comments')
    .select('id, content, audio_url, video_url, slug, created_at')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();

  if (!comment) {
    return { title: 'Comment Not Found | VibeLog' };
  }

  const commentType = comment.video_url ? 'Video' : comment.audio_url ? 'Voice' : 'Text';
  const preview = comment.content?.slice(0, 160) || `${commentType} comment on VibeLog`;

  return {
    title: `${commentType} Vibe | VibeLog`,
    description: preview,
    openGraph: { title: `${commentType} Vibe | VibeLog`, description: preview, type: 'article' },
  };
}

function formatTimeAgo(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) {
    return 'just now';
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)} minutes ago`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)} hours ago`;
  }
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function CommentPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: comment } = await supabase
    .from('comments')
    .select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();

  if (!comment) {
    notFound();
  }

  // Fetch author
  const { data: author } = comment.user_id
    ? await supabase
        .from('profiles')
        .select('username, display_name, full_name, avatar_url')
        .eq('id', comment.user_id)
        .single()
    : { data: null };

  // Fetch vibelog
  const { data: vibelog } = comment.vibelog_id
    ? await supabase
        .from('vibelogs')
        .select('id, title, public_slug, cover_image_url, user_id')
        .eq('id', comment.vibelog_id)
        .single()
    : { data: null };

  const { data: vibelogAuthor } = vibelog?.user_id
    ? await supabase
        .from('profiles')
        .select('username, display_name, full_name')
        .eq('id', vibelog.user_id)
        .single()
    : { data: null };

  const isVoice = !!comment.audio_url;
  const isVideo = !!comment.video_url;
  const commentType = isVideo ? 'Video' : isVoice ? 'Voice' : 'Text';
  const TypeIcon = isVideo ? Video : isVoice ? Mic : MessageCircle;
  const typeColor = isVideo ? 'text-purple-400' : isVoice ? 'text-blue-400' : 'text-electric';
  const typeBgColor = isVideo ? 'bg-purple-500/20' : isVoice ? 'bg-blue-500/20' : 'bg-electric/20';
  const displayName = author?.display_name || author?.full_name || author?.username || 'Anonymous';
  const vibelogSlug = vibelog?.public_slug || vibelog?.id;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Comment',
    '@id': `https://vibelog.io/c/${comment.slug || comment.id}`,
    text: comment.content || `${commentType} comment`,
    dateCreated: comment.created_at,
    author: { '@type': 'Person', name: displayName },
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
          <Link
            href={vibelog ? `/v/${vibelogSlug}` : '/'}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {vibelog ? `Back to "${vibelog.title}"` : 'Back to home'}
          </Link>

          <article className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm">
            <div className="border-b border-border/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
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
                <button className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>

            <div className="border-b border-border/30 p-6">
              <Link
                href={author?.username ? `/${author.username}` : '#'}
                className="flex items-center gap-3 hover:opacity-80"
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

            <div className="p-6">
              {isVideo && comment.video_url && (
                <div className="mb-6 overflow-hidden rounded-xl border border-border/30 bg-black">
                  <video src={comment.video_url} controls playsInline className="w-full" />
                </div>
              )}
              {isVoice && comment.audio_url && (
                <div className="mb-6 rounded-xl border border-border/30 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mic className="h-4 w-4" />
                    <span>Voice comment</span>
                  </div>
                  <audio src={comment.audio_url} controls className="w-full" />
                </div>
              )}
              {comment.content && (
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground">
                  {comment.content}
                </p>
              )}
            </div>

            <div className="border-t border-border/30 p-6">
              <ReactionBar type="comment" id={comment.id} variant="expanded" showCounts />
            </div>

            {vibelog && (
              <div className="border-t border-border/30 bg-muted/10 p-6">
                <p className="mb-3 text-sm text-muted-foreground">Comment on:</p>
                <Link
                  href={`/v/${vibelogSlug}`}
                  className="group flex items-start gap-4 rounded-xl border border-border/30 bg-card/50 p-4 hover:border-electric/50"
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
                  <ExternalLink className="h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-electric" />
                </Link>
              </div>
            )}
          </article>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/api/comments/export?id=${comment.id}&format=json`}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              JSON
            </Link>
            <Link
              href={`/api/comments/export?id=${comment.id}&format=md`}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Markdown
            </Link>
            <Link
              href={`/api/comments/export?id=${comment.id}&format=txt`}
              className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Plain Text
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
