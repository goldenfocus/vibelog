'use client';

import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';

import CommentInput from './CommentInput';
import CommentsList from './CommentsList';

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
  video_url?: string | null;
  voice_id: string | null;
  created_at: string;
  updated_at?: string;
  author: CommentAuthor;
}

interface CommentsProps {
  vibelogId: string;
}

export default function Comments({ vibelogId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/vibelogs/${vibelogId}/comments`, {
        credentials: 'include',
      });

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
    setReplyingTo(null); // Clear reply state after posting
  };

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId);
    // Scroll to the comment input
    document
      .getElementById('comment-input')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
      <div id="comment-input">
        {replyingTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-electric/10 px-3 py-2 text-sm text-electric">
            <span>Replying to a comment</span>
            <button
              onClick={handleCancelReply}
              className="ml-auto rounded px-2 py-0.5 text-xs hover:bg-electric/20"
            >
              Cancel
            </button>
          </div>
        )}
        <CommentInput
          vibelogId={vibelogId}
          parentCommentId={replyingTo || undefined}
          onCommentAdded={handleCommentAdded}
          onCancel={replyingTo ? handleCancelReply : undefined}
        />
      </div>

      {/* Comments List */}
      <CommentsList
        comments={comments}
        vibelogId={vibelogId}
        isLoading={isLoading}
        onRefresh={fetchComments}
        onReply={handleReply}
        userIsAdmin={userIsAdmin}
      />
    </div>
  );
}
