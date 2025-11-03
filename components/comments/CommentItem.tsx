'use client';

import { Mic, Play, Pause, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import { useAudioPlayerStore } from '@/state/audio-player-store';

interface CommentAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string | null;
  audio_url: string | null;
  voice_id: string | null;
  created_at: string;
  author: CommentAuthor;
}

interface CommentItemProps {
  comment: Comment;
  onPlayAudio?: (audioUrl: string, voiceId: string | null) => void;
}

export default function CommentItem({ comment, onPlayAudio }: CommentItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const audioUrlRef = useRef<string | null>(null);

  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    currentTime,
    duration: globalDuration,
    setTrack,
    play,
    pause,
  } = useAudioPlayerStore();

  // Check if this comment's audio is currently playing
  const trackId = `comment-${comment.id}`;
  const isThisTrackPlaying = currentTrack?.id === trackId;
  const isPlaying = isThisTrackPlaying ? globalIsPlaying : false;
  const duration = isThisTrackPlaying ? globalDuration : 0;
  const progress = isThisTrackPlaying && duration > 0 ? (currentTime / duration) * 100 : 0;

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

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 p-4">
      {/* Author Header */}
      <div className="mb-3 flex items-center gap-3">
        {comment.author.avatar_url ? (
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
          </p>
        </div>
      </div>

      {/* Text Content */}
      {comment.content && <div className="mb-3 text-foreground">{comment.content}</div>}

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
