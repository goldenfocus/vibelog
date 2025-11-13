'use client';

import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useTextToSpeech } from '@/hooks/useTextToSpeech';

import CommentItem from './CommentItem';

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

interface CommentsListProps {
  comments: Comment[];
  isLoading?: boolean;
}

export default function CommentsList({ comments, isLoading }: CommentsListProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const { playText, stop } = useTextToSpeech();

  const handlePlayAudio = async (text: string, voiceId: string | null) => {
    // Stop any currently playing audio
    if (playingVoiceId) {
      stop();
    }

    if (!voiceId) {
      return;
    }

    setPlayingVoiceId(voiceId);
    await playText({
      text,
      voice: 'shimmer',
      voiceCloneId: voiceId,
    });
    // Stop will be called when audio ends via useTextToSpeech hook
  };

  // Stop playing when component unmounts or comments change
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-electric" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/30 p-8 text-center text-muted-foreground">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} onPlayAudio={handlePlayAudio} />
      ))}
    </div>
  );
}
