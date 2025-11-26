'use client';

import { Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getSafeImageUrl } from '@/lib/image-utils';

interface RelatedVibelog {
  id: string;
  title: string;
  teaser: string;
  slug: string | null;
  public_slug: string | null;
  cover_image_url: string | null;
  read_time: number;
  similarity?: number;
  author: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface RelatedVibelogsProps {
  vibelogId: string;
  limit?: number;
}

export default function RelatedVibelogs({ vibelogId, limit = 4 }: RelatedVibelogsProps) {
  const [vibelogs, setVibelogs] = useState<RelatedVibelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const response = await fetch(`/api/vibelogs/related?id=${vibelogId}&limit=${limit}`);
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();
        setVibelogs(data.vibelogs || []);
      } catch (err) {
        console.error('Failed to fetch related vibelogs:', err);
        setError('Failed to load related content');
      } finally {
        setLoading(false);
      }
    }

    fetchRelated();
  }, [vibelogId, limit]);

  // Don't render anything if loading or no related vibelogs
  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Related Vibelogs</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 rounded-lg bg-muted/50" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted/50" />
              <div className="mt-1 h-3 w-1/2 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || vibelogs.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Related Vibelogs</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {vibelogs.map(vibelog => {
          const href =
            vibelog.author.username === 'anonymous'
              ? `/v/${vibelog.public_slug || vibelog.slug}`
              : `/@${vibelog.author.username}/${vibelog.slug || vibelog.public_slug}`;

          // Use safe image URL (filters out expired OpenAI URLs)
          const safeCoverUrl = getSafeImageUrl(vibelog.cover_image_url);

          return (
            <Link
              key={vibelog.id}
              href={href}
              className="group flex flex-col overflow-hidden rounded-lg border border-border/30 bg-background/50 transition-all hover:border-electric/30 hover:shadow-lg"
            >
              {/* Cover Image */}
              {safeCoverUrl ? (
                <div className="aspect-video w-full overflow-hidden bg-muted/20">
                  <img
                    src={safeCoverUrl}
                    alt={vibelog.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-electric/5 to-purple-500/5">
                  <span className="text-3xl opacity-50">🎙️</span>
                </div>
              )}

              {/* Content */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-electric">
                  {vibelog.title}
                </h3>

                {vibelog.teaser && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {vibelog.teaser}
                  </p>
                )}

                {/* Meta */}
                <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {vibelog.author.avatar_url ? (
                      <img
                        src={vibelog.author.avatar_url}
                        alt={vibelog.author.display_name}
                        className="h-4 w-4 rounded-full"
                      />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    <span>@{vibelog.author.username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{vibelog.read_time || 1} min</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
