/**
 * Shared Comment Utilities
 *
 * Following "everything is an API" principle - extract reusable comment logic
 * Used across: CommentCard, VibesFeed, and any comment display components
 */

import type { CommentCardData } from '@/components/home/CommentCard';

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Format date as relative time (e.g., "2h ago", "3d ago")
 */
export function formatTimeAgo(dateString: string): string {
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

/**
 * Get URL for a comment (links to parent vibelog with comment anchor)
 */
export function getCommentUrl(vibelogSlug: string, commentId: string): string {
  return `/v/${vibelogSlug}#comment-${commentId}`;
}

/**
 * Get comment type metadata
 */
export function getCommentType(comment: Pick<CommentCardData, 'audioUrl' | 'videoUrl'>) {
  const isVoice = !!comment.audioUrl;
  const isVideo = !!comment.videoUrl;
  const hasMedia = isVoice || isVideo;

  return {
    isVoice,
    isVideo,
    isText: !hasMedia,
    hasMedia,
    type: isVideo ? 'video' : isVoice ? 'voice' : 'text',
  };
}

/**
 * Get display text for a comment (handles empty content for media comments)
 */
export function getCommentDisplayText(
  comment: Pick<CommentCardData, 'content' | 'audioUrl' | 'videoUrl'>,
  maxLength: number = 120
): string {
  if (comment.content) {
    return truncateText(comment.content, maxLength);
  }

  const { isVoice, isVideo } = getCommentType(comment);

  if (isVoice) {
    return 'Voice vibe - tap to listen';
  }
  if (isVideo) {
    return 'Video vibe - tap to watch';
  }

  return 'Tap to view';
}

/**
 * Filter comments by type
 */
export type CommentFilterType = 'all' | 'voice' | 'video' | 'text';

export function filterCommentsByType(
  comments: CommentCardData[],
  filter: CommentFilterType
): CommentCardData[] {
  if (filter === 'all') {
    return comments;
  }

  return comments.filter(comment => {
    const { type } = getCommentType(comment);
    return type === filter;
  });
}

/**
 * Sort comments by different criteria
 */
export type CommentSortType = 'recent' | 'trending' | 'popular';

export function sortComments(
  comments: CommentCardData[],
  sortBy: CommentSortType
): CommentCardData[] {
  const sorted = [...comments];

  switch (sortBy) {
    case 'recent':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    case 'trending':
      // Trending = high reaction count + recency
      return sorted.sort((a, b) => {
        const aScore =
          (a.reactionCount || 0) * 10 +
          (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60); // decay by hour
        const bScore =
          (b.reactionCount || 0) * 10 +
          (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
        return bScore - aScore;
      });

    case 'popular':
      // Popular = highest reaction count
      return sorted.sort((a, b) => (b.reactionCount || 0) - (a.reactionCount || 0));

    default:
      return sorted;
  }
}

/**
 * Check if comment is "hot" (highly engaged recently)
 */
export function isHotComment(comment: CommentCardData): boolean {
  const ageInHours = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60 * 60);
  const reactionCount = comment.reactionCount || 0;

  // Hot if: posted within 24h AND has 5+ reactions
  return ageInHours < 24 && reactionCount >= 5;
}
