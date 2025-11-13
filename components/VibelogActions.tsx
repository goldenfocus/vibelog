'use client';

import {
  Copy,
  Share2,
  Edit,
  Sparkles,
  Play,
  Pause,
  Loader2,
  MoreVertical,
  Trash2,
  Heart,
  Mic2,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import ExportButton from '@/components/ExportButton';
import LikersPopover from '@/components/LikersPopover';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  createTextToSpeechCacheKey,
  normalizeTextToSpeechInput,
  useTextToSpeech,
} from '@/hooks/useTextToSpeech';
import type { ExportFormat } from '@/lib/export';
import { useAudioPlayerStore } from '@/state/audio-player-store';

interface VibelogActionsProps {
  vibelogId: string;
  content: string;
  title?: string;
  author?: string;
  authorId?: string; // User ID of vibelog author
  authorUsername?: string;
  authorVoiceCloneId?: string; // Author's current voice clone ID (for preferring TTS over old audio)
  vibelogUrl?: string;
  createdAt?: string;
  audioUrl?: string;
  teaser?: string; // Teaser text for preview mode
  teaserOnly?: boolean; // If true, only show play button and use teaser text
  likeCount?: number; // Initial like count
  isLiked?: boolean; // Initial liked state
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  onRemix?: () => void;
  onCopy?: () => Promise<void> | void;
  onShare?: () => Promise<void> | void;
  onExport?: (format: ExportFormat) => void;
  onUpgradePrompt?: (message: string, benefits: string[]) => void;
  variant?: 'default' | 'compact'; // compact for cards, default for detail pages
  className?: string;
  forceTTS?: boolean;
}

