'use client';

import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

import type { ConversationMessage } from '@/state/conversation-state';

export interface MessageListProps {
  messages: ConversationMessage[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Scrollable conversation history with role-based styling.
 * Automatically follows the most recent message and provides
 * a typing indicator while the assistant is processing.
 */
export function MessageList({ messages, isLoading = false, className }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const endMarkerRef = useRef<HTMLDivElement>(null);

  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = normalizeTimestamp(a.timestamp);
      const bTime = normalizeTimestamp(b.timestamp);
      return aTime - bTime;
    });
  }, [messages]);

  useEffect(() => {
    if (endMarkerRef.current) {
      endMarkerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [orderedMessages.length, isLoading]);

  if (!orderedMessages.length) {
    return (
      <div
        ref={listRef}
        className={cn(
          'flex flex-1 flex-col items-center justify-center rounded-2xl border border-border/40 bg-muted/30 p-8 text-center text-muted-foreground',
          className
        )}
        data-testid="message-list-empty"
      >
        <p className="text-sm font-medium">Start the conversation</p>
        <p className="mt-2 text-xs opacity-80">
          Ask VibeLog to generate a post or say what you would like to change.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={cn(
        'flex-1 overflow-y-auto rounded-2xl border border-border/20 bg-background p-4 sm:p-6',
        className
      )}
      data-testid="message-list"
    >
      <div className="flex flex-col space-y-4">
        {orderedMessages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-end justify-start gap-2" data-testid="message-list-loading">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              …
            </div>
            <div className="rounded-2xl bg-primary/5 px-4 py-3 text-sm text-muted-foreground shadow-sm">
              Thinking…
            </div>
          </div>
        )}

        <div ref={endMarkerRef} />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ConversationMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const timestamp = formatTimestamp(message.timestamp);

  return (
    <div
      className={cn(
        'flex items-end gap-3',
        isUser ? 'justify-end text-right' : 'justify-start text-left'
      )}
      data-testid={`message-bubble-${message.role}`}
    >
      {!isUser && <Avatar role="assistant" />}
      <div>
        <div
          className={cn(
            'max-w-[90vw] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-md',
            isUser
              ? 'bg-gradient-electric text-primary-foreground'
              : 'border border-border/30 bg-card text-foreground'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          {isUser ? 'You' : 'VibeLog AI'}
          {timestamp && (
            <span className="ml-2 font-normal capitalize text-muted-foreground">• {timestamp}</span>
          )}
        </p>
      </div>
      {isUser && <Avatar role="user" />}
    </div>
  );
}

interface AvatarProps {
  role: 'user' | 'assistant';
}

function Avatar({ role }: AvatarProps) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-md',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
      )}
      aria-hidden="true"
    >
      {isUser ? 'You' : 'AI'}
    </div>
  );
}

function normalizeTimestamp(timestamp: Date | string) {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function formatTimestamp(timestamp: Date | string) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default MessageList;
