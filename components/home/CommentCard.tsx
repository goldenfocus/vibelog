'use client';

import { ExternalLink, MessageCircle, Mic, User, Video } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface CommentCardData {
  id: string;
  content: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  slug?: string | null;
  createdAt: string;
  commentator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  vibelog: {
    id: string;
    title: string;
    slug?: string | null;
    coverImageUrl: string | null;
    videoUrl: string | null;
    author: {
      username: string;
      displayName: string;
    };
  };
  reactionCount?: number;
}

interface CommentCardProps {
  comment: CommentCardData;
  index: number;
  isActive?: boolean;
}

function truncateText(text: string, maxLength: number = 120) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + '...';
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
    return `${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
  const weeks = Math.floor(diffInSeconds / 604800);
  return `${weeks}w ago`;
}

export function CommentCard({ comment, index, isActive = false }: CommentCardProps) {
  const isVoice = !!comment.audioUrl;
  const isVideo = !!comment.videoUrl;
  const hasMedia = isVoice || isVideo;
  const vibelogSlug = comment.vibelog.slug || comment.vibelog.id;

  // Determine the comment type icon and color
  const TypeIcon = isVideo ? Video : isVoice ? Mic : MessageCircle;
  const typeColor = isVideo ? 'text-purple-400' : isVoice ? 'text-blue-400' : 'text-electric';
  const typeBgColor = isVideo ? 'bg-purple-500/20' : isVoice ? 'bg-blue-500/20' : 'bg-electric/20';

  return (
    <Link
      href={`/v/${vibelogSlug}#comment-${comment.id}`}
      className={cn(
        'group relative flex h-[280px] w-[260px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300',
        'hover:scale-[1.02] hover:border-electric/50 hover:shadow-lg hover:shadow-electric/10',
        isActive && 'border-electric/60 shadow-lg shadow-electric/20'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Media indicator badge */}
      {hasMedia && (
        <div
          className={cn(
            'absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1',
            typeBgColor
          )}
        >
          <TypeIcon className={cn('h-3.5 w-3.5', typeColor)} />
          <span className={cn('text-xs font-medium', typeColor)}>
            {isVideo ? 'Video' : 'Voice'}
          </span>
        </div>
      )}

      {/* Content area */}
      <div className="flex flex-1 flex-col p-4">
        {/* Comment preview */}
        <div className="mb-3 flex-1">
          <div className="mb-2 flex items-start gap-2">
            <TypeIcon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', typeColor)} />
            <p className="text-sm leading-relaxed text-foreground/90">
              {comment.content
                ? truncateText(comment.content, 100)
                : isVoice
                  ? 'Voice vibe - tap to listen'
                  : 'Video vibe - tap to watch'}
            </p>
          </div>
        </div>

        {/* Commentator info */}
        <div className="mb-3 flex items-center gap-2.5">
          {comment.commentator.avatarUrl ? (
            <img
              src={comment.commentator.avatarUrl}
              alt={comment.commentator.displayName}
              className="h-8 w-8 rounded-full border border-border/50 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-electric/10">
              <User className="h-4 w-4 text-electric" />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">
              {comment.commentator.displayName}
            </p>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Original vibelog info */}
        <div className="mt-3 flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              on{' '}
              <span className="font-medium text-foreground/80">
                {truncateText(comment.vibelog.title, 30)}
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              by <span className="text-electric">{comment.vibelog.author.displayName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-electric/5 to-transparent" />
      </div>
    </Link>
  );
}
