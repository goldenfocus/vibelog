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
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import ExportButton from '@/components/ExportButton';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import type { ExportFormat } from '@/lib/export';

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
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  onRemix?: () => void;
  onCopy?: () => Promise<void> | void;
  onShare?: () => Promise<void> | void;
  onExport?: (format: ExportFormat) => void;
  onUpgradePrompt?: (message: string, benefits: string[]) => void;
  variant?: 'default' | 'compact'; // compact for cards, default for detail pages
  className?: string;
}

export default function VibelogActions({
  vibelogId: _vibelogId,
  content,
  title,
  author,
  authorId,
  authorUsername,
  vibelogUrl,
  createdAt,
  audioUrl,
  onEdit,
  onDelete,
  onRemix,
  onCopy,
  onShare,
  onExport,
  onUpgradePrompt,
  variant = 'default',
  className = '',
}: VibelogActionsProps) {
  const { user } = useAuth();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isPlaying, isLoading, playText, stop, progress } = useTextToSpeech(onUpgradePrompt);

  // Audio playback state for original audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Determine if this is user's own vibelog
  const isOwnVibelog = user?.id && authorId && user.id === authorId;

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

  // Set up audio element for original audio playback
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('play', () => setIsAudioPlaying(true));
      audio.addEventListener('pause', () => setIsAudioPlaying(false));
      audio.addEventListener('ended', () => {
        setIsAudioPlaying(false);
        setAudioProgress(0);
      });
      audio.addEventListener('timeupdate', () => {
        if (audio.duration > 0) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      // Preload audio for instant playback
      audio.preload = 'auto';

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [audioUrl]);

  const handlePlayClick = async () => {
    // If original audio is available, use it instead of TTS
    if (audioUrl && audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Audio playback failed:', error);
        }
      }
      return;
    }

    // Fall back to TTS if no original audio
    if (isPlaying) {
      stop();
      return;
    }

    // Clean markdown for TTS
    let cleanContent = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/`([^`]+)`/g, '$1') // Remove code
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();

    // Truncate to ~500 words to keep TTS generation under 20 seconds
    const words = cleanContent.split(/\s+/);
    if (words.length > 500) {
      cleanContent = words.slice(0, 500).join(' ') + '...';
    }

    await playText(cleanContent, 'shimmer');
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

  const isCompact = variant === 'compact';
  const baseButtonClass = isCompact
    ? 'flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm transition-all hover:border-electric/30 hover:bg-electric/5'
    : 'group flex min-w-[70px] flex-col items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 p-3 transition-all duration-200 hover:scale-105 hover:bg-muted/30 sm:min-w-[80px] sm:p-4';

  const iconClass = isCompact
    ? 'h-4 w-4'
    : 'h-5 w-5 text-foreground transition-colors group-hover:text-electric sm:h-6 sm:w-6';

  const labelClass = isCompact
    ? 'hidden sm:inline'
    : 'text-xs font-medium text-muted-foreground group-hover:text-foreground';

  const wrapperClass = isCompact
    ? 'flex flex-wrap items-center gap-3 border-t border-border/30 pt-4'
    : 'flex justify-center gap-2 sm:gap-3';

  return (
    <>
      <div className={`${wrapperClass} ${className}`} data-testid="vibelog-actions">
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
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                    data-testid="menu-edit-button"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
                : `${baseButtonClass} ml-auto flex items-center gap-2 rounded-lg bg-electric/10 px-4 py-2 font-medium text-electric transition-all duration-200 hover:bg-electric hover:text-white`
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

        {/* Listen Button with original audio or TTS */}
        <button
          onClick={handlePlayClick}
          disabled={isLoading}
          className={`${baseButtonClass} relative ${isCompact ? '' : 'overflow-hidden'}`}
          title={isAudioPlaying || isPlaying ? 'Pause' : 'Listen'}
          data-testid="listen-button"
        >
          {!isCompact && (isPlaying || isAudioPlaying) && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-electric transition-all duration-100 ease-out"
              style={{ width: `${audioUrl ? audioProgress : progress}%` }}
            />
          )}

          <div className="relative flex items-center justify-center">
            {isLoading ? (
              <Loader2 className={`${iconClass} animate-spin`} />
            ) : isAudioPlaying || isPlaying ? (
              <Pause className={iconClass} />
            ) : (
              <Play className={iconClass} />
            )}
          </div>

          <span className={labelClass}>
            {isLoading ? 'Generating...' : isAudioPlaying || isPlaying ? 'Pause' : 'Listen'}
          </span>
        </button>

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
                className="rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                data-testid="delete-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
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
