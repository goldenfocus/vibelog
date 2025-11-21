'use client';

import { Loader2 } from 'lucide-react';

import CommentItem from './CommentItem';

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
}

interface CommentsListProps {
  comments: Comment[];
  vibelogId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onReply?: (parentCommentId: string) => void;
  userIsAdmin?: boolean;
}

export default function CommentsList({
  comments,
  vibelogId,
  isLoading,
  onRefresh,
  onReply,
  userIsAdmin = false,
}: CommentsListProps) {
  // TTS disabled - comment audio playback removed
  const handlePlayAudio = async (_text: string, _voiceId: string | null) => {
    // No-op: TTS playback disabled
    console.log('[CommentsList] Audio playback disabled - use only original audio');
  };

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
        <CommentItem
          key={comment.id}
          comment={comment}
          vibelogId={vibelogId}
          onPlayAudio={handlePlayAudio}
          onUpdate={onRefresh}
          onDelete={onRefresh}
          onReply={onReply}
          userIsAdmin={userIsAdmin}
        />
      ))}
    </div>
  );
}
