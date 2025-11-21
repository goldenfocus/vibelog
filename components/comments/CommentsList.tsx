'use client';

import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

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
  parent_comment_id?: string | null;
}

export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[];
}

interface CommentsListProps {
  comments: Comment[];
  vibelogId: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  userIsAdmin?: boolean;
}

// Build a tree structure from flat comments array
function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const commentMap = new Map<string, CommentWithReplies>();
  const rootComments: CommentWithReplies[] = [];

  // First pass: create all comment nodes with empty replies
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: link replies to parents
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id)!;
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentNode);
      } else {
        // Parent not found (deleted?), treat as root
        rootComments.push(commentNode);
      }
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
}

export default function CommentsList({
  comments,
  vibelogId,
  isLoading,
  onRefresh,
  userIsAdmin = false,
}: CommentsListProps) {
  // Build comment tree from flat array
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

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
      {commentTree.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          vibelogId={vibelogId}
          onPlayAudio={handlePlayAudio}
          onUpdate={onRefresh}
          onDelete={onRefresh}
          userIsAdmin={userIsAdmin}
          depth={0}
        />
      ))}
    </div>
  );
}
