'use client';

import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import CommentInput from './CommentInput';
import CommentsList from './CommentsList';

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

interface CommentsProps {
  vibelogId: string;
}

export default function Comments({ vibelogId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/comments/${vibelogId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibelogId]);

  const handleCommentAdded = () => {
    // Refresh comments after a new comment is added
    fetchComments();
  };

  return (
    <div className="mt-12 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-electric" />
        <h2 className="text-2xl font-bold text-foreground">Comments</h2>
        {comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500">
          {error}
        </div>
      )}

      {/* Comment Input */}
      <CommentInput vibelogId={vibelogId} onCommentAdded={handleCommentAdded} />

      {/* Comments List */}
      <CommentsList comments={comments} isLoading={isLoading} />
    </div>
  );
}
