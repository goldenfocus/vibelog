'use client';

import { AlertTriangle, Sparkles, Send } from 'lucide-react';
import { FormEvent, KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConversation } from '@/hooks/useConversation';
import { cn } from '@/lib/utils';

import MessageList from './MessageList';
import VoiceInput from './VoiceInput';

const STATE_LABELS = {
  generating: 'Generating',
  editing: 'Editing',
  publishing: 'Publishing',
} as const;

/**
 * Conversation workspace that unifies message history, voice capture, and text input.
 * Provides a mobile-first layout and connects directly to the conversation engine.
 */
export default function ChatInterface() {
  const { t } = useI18n();
  const {
    state,
    messages,
    sendMessage,
    isProcessing,
    error,
    clearError,
    canPublish,
    isGenerating,
    isEditing,
  } = useConversation();

  const [inputValue, setInputValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stateLabel = useMemo(() => STATE_LABELS[state], [state]);

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) {
        return;
      }

      setIsSubmitting(true);
      try {
        await sendMessage(trimmed);
        setInputValue('');
      } finally {
        setIsSubmitting(false);
      }
    },
    [inputValue, sendMessage]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleVoiceTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) {
        return;
      }
      setIsSubmitting(true);
      try {
        await sendMessage(trimmed);
      } finally {
        setIsSubmitting(false);
      }
    },
    [sendMessage]
  );

  const isSendDisabled = !inputValue.trim() || isProcessing || isSubmitting || isVoiceActive;

  return (
    <section
      className={cn(
        'flex h-full w-full flex-col gap-6 rounded-3xl border border-border/20 bg-background/95 p-4 shadow-lg sm:p-6 lg:p-8'
      )}
      data-testid="chat-interface"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            Conversation State
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {stateLabel}
            </span>
            {isEditing && canPublish && (
              <span className="text-xs font-medium text-emerald-600">Ready to publish</span>
            )}
            {isGenerating && (
              <span className="text-xs font-medium text-muted-foreground">
                Share a vibe or goal to generate your first draft.
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border/30 bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:text-sm">
          <p className="font-medium text-foreground">Tips</p>
          <p className="mt-1 leading-relaxed">
            Try commands like “make it punchier”, “swap the image”, or “schedule for Friday
            morning”.
          </p>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="mt-2 text-xs font-semibold uppercase tracking-wide text-destructive underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <MessageList
        messages={messages}
        isLoading={isProcessing || isVoiceActive || isSubmitting}
        className="min-h-[18rem]"
      />

      <VoiceInput
        disabled={isProcessing}
        onTranscript={handleVoiceTranscript}
        onRecordingStateChange={state =>
          setIsVoiceActive(state === 'recording' || state === 'processing')
        }
      />

      <form
        onSubmit={event => {
          void handleSubmit(event);
        }}
        className="rounded-2xl border border-border/30 bg-card p-4 shadow-sm sm:p-6"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message the assistant
        </label>
        <Textarea
          id="chat-input"
          value={inputValue}
          onChange={event => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholders.chatFollowUp')}
          rows={3}
          className="min-h-[120px] w-full resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
          data-testid="chat-input"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Press{' '}
            <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold uppercase">
              Enter
            </kbd>{' '}
            to send, <span className="font-semibold">Shift + Enter</span> for a new line.
          </p>
          <Button
            type="submit"
            disabled={isSendDisabled}
            className="inline-flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
