'use client';

import {
  Edit2,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Pause,
  Play,
  Save,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/AuthProvider';
import { useAudioPlayerStore } from '@/state/audio-player-store';
import type { MediaAttachment } from '@/types/comments';

interface CommentAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string | null;
  audio_url: string | null;
  voice_id: string | null;
  created_at: string;
  updated_at?: string;
  author: CommentAuthor;
  attachments?: MediaAttachment[] | null;
}

interface CommentItemProps {
  comment: Comment;
  onPlayAudio?: (audioUrl: string, voiceId: string | null) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  userIsAdmin?: boolean;
}

export default function CommentItem({
  comment,
  onPlayAudio,
  onUpdate,
  onDelete,
  userIsAdmin = false,
}: CommentItemProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content || '');
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    currentTime,
    duration: globalDuration,
    setTrack,
    play,
    pause,
  } = useAudioPlayerStore();

  // Check if user owns this comment or is admin
  const isOwner = user?.id === comment.user_id;
  const canEdit = isOwner || userIsAdmin;

  // Check if this comment's audio is currently playing
  const trackId = `comment-${comment.id}`;
  const isThisTrackPlaying = currentTrack?.id === trackId;
  const isPlaying = isThisTrackPlaying ? globalIsPlaying : false;
  const duration = isThisTrackPlaying ? globalDuration : 0;
  const progress = isThisTrackPlaying && duration > 0 ? (currentTime / duration) * 100 : 0;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!comment.audio_url) {
      return;
    }

    // If already playing this track, pause it
    if (isThisTrackPlaying && globalIsPlaying) {
      pause();
      return;
    }

    // If already set as track but paused, resume
    if (isThisTrackPlaying && !globalIsPlaying) {
      try {
        await play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
      return;
    }

    // Play - use TTS with cloned voice if available, otherwise play audio directly
    if (onPlayAudio && comment.voice_id && comment.content) {
      // Use TTS with cloned voice for text comments that have voice_id
      setIsLoading(true);
      try {
        await onPlayAudio(comment.content, comment.voice_id);
      } catch (error) {
        console.error('Error playing audio:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (comment.audio_url) {
      // Play audio directly via global player
      setIsLoading(true);
      try {
        // Fetch and create blob URL if not already done
        if (!audioUrlRef.current) {
          const response = await fetch(comment.audio_url);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
        }

        // Set track in global player
        setTrack({
          id: trackId,
          url: audioUrlRef.current,
          title: 'Voice comment',
          author: comment.author.display_name,
          type: 'url',
        });

        // Small delay to ensure track is set
        await new Promise(resolve => setTimeout(resolve, 50));

        // Play via global player
        await play();
      } catch (error) {
        console.error('Error playing audio:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedContent.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update comment');
      }

      toast.success('Comment updated!');
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update comment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(comment.content || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete comment');
      }

      toast.success('Comment deleted!');
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
  };

  if (isDeleting) {
    return null; // Don't show deleted comments
  }

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 p-4">
      {/* Author Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {comment.author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.author.avatar_url}
              alt={comment.author.display_name}
              className="h-10 w-10 rounded-full border-2 border-electric/20"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
              <User className="h-5 w-5 text-electric" />
            </div>
          )}
          <div className="flex-1">
            <p className="font-medium text-foreground">{comment.author.display_name}</p>
            <p className="text-xs text-muted-foreground">
              @{comment.author.username} · {formatTimeAgo(comment.created_at)}
              {comment.updated_at && comment.updated_at !== comment.created_at && ' · edited'}
            </p>
          </div>
        </div>

        {/* Action Menu */}
        {canEdit && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-border/30 bg-card shadow-lg">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-muted"
                  disabled={!comment.content}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text Content or Edit Mode */}
      {isEditing ? (
        <div className="mb-3 space-y-3">
          <textarea
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            className="w-full resize-none rounded-lg border border-border/30 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-border/30 px-4 py-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isLoading || !editedContent.trim()}
              className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        comment.content && <div className="mb-3 text-foreground">{comment.content}</div>
      )}

      {/* Media Attachments Gallery */}
      {comment.attachments && comment.attachments.length > 0 && (
        <div
          className={`grid gap-3 ${comment.attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}
        >
          {comment.attachments.map(attachment => (
            <div
              key={attachment.url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {attachment.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.url}
                  alt="Comment attachment"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="relative h-full w-full">
                  <video
                    src={attachment.url}
                    controls
                    className="h-full w-full object-cover"
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                  {/* Video icon overlay */}
                  <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 p-2">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Type badge */}
              <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1">
                {attachment.type === 'image' ? (
                  <ImageIcon className="h-3 w-3 text-white" />
                ) : (
                  <Video className="h-3 w-3 text-white" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audio Player */}
      {comment.audio_url && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/30 p-3">
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-electric text-white transition-all hover:bg-electric-glow disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span>Voice comment</span>
              {duration > 0 && <span className="ml-auto font-mono">{formatTime(duration)}</span>}
            </div>
            {isPlaying && duration > 0 && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-electric transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
