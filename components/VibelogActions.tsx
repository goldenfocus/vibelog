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
  MessageCircle,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import ExportButton from '@/components/ExportButton';
import { XIcon } from '@/components/icons/XIcon';
import LikersPopover from '@/components/LikersPopover';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { AudioPreviewLimiter } from '@/lib/audioLimiter';
import type { ExportFormat } from '@/lib/export';
import { useAudioPlayerStore } from '@/state/audio-player-store';

interface VibelogActionsProps {
  vibelogId: string;
  content: string;
  title?: string;
  author?: string;
  authorId?: string; // User ID of vibelog author
  authorUsername?: string;
  vibelogUrl?: string;
  createdAt?: string;
  audioUrl?: string;
  teaserOnly?: boolean; // If true, only show play button and apply preview limiter
  likeCount?: number; // Initial like count
  commentCount?: number; // Initial comment count
  isLiked?: boolean; // Initial liked state
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  onRemix?: () => void;
  onCopy?: () => Promise<void> | void;
  onShare?: () => Promise<void> | void;
  onExport?: (format: ExportFormat) => void;
  onLikeCountChange?: (newCount: number) => void; // Callback when like count changes
  variant?: 'default' | 'compact'; // compact for cards, default for detail pages
  className?: string;
}

export default function VibelogActions({
  vibelogId,
  content,
  title,
  author,
  authorId,
  authorUsername,
  vibelogUrl,
  createdAt,
  audioUrl,
  teaserOnly = false,
  likeCount: initialLikeCount = 0,
  commentCount = 0,
  isLiked: initialIsLiked = false,
  onEdit,
  onDelete,
  onRemix,
  onCopy,
  onShare,
  onExport,
  onLikeCountChange,
  variant = 'default',
  className = '',
}: VibelogActionsProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastLikeRequestRef = useRef<Promise<void> | null>(null);
  const previewLimiterRef = useRef<AudioPreviewLimiter | null>(null);

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
  const isLoading = globalIsLoading;
  const isPlaying = isUsingGlobalPlayer && globalIsPlaying;

  // Determine if this is user's own vibelog
  const isOwnVibelog = user?.id && authorId && user.id === authorId;

  // Check if current user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setUserIsAdmin(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/check`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUserIsAdmin(data.isAdmin === true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setUserIsAdmin(false);
      }
    }

    checkAdmin();
  }, [user]);

  // Sync like count and liked state when props change (e.g., when parent re-fetches data)
  // Parent components already fetch like data via /api/get-vibelogs, so no need to fetch here
  useEffect(() => {
    setLikeCount(initialLikeCount);
    setIsLiked(initialIsLiked);
  }, [initialLikeCount, initialIsLiked, vibelogId]);

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
    return undefined;
  }, [isMenuOpen]);

  // Cleanup preview limiter on unmount
  useEffect(() => {
    return () => {
      if (previewLimiterRef.current) {
        previewLimiterRef.current.cleanup();
        previewLimiterRef.current = null;
      }
    };
  }, []);

  const handlePlayClick = async () => {
    // Only use creator's original audio - NO TTS!
    if (!audioUrl) {
      toast.error(t('toasts.vibelogs.noAudio'));
      return;
    }

    // Use global audio player for original audio
    const current = useAudioPlayerStore.getState();
    if (current.currentTrack?.id === `vibelog-${vibelogId}`) {
      // This track is already set, just toggle play/pause
      if (globalIsPlaying) {
        globalPause();
        // Clean up limiter if pausing
        if (previewLimiterRef.current) {
          previewLimiterRef.current.cleanup();
          previewLimiterRef.current = null;
        }
      } else {
        try {
          await globalPlay();
          // Start preview limiter for anonymous users in teaser mode
          if (!user && teaserOnly && previewLimiterRef.current === null) {
            previewLimiterRef.current = new AudioPreviewLimiter({
              trackId: `vibelog-${vibelogId}`,
              creatorDisplayName: author,
              creatorUsername: authorUsername,
              onLimitReached: () => {
                console.log('[Preview] 9-second limit reached');
              },
              onSignInPrompt: () => {
                console.log('[Preview] Sign-in prompt triggered');
              },
            });
            previewLimiterRef.current.start();
          }
        } catch (error) {
          console.error('Audio playback failed:', error);
        }
      }
      return;
    }

    // Validate audio URL exists
    if (!audioUrl || audioUrl.trim() === '') {
      console.error('[VibelogActions] No audio URL available', { vibelogId, audioUrl });
      toast.error(t('toasts.vibelogs.audioNotAvailable'));
      return;
    }

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

      // Start preview limiter for anonymous users in teaser mode
      if (!user && teaserOnly) {
        if (previewLimiterRef.current) {
          previewLimiterRef.current.cleanup();
        }
        previewLimiterRef.current = new AudioPreviewLimiter({
          trackId: `vibelog-${vibelogId}`,
          creatorDisplayName: author,
          creatorUsername: authorUsername,
          onLimitReached: () => {
            console.log('[Preview] 9-second limit reached');
          },
          onSignInPrompt: () => {
            console.log('[Preview] Sign-in prompt triggered');
          },
        });
        previewLimiterRef.current.start();
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
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

  const handleTwitterShareClick = async () => {
    try {
      setIsGeneratingShareUrl(true);

      // Generate Twitter share URL from API
      const response = await fetch('/api/publish/twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId,
          format: 'teaser', // Use teaser format by default
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('toasts.vibelogs.shareLinkFailed'));
        return;
      }

      const { shareUrl } = await response.json();

      // Open Twitter Web Intent in new tab
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Twitter share error:', error);
      toast.error(t('toasts.vibelogs.shareXFailed'));
    } finally {
      setIsGeneratingShareUrl(false);
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
      toast.error(t('toasts.vibelogs.signInToLike'));
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
            toast.error(t('toasts.vibelogs.signInToLike'));
          } else if (response.status === 404) {
            toast.error(t('toasts.vibelogs.notFound'));
          } else {
            toast.error(data.error || t('toasts.vibelogs.likeFailed'));
          }
          return;
        }

        // Update with server response (source of truth)
        const finalLikeCount = data.like_count ?? newLikeCount;
        setIsLiked(data.liked ?? newLikedState);
        setLikeCount(finalLikeCount);

        // Notify parent of like count change
        onLikeCountChange?.(finalLikeCount);

        // Log success for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log('Like updated successfully:', {
            vibelogId,
            liked: data.liked,
            likeCount: finalLikeCount,
          });
        }

        // Show subtle feedback only on errors (no toast spam on success)
        // Instagram/Twitter style - just the animation is feedback enough
      } catch (error) {
        console.error('Error toggling like:', error);
        // Revert on error using original values
        setIsLiked(originalLikedState);
        setLikeCount(originalLikeCount);
        toast.error(t('toasts.vibelogs.networkError'));
      } finally {
        setIsLiking(false);
        lastLikeRequestRef.current = null;
      }
    })();

    lastLikeRequestRef.current = likeRequest;
    await likeRequest;
  }, [user, isLiking, isLiked, likeCount, vibelogId, onLikeCountChange]);

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

  // Ensure UI never shows "0" when the user has liked the vibelog by guaranteeing a minimum of 1
  // while still letting the actual state value track the server response. This prevents moments
  // where the icon shows a liked state but the count renders 0 due to stale data.
  const displayLikeCount = isLiked ? Math.max(1, likeCount) : Math.max(0, likeCount);

  const likeIconClass =
    isLiked && !isCompact
      ? `${iconClass} !text-red-500 group-hover:!text-red-600 active:!text-red-700`
      : iconClass;

  const likeLabelClass =
    isLiked && !isCompact
      ? `${labelClass} !text-red-500 group-hover:!text-red-600 active:!text-red-700`
      : labelClass;

  const wrapperClass = isCompact
    ? 'flex flex-wrap items-center gap-3 border-t border-border/30 pt-4'
    : 'flex justify-center gap-3 sm:gap-4';

  return (
    <>
      <div className={`${wrapperClass} ${className}`} data-testid="vibelog-actions">
        {/* If teaserOnly mode, only show the play button if audio exists */}
        {teaserOnly ? (
          audioUrl && audioUrl.trim() !== '' ? (
            <button
              onClick={handlePlayClick}
              disabled={isLoading}
              className={`${baseButtonClass} relative ${isCompact ? '' : 'overflow-hidden'}`}
              title={isPlaying ? 'Pause' : 'Listen'}
              data-testid="listen-button"
            >
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
          ) : null
        ) : (
          <>
            {/* Owner Menu Dropdown (Edit/Delete) - Show for owners or admins */}
            {(isOwnVibelog || userIsAdmin) && onEdit && onDelete && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={baseButtonClass}
                  title={t('titles.moreOptions')}
                  data-testid="owner-menu-button"
                >
                  <MoreVertical className={iconClass} />
                  {!isCompact && <span className={labelClass}>{t('actions.manage')}</span>}
                </button>

                {isMenuOpen && (
                  <div className="absolute left-0 top-full z-[60] mt-2 w-40 rounded-lg border border-border/50 bg-card/95 shadow-xl backdrop-blur-sm">
                    <div className="p-1">
                      <button
                        onClick={handleEditClick}
                        className="flex w-full touch-manipulation items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                        data-testid="menu-edit-button"
                      >
                        <Edit className="h-4 w-4" />
                        <span>{t('actions.edit')}</span>
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="flex w-full touch-manipulation items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
                        data-testid="menu-delete-button"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t('actions.delete')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Edit or Remix Button (for non-owners or when delete not available) */}
            {(onEdit || onRemix) && !((isOwnVibelog || userIsAdmin) && onEdit && onDelete) && (
              <button
                onClick={handleEditOrRemix}
                className={
                  isOwnVibelog
                    ? baseButtonClass
                    : `${baseButtonClass} ml-auto flex touch-manipulation items-center gap-2 rounded-lg bg-electric/10 px-4 py-2 font-medium text-electric transition-all duration-200 hover:bg-electric hover:text-white active:scale-95 active:bg-electric/80`
                }
                title={isOwnVibelog ? t('titles.edit') : t('titles.remix')}
                data-testid={isOwnVibelog ? 'edit-button' : 'remix-button'}
              >
                {isOwnVibelog ? (
                  <>
                    <Edit className={iconClass} />
                    {isCompact && <span className={labelClass}>{t('actions.edit')}</span>}
                    {!isCompact && <span className={labelClass}>{t('actions.edit')}</span>}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{t('components.vibelogCard.remix')}</span>
                  </>
                )}
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopyClick}
              className={baseButtonClass}
              title={copySuccess ? t('titles.copied') : t('titles.copy')}
              data-testid="copy-button"
            >
              <Copy className={iconClass} />
              <span className={labelClass}>
                {copySuccess ? t('titles.copied') : t('titles.copy')}
              </span>
            </button>

            {/* Listen Button with original audio or TTS - only show if audio exists */}
            {audioUrl && audioUrl.trim() !== '' && (
              <button
                onClick={handlePlayClick}
                disabled={isLoading}
                className={`${baseButtonClass} relative ${isCompact ? '' : 'overflow-hidden'}`}
                title={isPlaying ? t('titles.pause') : t('titles.listen')}
                data-testid="listen-button"
              >
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
                  {isLoading
                    ? t('actions.generating')
                    : isPlaying
                      ? t('actions.pause')
                      : t('actions.listen')}
                </span>
              </button>
            )}

            {/* Like Button */}
            <LikersPopover
              vibelogId={vibelogId}
              likeCount={displayLikeCount}
              onCountUpdate={handleCountUpdate}
            >
              <button
                onClick={handleLikeClick}
                disabled={isLiking}
                className={`${baseButtonClass} ${isLiked ? 'text-red-500 hover:text-red-600 active:text-red-700' : ''}`}
                title={
                  user
                    ? isLiked
                      ? t('titles.unlike')
                      : t('titles.like')
                    : t('titles.signInToLike')
                }
                data-testid="like-button"
              >
                {isLiking ? (
                  <Loader2 className={`${iconClass} animate-spin`} />
                ) : (
                  <Heart className={likeIconClass} fill={isLiked ? 'currentColor' : 'none'} />
                )}
                <span className={likeLabelClass}>{isLiking ? '...' : displayLikeCount}</span>
              </button>
            </LikersPopover>

            {/* Comment Count Button */}
            <button
              onClick={() => {
                // Scroll to comments section on the vibelog page
                const commentsSection = document.getElementById('comments');
                if (commentsSection) {
                  commentsSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                  // If we're on a card, navigate to the vibelog page with hash
                  window.location.hash = 'comments';
                }
              }}
              className={baseButtonClass}
              title={t('titles.viewComments')}
              data-testid="comment-button"
            >
              <MessageCircle className={iconClass} />
              <span className={labelClass}>{commentCount}</span>
            </button>

            {/* X/Twitter Share Button */}
            <button
              onClick={handleTwitterShareClick}
              disabled={isGeneratingShareUrl}
              className={baseButtonClass}
              title={t('titles.shareOnX')}
              data-testid="twitter-share-button"
            >
              {isGeneratingShareUrl ? (
                <Loader2 className={`${iconClass} animate-spin`} />
              ) : (
                <XIcon className={iconClass} />
              )}
              {!isCompact && <span className={labelClass}>{t('actions.shareOnX')}</span>}
            </button>

            {/* Generic Share Button */}
            {onShare && (
              <button
                onClick={handleShareClick}
                className={baseButtonClass}
                title={t('titles.share')}
                data-testid="share-button"
              >
                <Share2 className={iconClass} />
                <span className={labelClass}>{t('actions.share')}</span>
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
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {t('confirmations.deleteVibelog').split('?')[0]}?
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">{t('confirmations.deleteVibelog')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="touch-manipulation rounded-lg border border-border/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                data-testid="delete-cancel-button"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="touch-manipulation rounded-lg bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 active:bg-destructive/80"
                data-testid="delete-confirm-button"
                aria-label={t('ariaLabels.deleteVibelog')}
              >
                {t('buttons.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
