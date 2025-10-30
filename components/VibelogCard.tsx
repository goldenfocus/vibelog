'use client';

import { Clock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

import VibelogActions from '@/components/VibelogActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';

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

  // Show ONLY first 200 chars of teaser as preview
  // Remove the title from content (it's usually the first line starting with #)
  const teaserText = vibelog.teaser || vibelog.content;
  const contentWithoutTitle = teaserText
    .split('\n')
    .filter(line => !line.startsWith('# ')) // Remove H1 titles
    .join('\n')
    .trim();

  const preview =
    contentWithoutTitle.length > 200
      ? contentWithoutTitle.substring(0, 200) + '...'
      : contentWithoutTitle;
  const displayContent = preview;
  const isTeaser = true; // Always show as teaser in card view

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
    router.push(`/vibelogs/${vibelog.id}/edit`);
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
        <VibelogContentRenderer
          content={displayContent}
          isTeaser={isTeaser}
          onReadMore={handleReadMore}
        />
      </div>

      {/* Actions - Unified Component */}
      <VibelogActions
        vibelogId={vibelog.id}
        content={vibelog.content}
        title={vibelog.title}
        author={vibelog.author.display_name}
        authorId={vibelog.user_id}
        authorUsername={vibelog.author.username}
        audioUrl={vibelog.audio_url || undefined}
        createdAt={vibelog.created_at}
        onEdit={handleEdit}
        onRemix={handleRemix}
        onShare={handleShare}
        variant="compact"
      />
    </article>
  );
}
