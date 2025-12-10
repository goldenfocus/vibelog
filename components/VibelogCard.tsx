'use client';

import { Clock, User, Music } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import VibelogActions from '@/components/VibelogActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import VibelogEditModalFull from '@/components/VibelogEditModalFull';
import { VideoPlayer } from '@/components/video';
import { getSafeImageUrl } from '@/lib/image-utils';

interface VibelogAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Vibelog {
  id: string;
  title: string;
  slug?: string | null;
  public_slug?: string | null; // For anonymous vibelogs
  teaser: string;
  content: string;
  cover_image_url: string | null;
  audio_url?: string | null; // Original audio recording
  video_url?: string | null; // User-captured or uploaded video
  media_type?: 'voice' | 'music' | 'music_video' | null; // Type of media content
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  comment_count: number;
  read_time: number;
  user_id?: string; // Author's user ID for Edit/Remix logic
  author: VibelogAuthor;
  // Translation fields
  original_language?: string | null;
  available_languages?: string[] | null;
  translations?: Record<string, { title?: string; teaser?: string; content?: string }> | null;
}

interface VibelogCardProps {
  vibelog: Vibelog;
  onRemix?: (content: string) => void;
  onDeleteSuccess?: (vibelogId: string) => void;
}

// Memoized to prevent unnecessary re-renders in lists
const VibelogCard = memo(function VibelogCard({
  vibelog,
  onRemix,
  onDeleteSuccess,
}: VibelogCardProps) {
  const router = useRouter();
  const { user } = useAuth(); // Check if user is logged in
  const { t, locale } = useI18n();
  const isLoggedIn = !!user;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const videoUrl = vibelog.video_url || null;

  // Use safe image URL (filters out expired OpenAI URLs)
  const safeCoverUrl = getSafeImageUrl(vibelog.cover_image_url);

  // Apply translations based on current locale (same pattern as FloatingCard)
  const translatedContent = useMemo(() => {
    const originalLanguage = vibelog.original_language || 'en';

    // If locale matches original language, return original content
    if (locale === originalLanguage) {
      return {
        title: vibelog.title,
        teaser: vibelog.teaser,
        content: vibelog.content,
      };
    }

    // Try to get translation for current locale
    const translation = vibelog.translations?.[locale];
    if (translation) {
      return {
        title: translation.title || vibelog.title,
        teaser: translation.teaser || vibelog.teaser,
        content: translation.content || vibelog.content,
      };
    }

    // Fallback to original content
    return {
      title: vibelog.title,
      teaser: vibelog.teaser,
      content: vibelog.content,
    };
  }, [vibelog, locale]);

  // Defer date formatting to client side to avoid hydration mismatch
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
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

    setFormattedDate(formatDate(vibelog.published_at));
  }, [vibelog.published_at]);

  // Use AI-generated teaser (already optimized for engagement with proper tone)
  // If no teaser exists, fallback to truncated content
  // Use translated content based on locale
  let displayContent: string;

  if (translatedContent.teaser) {
    // Use the full AI-generated teaser as-is (already crafted as a hook with correct tone)
    displayContent = translatedContent.teaser.trim();
  } else {
    // Fallback: create a preview from content (remove title, truncate to 200 chars)
    const contentWithoutTitle = translatedContent.content
      .split('\n')
      .filter(line => !line.startsWith('# ')) // Remove H1 titles
      .join('\n')
      .trim();
    displayContent =
      contentWithoutTitle.length > 200
        ? contentWithoutTitle.substring(0, 200) + '...'
        : contentWithoutTitle;
  }

  const isTeaser = true; // Always show as teaser in card view

  const stripLeadingHeadings = (text: string) => {
    let cleaned = text;
    while (/^\s*#{1,6}\s+/.test(cleaned)) {
      cleaned = cleaned.replace(/^\s*#{1,6}\s+.*(\r?\n)?/, '');
    }
    return cleaned.trimStart();
  };

  const clampTeaser = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text.trim();
    }
    const truncated = text.slice(0, maxLength).trimEnd();
    return `${truncated}...`;
  };

  displayContent = clampTeaser(stripLeadingHeadings(displayContent), 600);

  const handleReadMore = () => {
    // Anonymous vibelogs use /@anonymous/{public_slug} route
    // Authenticated user vibelogs use /@{username}/{slug} route
    const isAnonymous = vibelog.author.username === 'anonymous' || !vibelog.user_id;

    let vibelogPath: string;
    if (isAnonymous && vibelog.public_slug) {
      vibelogPath = `/@anonymous/${vibelog.public_slug}`;
    } else if (vibelog.slug) {
      vibelogPath = `/@${vibelog.author.username}/${vibelog.slug}`;
    } else {
      // Fallback to old UUID route
      vibelogPath = `/vibelogs/${vibelog.id}`;
    }

    router.push(vibelogPath);
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

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

  const handleDelete = async () => {
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
        throw new Error(errorData.error || `Failed to delete (${response.status})`);
      }

      toast.success(t('toasts.vibelogs.deleted'));

      // Call parent callback to update list
      if (onDeleteSuccess) {
        onDeleteSuccess(vibelog.id);
      } else {
        // Fallback: redirect to dashboard if no callback provided
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : t('toasts.vibelogs.deleteFailed'));
    }
  };

  const handleShare = async () => {
    // Avoid window.location during SSR - build URL client-side only
    if (typeof window === 'undefined') {
      return;
    }

    const isAnonymous = vibelog.author.username === 'anonymous' || !vibelog.user_id;

    let path: string;
    if (isAnonymous && vibelog.public_slug) {
      path = `/@anonymous/${vibelog.public_slug}`;
    } else if (vibelog.slug) {
      path = `/@${vibelog.author.username}/${vibelog.slug}`;
    } else {
      path = `/vibelogs/${vibelog.id}`;
    }

    const url = `${window.location.origin}${path}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: vibelog.title, url });
    } else if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <article
      className={`group relative rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6 transition-all duration-300 hover:border-electric/30 hover:shadow-lg hover:shadow-electric/5 ${
        isLoggedIn
          ? 'cursor-pointer touch-manipulation active:scale-[0.98] active:border-electric/40'
          : ''
      }`}
      onClick={isLoggedIn ? handleReadMore : undefined}
    >
      {/* Video (if available) */}
      {videoUrl && (
        <div className="mb-4">
          <VideoPlayer videoUrl={videoUrl} poster={safeCoverUrl || undefined} />
        </div>
      )}

      {/* Cover Image (shown if no video) */}
      {!videoUrl && safeCoverUrl && (
        <div className="relative mb-4 h-48 overflow-hidden rounded-xl">
          <Image
            src={safeCoverUrl}
            alt={vibelog.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          {/* Music badge */}
          {(vibelog.media_type === 'music' || vibelog.media_type === 'music_video') && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Music className="h-3 w-3" />
              <span>{vibelog.media_type === 'music_video' ? 'Video' : 'Music'}</span>
            </div>
          )}
        </div>
      )}

      {/* Author & Meta */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {vibelog.author.avatar_url ? (
            <Image
              src={vibelog.author.avatar_url}
              alt={vibelog.author.display_name}
              width={40}
              height={40}
              className="rounded-full border-2 border-electric/20"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
              <User className="h-5 w-5 text-electric" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{vibelog.author.display_name}</p>
            <p className="text-sm text-muted-foreground">
              @{vibelog.author.username}
              {formattedDate && ` · ${formattedDate}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{vibelog.read_time} min read</span>
        </div>
      </div>

      {/* Title - Use translated title */}
      <h2 className="mb-4 bg-gradient-electric bg-clip-text text-2xl font-bold leading-tight text-transparent">
        {translatedContent.title}
      </h2>

      {/* Content */}
      <div className="mb-6">
        <VibelogContentRenderer
          content={displayContent}
          isTeaser={isTeaser}
          onReadMore={handleReadMore}
          showCTA={!isLoggedIn} // Only show CTA for anonymous users
        />
      </div>

      {/* Reactions - Stop click propagation */}
      <div onClick={e => e.stopPropagation()} className="mb-4">
        <ReactionBar
          type="vibelog"
          id={vibelog.id}
          variant="compact"
          size="sm"
          realtime
          showCounts
          emojiSet={['🔥', '💯', '🎯', '✨', '💜', '🚀']}
        />
      </div>

      {/* Actions - Unified Component - Stop click propagation */}
      <div onClick={e => e.stopPropagation()}>
        <VibelogActions
          vibelogId={vibelog.id}
          content={vibelog.content}
          title={vibelog.title}
          author={vibelog.author.display_name}
          authorId={vibelog.user_id}
          authorUsername={vibelog.author.username}
          audioUrl={vibelog.audio_url || undefined}
          teaserOnly={!isLoggedIn} // Anonymous users get teaser-only mode with 9s audio limit
          createdAt={vibelog.created_at}
          likeCount={vibelog.like_count}
          commentCount={vibelog.comment_count}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRemix={handleRemix}
          onShare={handleShare}
          variant="compact"
        />
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <VibelogEditModalFull
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            router.refresh(); // Refresh to show updated content
          }}
          vibelog={{
            id: vibelog.id,
            title: vibelog.title,
            content: vibelog.content,
            teaser: vibelog.teaser,
            slug: vibelog.slug,
            cover_image_url: vibelog.cover_image_url,
            cover_image_alt: vibelog.title,
          }}
        />
      )}
    </article>
  );
});

export default VibelogCard;
