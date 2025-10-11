'use client';

import { Clock, Heart, Share2, User, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

import BlogContentRenderer from '@/components/BlogContentRenderer';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';

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
  cover_image_url: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  author: VibelogAuthor;
}

interface VibelogCardProps {
  vibelog: Vibelog;
  onRemix?: (content: string) => void;
}

export default function VibelogCard({ vibelog, onRemix }: VibelogCardProps) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  // Show full content if:
  // 1. User is logged in
  // 2. Still loading (optimistic - prevents flash of login prompt for cached users)
  const isLoggedIn = !!user;
  const showFullContent = isLoggedIn || loading;

  const displayContent = showFullContent ? vibelog.content : vibelog.teaser;
  const isTeaser = !showFullContent;

  const handleRemix = () => {
    if (onRemix) {
      onRemix(vibelog.content);
    } else {
      // Redirect to home with remix content in URL params
      const params = new URLSearchParams({
        remix: vibelog.id,
        content: vibelog.content,
      });
      router.push(`/?${params.toString()}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <article className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6 transition-all duration-300 hover:border-electric/30 hover:shadow-lg hover:shadow-electric/5">
      {/* Cover Image */}
      {vibelog.cover_image_url && (
        <div className="mb-4 overflow-hidden rounded-xl">
          <img
            src={vibelog.cover_image_url}
            alt={vibelog.title}
            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      {/* Author & Meta */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {vibelog.author.avatar_url ? (
            <img
              src={vibelog.author.avatar_url}
              alt={vibelog.author.display_name}
              className="h-10 w-10 rounded-full border-2 border-electric/20"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
              <User className="h-5 w-5 text-electric" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{vibelog.author.display_name}</p>
            <p className="text-sm text-muted-foreground">
              @{vibelog.author.username} · {formatDate(vibelog.published_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{vibelog.read_time} min read</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="mb-4 bg-gradient-electric bg-clip-text text-2xl font-bold leading-tight text-transparent">
        {vibelog.title}
      </h2>

      {/* Content */}
      <div className="mb-6">
        <BlogContentRenderer content={displayContent} isTeaser={isTeaser} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border/30 pt-4">
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <button className="flex items-center gap-2 transition-colors hover:text-electric">
            <Heart className="h-4 w-4" />
            <span>{vibelog.like_count}</span>
          </button>
          <button className="flex items-center gap-2 transition-colors hover:text-electric">
            <Share2 className="h-4 w-4" />
            <span>{vibelog.share_count}</span>
          </button>
        </div>
        <button
          onClick={handleRemix}
          className="flex items-center gap-2 rounded-lg bg-electric/10 px-4 py-2 font-medium text-electric transition-all duration-200 hover:bg-electric hover:text-white"
        >
          <Sparkles className="h-4 w-4" />
          {t('components.vibelogCard.remix')}
        </button>
      </div>
    </article>
  );
}
