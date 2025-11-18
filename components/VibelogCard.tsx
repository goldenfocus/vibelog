'use client';

import { Clock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import VibelogActions from '@/components/VibelogActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import VibelogEditModalFull from '@/components/VibelogEditModalFull';
import { VideoPlayer } from '@/components/video';

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
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  user_id?: string; // Author's user ID for Edit/Remix logic
  author: VibelogAuthor;
}

interface VibelogCardProps {
  vibelog: Vibelog;
  onRemix?: (content: string) => void;
}

export default function VibelogCard({ vibelog, onRemix }: VibelogCardProps) {
  const router = useRouter();
  const { user } = useAuth(); // Check if user is logged in
  const isLoggedIn = !!user;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const videoUrl = vibelog.video_url || null;

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
  let displayContent: string;

  if (vibelog.teaser) {
    // Use the full AI-generated teaser as-is (already crafted as a hook with correct tone)
    displayContent = vibelog.teaser.trim();
  } else {
    // Fallback: create a preview from content (remove title, truncate to 200 chars)
    const contentWithoutTitle = vibelog.content
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
          <VideoPlayer videoUrl={videoUrl} />
        </div>
      )}

      {/* Cover Image (shown if no video) */}
      {!videoUrl && vibelog.cover_image_url && (
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

      {/* Title */}
      <h2 className="mb-4 bg-gradient-electric bg-clip-text text-2xl font-bold leading-tight text-transparent">
        {vibelog.title}
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
          onEdit={handleEdit}
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
}