export default function VibelogActions({
  vibelogId,
  content,
  title,
  author,
  authorId,
  authorUsername,
  authorVoiceCloneId,
  vibelogUrl,
  createdAt,
  audioUrl,
  teaser,
  teaserOnly = false,
  likeCount: initialLikeCount = 0,
  isLiked: initialIsLiked = false,
  onEdit,
  onDelete,
  onRemix,
  onCopy,
  onShare,
  onExport,
  onUpgradePrompt,
  variant = 'default',
  className = '',
  forceTTS = false,
}: VibelogActionsProps) {
  const { user } = useAuth();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastLikeRequestRef = useRef<Promise<void> | null>(null);
  const {
    isPlaying: isTTSPlaying,
    isLoading: isTTSLoading,
    playText,
    stop,
    progress,
  } = useTextToSpeech(onUpgradePrompt);

  // Global audio player store
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    isLoading: globalIsLoading,
    play: globalPlay,
    pause: globalPause,
    setTrack,
  } = useAudioPlayerStore();

  // Check if this vibelog's audio is currently playing in global player
  const isUsingGlobalPlayer = currentTrack?.id === `vibelog-${vibelogId}`;
  const isLoading = isUsingGlobalPlayer ? globalIsLoading : isTTSLoading;
  const isPlaying = isUsingGlobalPlayer ? globalIsPlaying : isTTSPlaying;

  // Determine if this is user's own vibelog
  const isOwnVibelog = user?.id && authorId && user.id === authorId;

  // Sync like count and liked state when props change (e.g., when parent re-fetches data)
  useEffect(() => {
    setLikeCount(initialLikeCount);
    setIsLiked(initialIsLiked);
  }, [initialLikeCount, initialIsLiked, vibelogId]);

  // Fetch current like status and count from API in a single coordinated request
  useEffect(() => {
    if (vibelogId) {
      let mounted = true;

      // Single API call that returns both isLiked and like_count
      fetch(`/api/like-vibelog/${vibelogId}`, { method: 'GET' })
        .then(res => {
          if (!mounted) {
            return null;
          }
          if (res.ok) {
            return res.json();
          }
          return null;
        })
        .then(data => {
          if (!mounted || !data) {
            return;
          }

          // Update both state values atomically from single response
          if (data.isLiked !== undefined) {
            setIsLiked(data.isLiked);
          }
          if (data.like_count !== undefined) {
            setLikeCount(data.like_count);
          }
        })
        .catch(err => {
          // Silent fail - use prop values as fallback
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Failed to fetch like status:', err);
          }
        });

      return () => {
        mounted = false;
      };
    }
  }, [vibelogId, user?.id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handlePlayClick = async () => {
    // VOICE CLONING FIX: If author has a cloned voice, always use TTS instead of old audio_url
    // This ensures we use the latest cloned voice rather than outdated pre-generated audio
    const shouldUseTTS = forceTTS || authorVoiceCloneId || teaserOnly || !audioUrl;

    // If original audio is available AND author has no cloned voice, use global player
    // Note: In teaserOnly mode, we always use TTS (teaser text)
    if (audioUrl && !shouldUseTTS) {
      // Use global audio player for pre-generated audio
      const current = useAudioPlayerStore.getState();
      if (current.currentTrack?.id === `vibelog-${vibelogId}`) {
        // This track is already set, just toggle play/pause
        if (globalIsPlaying) {
          globalPause();
        } else {
          try {
            await globalPlay();
          } catch (error) {
            console.error('Audio playback failed:', error);
          }
        }
        return;
      } else {
        // Set track and play
        setTrack({
          id: `vibelog-${vibelogId}`,
          url: audioUrl,
          title: title || 'Vibelog Audio',
          author: author,
          type: 'url',
        });
        try {
          // Small delay to ensure track is set
          await new Promise(resolve => setTimeout(resolve, 100));
          await globalPlay();
        } catch (error) {
          console.error('Audio playback failed:', error);
        }
        return;
      }
    }

    // Fall back to TTS if no original audio
    if (isTTSPlaying) {
      stop();
      return;
    }

    // Use teaser text if in teaserOnly mode, otherwise use full content
    const useTeaserText = teaserOnly && teaser;
    const textToPlay = useTeaserText ? teaser : content;

    let cleanContent = normalizeTextToSpeechInput(textToPlay);

    // Truncate in teaser/compact contexts to keep TTS generation under 20 seconds
    const shouldLimitLength = teaserOnly || variant === 'compact';
    if (shouldLimitLength) {
      const words = cleanContent.split(/\s+/);
      if (words.length > 500) {
        cleanContent = words.slice(0, 500).join(' ') + '...';
      }
    }

    // Pass authorVoiceCloneId directly so TTS route can use the cloned voice
    // This ensures we use the author's current voice clone without database lookup
    // Pass title and author so they display correctly in the audio player
    const cacheKey = createTextToSpeechCacheKey({
      text: cleanContent,
      voice: 'shimmer',
      vibelogId,
      voiceCloneId: authorVoiceCloneId,
      authorId,
    });

    console.log('🎵 [TTS-BUTTON] Calling playText with:', {
      vibelogId,
      authorVoiceCloneId,
      hasVoiceCloneId: !!authorVoiceCloneId,
      title,
      author,
      textLength: cleanContent.length,
    });
    // Pass authorId so TTS route can check author's profile for voice_clone_id
    // even if authorVoiceCloneId is undefined (e.g., when voice cloning failed)
    await playText({
      text: cleanContent,
      voice: 'shimmer',
      vibelogId,
      voiceCloneId: authorVoiceCloneId,
      title,
      author,
      authorId,
      cacheKey,
    });
  };

  const handleCopyClick = async () => {
    try {
      if (onCopy) {
        await onCopy();
      } else {
        await navigator.clipboard.writeText(content);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  const handleShareClick = async () => {
    if (onShare) {
      await onShare();
    }
  };

  const handleEditOrRemix = () => {
    if (isOwnVibelog && onEdit) {
      onEdit();
    } else if (onRemix) {
      onRemix();
    }
  };

  const handleEditClick = () => {
    setIsMenuOpen(false);
    if (onEdit) {
      onEdit();
    }
  };

  const handleDeleteClick = () => {
    setIsMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    if (onDelete) {
      await onDelete();
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleVoiceManageClick = () => {
    if (typeof window !== 'undefined') {
      window.open('/settings/profile#voice', '_blank', 'noopener,noreferrer');
    }
  };

  // Callback to update like count when LikersPopover fetches fresh data
  const handleCountUpdate = useCallback(
    (newCount: number) => {
      console.log('Updating like count from likers popover:', { oldCount: likeCount, newCount });
      setLikeCount(newCount);
    },
    [likeCount]
  );

  const handleLikeClick = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to like vibelogs');
      setTimeout(() => {
        window.location.href = '/auth/signin';
      }, 1000);
      return;
    }

    // Prevent rapid clicking - wait for previous request to complete
    if (isLiking || lastLikeRequestRef.current) {
      return;
    }

    // Store original values for rollback if needed
    const originalLikedState = isLiked;
    const originalLikeCount = likeCount;

    // Optimistic update - update UI immediately
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? likeCount + 1 : Math.max(0, likeCount - 1);

    setIsLiked(newLikedState);
    setLikeCount(newLikeCount);
    setIsLiking(true);

    // Create and track the request promise
    const likeRequest = (async () => {
      try {
        const method = newLikedState ? 'POST' : 'DELETE';
        const response = await fetch(`/api/like-vibelog/${vibelogId}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          // Revert optimistic update on error
          setIsLiked(originalLikedState);
          setLikeCount(originalLikeCount);

          // Log detailed error for debugging
          console.error('Like request failed:', {
            status: response.status,
            statusText: response.statusText,
            data,
            vibelogId,
            method,
          });

          // Show user-friendly error message
          if (response.status === 401) {
            toast.error('Please sign in to like vibelogs');
          } else if (response.status === 404) {
            toast.error('Vibelog not found');
          } else {
            toast.error(data.error || 'Failed to update like');
          }
          return;
        }

        // Update with server response (source of truth)
        setIsLiked(data.liked ?? newLikedState);
        setLikeCount(data.like_count ?? newLikeCount);

        // Log success for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log('Like updated successfully:', {
            vibelogId,
            liked: data.liked,
            likeCount: data.like_count,
          });
        }

        // Show subtle feedback only on errors (no toast spam on success)
        // Instagram/Twitter style - just the animation is feedback enough
      } catch (error) {
        console.error('Error toggling like:', error);
        // Revert on error using original values
        setIsLiked(originalLikedState);
        setLikeCount(originalLikeCount);
        toast.error('Network error. Please try again.');
      } finally {
        setIsLiking(false);
        lastLikeRequestRef.current = null;
      }
    })();

    lastLikeRequestRef.current = likeRequest;
    await likeRequest;
  }, [user, isLiking, isLiked, likeCount, vibelogId]);

  const isCompact = variant === 'compact';
  const baseButtonClass = isCompact
    ? 'flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm transition-all hover:border-electric/30 hover:bg-electric/5 active:scale-95 active:bg-electric/10 touch-manipulation'
    : 'group flex min-w-[80px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-4 transition-all duration-200 hover:scale-105 hover:bg-muted/30 active:scale-95 active:bg-muted/40 sm:min-w-[90px] sm:p-4 touch-manipulation';

  const iconClass = isCompact
    ? 'h-4 w-4'
    : 'h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6';

  const labelClass = isCompact
    ? 'hidden sm:inline'
    : 'text-xs font-medium text-muted-foreground group-hover:text-foreground';

  const wrapperClass = isCompact
    ? 'flex flex-wrap items-center gap-3 border-t border-border/30 pt-4'
    : 'flex justify-center gap-3 sm:gap-4';
  const voiceReady = Boolean(authorVoiceCloneId);

  return (
    <>
      <div className={`${wrapperClass} ${className}`} data-testid="vibelog-actions">
        {/* If teaserOnly mode, only show the play button */}
        {teaserOnly ? (
          <button
            onClick={handlePlayClick}
            disabled={isLoading}
            className={`${baseButtonClass} relative ${isCompact ? '' : 'overflow-hidden'}`}
            title={isPlaying ? 'Pause' : 'Listen'}
            data-testid="listen-button"
          >
            {!isCompact && isPlaying && (
              <div
                className="absolute bottom-0 left-0 h-1 bg-electric transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            )}

            <div className="relative flex items-center justify-center">
              {isLoading ? (
                <Loader2 className={`${iconClass} animate-spin`} />
              ) : isPlaying ? (
                <Pause className={iconClass} />
              ) : (
                <Play className={iconClass} />
              )}
            </div>

            <span className={labelClass}>
              {isLoading ? 'Generating...' : isPlaying ? 'Pause' : 'Listen'}
            </span>
          </button>
        ) : (
          <>
            {/* Owner Menu Dropdown (Edit/Delete) */}
            {isOwnVibelog && onEdit && onDelete && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={baseButtonClass}
                  title="More options"
                  data-testid="owner-menu-button"
                >
                  <MoreVertical className={iconClass} />
                  {!isCompact && <span className={labelClass}>Manage</span>}
                </button>

                {isMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-40 rounded-lg border border-border/50 bg-card/95 shadow-xl backdrop-blur-sm">
                    <div className="p-1">
                      <button
                        onClick={handleEditClick}
                        className="flex w-full touch-manipulation items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                        data-testid="menu-edit-button"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="flex w-full touch-manipulation items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
                        data-testid="menu-delete-button"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Edit or Remix Button (for non-owners or when delete not available) */}
            {(onEdit || onRemix) && !(isOwnVibelog && onEdit && onDelete) && (
              <button
                onClick={handleEditOrRemix}
                className={
                  isOwnVibelog
                    ? baseButtonClass
                    : `${baseButtonClass} ml-auto flex touch-manipulation items-center gap-2 rounded-lg bg-electric/10 px-4 py-2 font-medium text-electric transition-all duration-200 hover:bg-electric hover:text-white active:scale-95 active:bg-electric/80`
                }
                title={isOwnVibelog ? 'Edit' : 'Remix'}
                data-testid={isOwnVibelog ? 'edit-button' : 'remix-button'}
              >
                {isOwnVibelog ? (
                  <>
                    <Edit className={iconClass} />
                    {isCompact && <span className={labelClass}>Edit</span>}
                    {!isCompact && <span className={labelClass}>Edit</span>}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Remix</span>
                  </>
                )}
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopyClick}
              className={baseButtonClass}
              title={copySuccess ? 'Copied!' : 'Copy'}
              data-testid="copy-button"
            >
              <Copy className={iconClass} />
              <span className={labelClass}>{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>

            {isOwnVibelog && (
              <button
                onClick={handleVoiceManageClick}
                className={baseButtonClass}
                title={voiceReady ? 'Voice ready' : 'Clone your voice'}
                data-testid="voice-clone-button"
              >
                {voiceReady ? (
                  <Sparkles className={`${iconClass} text-electric`} />
                ) : (
                  <Mic2 className={iconClass} />
                )}
                <span className={labelClass}>{voiceReady ? 'Voice Ready' : 'Clone Voice'}</span>
              </button>
            )}

            {/* Listen Button with original audio or TTS */}
            <button
              onClick={handlePlayClick}
              disabled={isLoading}
              className={`${baseButtonClass} relative ${isCompact ? '' : 'overflow-hidden'}`}
              title={isPlaying ? 'Pause' : 'Listen'}
              data-testid="listen-button"
            >
              {!isCompact && isPlaying && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-electric transition-all duration-100 ease-out"
                  style={{ width: `${isUsingGlobalPlayer ? 0 : progress}%` }}
                />
              )}

              <div className="relative flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className={`${iconClass} animate-spin`} />
                ) : isPlaying ? (
                  <Pause className={iconClass} />
                ) : (
                  <Play className={iconClass} />
                )}
              </div>

              <span className={labelClass}>
                {isLoading ? 'Generating...' : isPlaying ? 'Pause' : 'Listen'}
              </span>
            </button>

            {/* Like Button */}
            <LikersPopover
              vibelogId={vibelogId}
              likeCount={likeCount}
              onCountUpdate={handleCountUpdate}
            >
              <button
                onClick={handleLikeClick}
                disabled={isLiking}
                className={`${baseButtonClass} ${isLiked ? 'text-red-500 hover:text-red-600 active:text-red-700' : ''}`}
                title={user ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
                data-testid="like-button"
              >
                {isLiking ? (
                  <Loader2 className={`${iconClass} animate-spin`} />
                ) : (
                  <Heart className={iconClass} fill={isLiked ? 'currentColor' : 'none'} />
                )}
                <span className={labelClass}>{isLiking ? '...' : likeCount}</span>
              </button>
            </LikersPopover>

            {/* Share Button */}
            {onShare && (
              <button
                onClick={handleShareClick}
                className={baseButtonClass}
                title="Share"
                data-testid="share-button"
              >
                <Share2 className={iconClass} />
                <span className={labelClass}>Share</span>
              </button>
            )}

            {/* Export Button */}
            {!isCompact && (
              <ExportButton
                content={content}
                title={title}
                author={author}
                authorUsername={authorUsername}
                vibelogUrl={vibelogUrl}
                createdAt={createdAt}
                audioUrl={audioUrl}
                onExport={onExport}
              />
            )}

            {isCompact && (
              <ExportButton
                content={content}
                title={title}
                author={author}
                authorUsername={authorUsername}
                vibelogUrl={vibelogUrl}
                createdAt={createdAt}
                audioUrl={audioUrl}
                onExport={onExport}
                variant="compact"
              />
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          data-testid="delete-confirm-dialog"
        >
          <div className="w-full max-w-md rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Delete VibeLog?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to delete this VibeLog? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="touch-manipulation rounded-lg border border-border/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                data-testid="delete-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="touch-manipulation rounded-lg bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 active:bg-destructive/80"
                data-testid="delete-confirm-button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
