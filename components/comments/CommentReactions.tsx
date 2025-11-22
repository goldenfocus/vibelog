'use client';

import { Smile } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  user_ids: string[];
}

interface CommentReactionsProps {
  commentId: string;
  className?: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];

export function CommentReactions({ commentId, className }: CommentReactionsProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reactions
  useEffect(() => {
    fetchReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId]);

  const fetchReactions = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('comment_reactions_summary')
      .select('*')
      .eq('comment_id', commentId);

    if (!error && data) {
      setReactions(
        data.map((r: { emoji: string; count: number; user_ids: string[] | null }) => ({
          emoji: r.emoji,
          count: r.count,
          user_ids: r.user_ids || [],
        }))
      );
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) {
      toast.error(t('toasts.reactions.signInRequired'));
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(r => r.emoji === emoji && r.user_ids.includes(user.id));

    try {
      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) {
          throw error;
        }

        // Update local state optimistically
        setReactions(prev =>
          prev
            .map(r =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count - 1,
                    user_ids: r.user_ids.filter(id => id !== user.id),
                  }
                : r
            )
            .filter(r => r.count > 0)
        );
      } else {
        // Add reaction
        const { error } = await supabase.from('comment_reactions').insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        });

        if (error) {
          throw error;
        }

        // Update local state optimistically
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          setReactions(prev =>
            prev.map(r =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    user_ids: [...r.user_ids, user.id],
                  }
                : r
            )
          );
        } else {
          setReactions(prev => [...prev, { emoji, count: 1, user_ids: [user.id] }]);
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error(t('toasts.reactions.addFailed'));
      // Refresh to get correct state
      fetchReactions();
    } finally {
      setIsLoading(false);
      setShowPicker(false);
    }
  };

  const hasUserReacted = (reaction: Reaction) => {
    return user && reaction.user_ids.includes(user.id);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Existing Reactions */}
      {reactions.map(reaction => (
        <button
          key={reaction.emoji}
          onClick={() => handleReaction(reaction.emoji)}
          disabled={isLoading}
          className={cn(
            'group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all',
            hasUserReacted(reaction)
              ? 'border-electric/50 bg-electric/10 text-electric hover:bg-electric/20'
              : 'border-border/50 bg-background hover:border-electric/30 hover:bg-muted',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          aria-label={`React with ${reaction.emoji}`}
        >
          <span className="text-base leading-none">{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-electric/30 hover:bg-muted hover:text-foreground"
          aria-label="Add reaction"
        >
          <Smile className="h-4 w-4" />
          <span className="text-xs">React</span>
        </button>

        {/* Reaction Picker Dropdown */}
        {showPicker && (
          <div className="absolute bottom-full left-0 z-10 mb-2 flex gap-1 rounded-lg border border-border/50 bg-background p-2 shadow-lg">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={isLoading}
                className="flex h-10 w-10 items-center justify-center rounded-md text-2xl transition-all hover:bg-muted disabled:opacity-50"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
