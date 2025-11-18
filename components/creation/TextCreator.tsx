'use client';

import { Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useSaveVibelog } from '@/hooks/useSaveVibelog';

interface TextCreatorProps {
  remixContent?: string | null;
}

export function TextCreator({ remixContent }: TextCreatorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(remixContent || '');
  const { saveVibelog, isSaving } = useSaveVibelog();

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    try {
      const result = await saveVibelog({
        title: title.trim() || undefined,
        content: content.trim(),
      });

      if (result.success) {
        // Clear form on success
        setTitle('');
        setContent('');

        // Show success message
        const vibelogUrl = result.publicUrl || `/vibelogs/${result.vibelogId}`;
        toast.success('Vibelog published! Redirecting...', {
          description: 'You can regenerate with different tones on the next page',
          duration: 2000,
        });

        // Redirect to the vibelog page after a brief delay
        setTimeout(() => {
          window.location.href = vibelogUrl;
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save vibelog:', error);
      toast.error('Failed to save vibelog. Please try again.');
    }
  };

  const canSave = content.trim().length > 0 && !isSaving;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-lg backdrop-blur-sm">
        {/* Title Input */}
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="mb-4 w-full rounded-lg border border-border/50 bg-background px-4 py-3 text-lg font-medium text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          disabled={isSaving}
        />

        {/* Content Textarea */}
        <textarea
          placeholder="Write your thoughts..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={8}
          className="mb-4 w-full resize-none rounded-lg border border-border/50 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          disabled={isSaving}
        />

        {/* Character Count */}
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{content.length} characters</span>
          {content.trim().length === 0 && <span className="text-xs">Write something to save</span>}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-600 disabled:hover:to-pink-600"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Vibelog</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
