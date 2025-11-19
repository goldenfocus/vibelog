'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ContentTabs } from '@/components/content/ContentTabs';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import VibelogActions from '@/components/VibelogActions';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import VibelogEditModalFull from '@/components/VibelogEditModalFull';
import type { ExportFormat } from '@/lib/export';

interface PublicVibelogContentProps {
  vibelog: {
    id: string;
    title: string;
    content: string;
    teaser?: string;
    slug: string;
    cover_image_url?: string | null;
    user_id: string | null;
    public_slug: string;
    audio_url?: string | null;
    ai_audio_url?: string | null;
    video_url?: string | null;
    created_at?: string;
    read_time?: number;
    like_count?: number;
    share_count?: number;
    author?: {
      username: string;
      display_name: string;
    };
  };
}

export default function PublicVibelogContent({ vibelog }: PublicVibelogContentProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const videoUrl = vibelog.video_url || null;

  // Initialize with a placeholder URL to prevent hydration mismatch
  // Will be updated in useEffect with actual window.location.origin
  const [vibelogUrl, setVibelogUrl] = useState<string>(() => {
    const isAnonymous = !vibelog.user_id;
    return isAnonymous
      ? `/@anonymous/${vibelog.public_slug}`
      : `/@${vibelog.author?.username}/${vibelog.public_slug}`;
  });

  // Set full vibelog URL after mount to avoid hydration mismatch
  useEffect(() => {
    const isAnonymous = !vibelog.user_id;
    const url = isAnonymous
      ? `${window.location.origin}/@anonymous/${vibelog.public_slug}`
      : `${window.location.origin}/@${vibelog.author?.username}/${vibelog.public_slug}`;
    setVibelogUrl(url);
  }, [vibelog.user_id, vibelog.public_slug, vibelog.author?.username]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/delete-vibelog/${vibelog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete vibelog');
      }

      toast.success('Vibelog deleted successfully');
      // Redirect to dashboard after deletion
      router.push('/dashboard');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete vibelog');
    }
  };

  const handleRemix = () => {
    // Redirect to homepage with remix content
    const remixUrl = `/?remix=${encodeURIComponent(vibelog.content)}`;
    router.push(remixUrl);
  };

  const handleShare = async () => {
    // Only access window.location in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Determine the correct share URL based on whether it's anonymous or not
    const isAnonymous = !vibelog.user_id;
    const shareUrl = isAnonymous
      ? `${window.location.origin}/@anonymous/${vibelog.public_slug}`
      : `${window.location.origin}/@${vibelog.author?.username}/${vibelog.public_slug}`;

    const shareData = {
      title: vibelog.title,
      text: `Check out "${vibelog.title}" on VibeLog`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // URL copied to clipboard
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Callback to update like count when VibelogActions changes it
  const handleLikeCountChange = (_newCount: number) => {
    // Like count updates are handled by VibelogActions component
  };

  const handleExport = (format: ExportFormat) => {
    console.log('Export format:', format);
    // Export handled by ExportButton component
  };

  // Remove duplicate title from content if it starts with the same title
  const contentWithoutDuplicateTitle = vibelog.content.replace(
    new RegExp(`^#\\s+${vibelog.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n`, 'i'),
    ''
  );

  return (
    <div>
      {/* Content Tabs - Vibelog vs Original */}
      <ContentTabs
        vibelogId={vibelog.id}
        title={vibelog.title}
        content={contentWithoutDuplicateTitle}
        originalAudioUrl={vibelog.audio_url}
        aiAudioUrl={vibelog.ai_audio_url}
        videoUrl={videoUrl}
        author={vibelog.author?.display_name}
        className="mb-8"
      >
        <VibelogContentRenderer content={contentWithoutDuplicateTitle} showCTA={false} />
      </ContentTabs>

      {/* Reactions */}
      <div className="mt-8 flex justify-center">
        <ReactionBar
          type="vibelog"
          id={vibelog.id}
          variant="expanded"
          realtime
          showCounts
          emojiSet={['🔥', '💯', '🎯', '✨', '💜', '🚀', '👍', '❤️', '😂', '🎉', '🤔', '👏']}
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-12 border-t border-border/40 pt-8">
        <VibelogActions
          vibelogId={vibelog.id}
          content={vibelog.content}
          title={vibelog.title}
          author={vibelog.author?.display_name}
          authorId={vibelog.user_id || undefined}
          authorUsername={vibelog.author?.username}
          vibelogUrl={vibelogUrl}
          createdAt={vibelog.created_at}
          audioUrl={vibelog.audio_url || undefined}
          likeCount={vibelog.like_count}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRemix={handleRemix}
          onShare={handleShare}
          onExport={handleExport}
          onLikeCountChange={handleLikeCountChange}
          variant="default"
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
    </div>
  );
}
