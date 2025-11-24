'use client';

import { Clock, Heart, User, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import Comments from '@/components/comments/Comments';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import VibelogActions from '@/components/VibelogActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import VibelogEditModalFull from '@/components/VibelogEditModalFull';
import { useAutoPlayVibelogAudio } from '@/hooks/useAutoPlayVibelogAudio';
import { formatFullDate } from '@/lib/date-utils';
import type { ExportFormat } from '@/lib/export';

interface VibelogAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Vibelog {
  id: string;
  title: string;
  teaser: string;
  content: string;
  audio_url?: string | null;
  cover_image_url: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  user_id?: string;
  author: VibelogAuthor;
}

// Utility: Strip duplicate title from markdown content
function stripDuplicateTitle(content: string, title: string): string {
  // Match first H1 heading
  const h1Match = content.match(/^#\s+(.+?)$/m);
  if (h1Match && h1Match[1].trim() === title.trim()) {
    // Remove the H1 line and any trailing newlines
    return content.replace(/^#\s+.+?$\n*/m, '').trim();
  }
  return content;
}

export default function VibelogDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const vibelogId = params.id as string;

  const [vibelog, setVibelog] = useState<Vibelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    async function fetchVibelog() {
      try {
        const response = await fetch(`/api/get-vibelog/${vibelogId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Vibelog not found');
          } else if (response.status === 403) {
            setError('You need to sign in to view this vibelog');
          } else {
            setError('Failed to load vibelog');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setVibelog(data.vibelog);
        setLikeCount(data.vibelog.like_count || 0);
      } catch (err) {
        console.error('Error fetching vibelog:', err);
        setError('Failed to load vibelog');
      } finally {
        setLoading(false);
      }
    }

    if (vibelogId) {
      fetchVibelog();
    }
  }, [vibelogId]);

  // Redirect to signin if not authenticated and auth finishes loading
  useEffect(() => {
    if (!authLoading && !user && error === 'You need to sign in to view this vibelog') {
      router.push(`/auth/signin?returnTo=/vibelogs/${vibelogId}`);
    }
  }, [authLoading, user, error, router, vibelogId]);

  useAutoPlayVibelogAudio({
    vibelogId: vibelog?.id,
    audioUrl: vibelog?.audio_url,
    title: vibelog?.title,
    author: vibelog?.author?.display_name,
    enabled: !!vibelog?.audio_url,
  });

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!vibelog) {
      return;
    }

    try {
      const response = await fetch(`/api/delete-vibelog/${vibelog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        toast.error(errorData.error || `Failed to delete (${response.status})`);
        return;
      }

      toast.success('Vibelog deleted successfully');
      router.push('/community');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete vibelog');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !vibelog) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h1 className="mb-4 text-2xl font-bold text-foreground">
                {error || 'Vibelog not found'}
              </h1>
              <button
                onClick={() => router.push('/community')}
                className="text-electric hover:underline"
              >
                ← Back to Community
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-muted-foreground transition-colors hover:text-electric"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Cover Image */}
          {vibelog.cover_image_url && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              <img
                src={vibelog.cover_image_url}
                alt={vibelog.title}
                className="h-96 w-full object-cover"
              />
            </div>
          )}

          {/* Article Header */}
          <article className="mb-8">
            <h1 className="mb-6 bg-gradient-electric bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-5xl">
              {vibelog.title}
            </h1>

            {/* Author & Meta */}
            <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border/30 pb-6">
              <div className="flex items-center gap-3">
                {vibelog.author.avatar_url ? (
                  <img
                    src={vibelog.author.avatar_url}
                    alt={vibelog.author.display_name}
                    className="h-12 w-12 rounded-full border-2 border-electric/20"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
                    <User className="h-6 w-6 text-electric" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{vibelog.author.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{vibelog.author.username}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{formatFullDate(vibelog.published_at)}</span>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{vibelog.read_time} min read</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>{likeCount}</span>
                </div>
              </div>
            </div>

            {/* Content - Show full for authenticated users, teaser for anonymous */}
            <div className="prose prose-invert max-w-none">
              {user ? (
                <VibelogContentRenderer
                  content={stripDuplicateTitle(vibelog.content, vibelog.title)}
                  isTeaser={false}
                />
              ) : (
                <>
                  <VibelogContentRenderer
                    content={vibelog.teaser || vibelog.content.substring(0, 500) + '...'}
                    isTeaser={true}
                  />
                  <div className="mt-8 rounded-2xl border border-electric/30 bg-electric/5 p-6 text-center">
                    <h3 className="mb-2 text-xl font-bold text-electric">
                      Sign in to read the full vibelog
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      Create an account or sign in to access the complete content and join the
                      community.
                    </p>
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="inline-flex items-center gap-2 rounded-lg bg-electric px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-electric-glow"
                    >
                      Sign In
                    </button>
                  </div>
                </>
              )}
            </div>
          </article>

          {/* Actions Footer */}
          <div className="mt-8 border-t border-border/30 pt-8">
            <VibelogActions
              vibelogId={vibelog.id}
              content={vibelog.content}
              title={vibelog.title}
              author={vibelog.author.display_name}
              authorId={vibelog.user_id}
              authorUsername={vibelog.author.username}
              vibelogUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/vibelogs/${vibelog.id}`}
              createdAt={vibelog.created_at}
              audioUrl={vibelog.audio_url || undefined}
              teaserOnly={!user}
              likeCount={likeCount}
              onLikeCountChange={setLikeCount}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={async () => {
                const url = `${window.location.origin}/vibelogs/${vibelog.id}`;
                if (navigator.share) {
                  await navigator.share({
                    title: vibelog.title,
                    text: vibelog.teaser,
                    url: url,
                  });
                } else {
                  await navigator.clipboard.writeText(url);
                }
              }}
              onExport={(format: ExportFormat) => {
                console.log('Export as:', format);
              }}
              variant="default"
            />
          </div>

          {/* Comments Section */}
          <Comments vibelogId={vibelog.id} />
        </div>
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && vibelog && (
        <VibelogEditModalFull
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            // Refresh the vibelog data after edit
            const refreshVibelog = async () => {
              try {
                const response = await fetch(`/api/get-vibelog/${vibelogId}`);
                if (response.ok) {
                  const data = await response.json();
                  setVibelog(data.vibelog);
                }
              } catch (err) {
                console.error('Error refreshing vibelog:', err);
              }
            };
            refreshVibelog();
          }}
          vibelog={{
            id: vibelog.id,
            title: vibelog.title,
            content: vibelog.content,
            teaser: vibelog.teaser,
            slug: vibelog.user_id ? undefined : vibelog.id, // Use id as fallback if no slug
            cover_image_url: vibelog.cover_image_url,
            cover_image_alt: vibelog.title,
          }}
        />
      )}
    </div>
  );
}
