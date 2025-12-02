/**
 * Text Comment Input Component
 * Simple text textarea for commenting
 */

'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import MediaAttachmentZone from '@/components/comments/MediaAttachmentZone';
import { useI18n } from '@/components/providers/I18nProvider';
import type { MediaAttachment } from '@/types/comments';

interface TextCommentInputProps {
  vibelogId: string;
  parentCommentId?: string;
  onCommentAdded: () => void;
}

export default function TextCommentInput({
  vibelogId,
  parentCommentId,
  onCommentAdded,
}: TextCommentInputProps) {
  const { t } = useI18n();
  const [textContent, setTextContent] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!textContent.trim()) {
      toast.error(t('toasts.comments.enterComment'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId,
          content: textContent.trim(),
          parentCommentId,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit comment');
      }

      toast.success(t('toasts.comments.live'));
      setTextContent('');
      setAttachments([]);
      onCommentAdded();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error(error instanceof Error ? error.message : t('toasts.comments.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={textContent}
        onChange={e => setTextContent(e.target.value)}
        placeholder={t('placeholders.comment')}
        className="w-full resize-none rounded-lg border border-border/30 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
        rows={3}
      />

      {/* Media Attachments - Only show when user has started typing */}
      {textContent.trim().length > 0 && (
        <MediaAttachmentZone attachments={attachments} onChange={setAttachments} />
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !textContent.trim()}
          className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Posting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Post Comment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
