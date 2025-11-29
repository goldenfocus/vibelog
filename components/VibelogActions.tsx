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
  MessageCircle,
  Link2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import ExportButton from '@/components/ExportButton';
import { XIcon } from '@/components/icons/XIcon';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { QuickReactions } from '@/components/reactions';
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
  onShare: _onShare,
  onExport,
  onLikeCountChange,
  variant = 'default',
  className = '',
}: VibelogActionsProps) {
  const { user, isAdmin: userIsAdmin } = useAuth();
  const { t } = useI18n();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
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

  // Sync like count when props change
  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setIsShareOpen(false);
      }
    };

    if (isMenuOpen || isShareOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, isShareOpen]);

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

  const handleCopyLinkClick = async () => {
    try {
      const url = vibelogUrl || window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success(t('toasts.vibelogs.linkCopied') || 'Link copied!');
    } catch (error) {
      console.error('Copy link failed:', error);
      toast.error(t('toasts.vibelogs.copyFailed') || 'Failed to copy link');
    }
    setIsShareOpen(false);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || 'VibeLog',
          url: vibelogUrl || window.location.href,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          console.error('Native share failed:', error);
        }
      }
    }
    setIsShareOpen(false);
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
      setIsShareOpen(false);
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

  // Handle reaction change from QuickReactions
  const handleReactionChange = (_reaction: string | null, newCount: number) => {
    setLikeCount(newCount);
    onLikeCountChange?.(newCount);
  };

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
    ? 'flex flex-wrap items-center gap-2 border-t border-border/30 pt-4'
    : 'flex flex-wrap justify-center gap-3 sm:gap-4';

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
              <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className={baseButtonClass}
                  title={t('titles.moreOptions')}
                  data-testid="owner-menu-button"
                >
                  <MoreVertical className={iconClass} />
                  {!isCompact && <span className={labelClass}>{t('actions.manage')}</span>}
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute left-0 top-full z-[60] mt-2 w-40 rounded-lg border border-border/50 bg-card/95 shadow-xl backdrop-blur-sm"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleEditClick();
                        }}
                        className="flex w-full touch-manipulation items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                        data-testid="menu-edit-button"
                      >
                        <Edit className="h-4 w-4" />
                        <span>{t('actions.edit')}</span>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteClick();
                        }}
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

            {/* Copy Button - hidden on mobile in compact mode */}
            <button
              onClick={handleCopyClick}
              className={`${baseButtonClass} ${isCompact ? 'hidden sm:flex' : ''}`}
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

            {/* Like/Reaction Button */}
            <QuickReactions
              contentType="vibelog"
              contentId={vibelogId}
              initialCount={likeCount}
              initialReaction={initialIsLiked ? '❤️' : null}
              onReactionChange={handleReactionChange}
              size={isCompact ? 'sm' : 'md'}
              showCount={true}
            />

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

            {/* Consolidated Share Dropdown */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={() => setIsShareOpen(!isShareOpen)}
                disabled={isGeneratingShareUrl}
                className={baseButtonClass}
                title={t('titles.share')}
                data-testid="share-button"
                aria-expanded={isShareOpen}
                aria-haspopup="true"
              >
                {isGeneratingShareUrl ? (
                  <Loader2 className={`${iconClass} animate-spin`} />
                ) : (
                  <Share2 className={iconClass} />
                )}
                {!isCompact && (
                  <span className={`${labelClass} flex items-center gap-1`}>
                    {t('actions.share')}
                    <ChevronDown className="h-3 w-3" />
                  </span>
                )}
              </button>

              {isShareOpen && (
                <div
                  className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-sm"
                  data-testid="share-dropdown"
                >
                  <div className="p-2">
                    {/* Share on X */}
                    <button
                      onClick={handleTwitterShareClick}
                      disabled={isGeneratingShareUrl}
                      className="flex w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70 disabled:opacity-50"
                      data-testid="share-twitter"
                    >
                      <XIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{t('actions.shareOnX')}</span>
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={handleCopyLinkClick}
                      className="flex w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                      data-testid="share-copy-link"
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span>{t('actions.copyLink') || 'Copy Link'}</span>
                    </button>

                    {/* Native Share (if available) */}
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        onClick={handleNativeShare}
                        className="flex w-full touch-manipulation items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70"
                        data-testid="share-native"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span>{t('actions.moreOptions') || 'More...'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

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

            {/* Export Button in compact mode - hidden on mobile */}
            {isCompact && (
              <div className="hidden sm:block">
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
              </div>
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
