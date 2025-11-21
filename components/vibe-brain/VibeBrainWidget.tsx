'use client';

import {
  Brain,
  X,
  Minus,
  Send,
  Loader2,
  Sparkles,
  History,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { useVibeBrainStore } from '@/state/vibe-brain-store';

/**
 * Parse markdown links [text](url) and render as Next.js Links
 * Keeps chat open by using internal navigation
 */
function MessageContent({ content }: { content: string }) {
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    // Add the link
    parts.push({ type: 'link', content: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  // If no links found, return plain text
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.type === 'link' && part.url) {
          const isInternal = part.url.startsWith('/');
          if (isInternal) {
            return (
              <Link
                key={i}
                href={part.url}
                className="font-medium text-purple-300 underline decoration-purple-400/50 hover:text-purple-200"
              >
                {part.content}
              </Link>
            );
          } else {
            return (
              <a
                key={i}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-purple-300 underline decoration-purple-400/50 hover:text-purple-200"
              >
                {part.content}
              </a>
            );
          }
        }
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
}

export function VibeBrainWidget() {
  const {
    isOpen,
    isMinimized,
    showHistory,
    messages,
    isLoading,
    error,
    pastConversations,
    loadingHistory,
    toggle,
    close,
    minimize,
    maximize,
    toggleHistory,
    sendMessage,
    clearConversation,
    loadConversation,
  } = useVibeBrainStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && !showHistory) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, showHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) {
      return;
    }

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Open Vibe Brain"
      >
        <Brain className="h-7 w-7" />
        <span className="absolute -right-1 -top-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75"></span>
          <span className="relative inline-flex h-4 w-4 rounded-full bg-pink-500"></span>
        </span>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <button
        onClick={maximize}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 px-4 py-2 text-white shadow-lg transition-all hover:scale-105"
      >
        <Brain className="h-5 w-5" />
        <span className="text-sm font-medium">Vibe Brain</span>
      </button>
    );
  }

  // Full chat panel
  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          {showHistory ? (
            <button
              onClick={toggleHistory}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </button>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Brain className="h-4 w-4 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">
              {showHistory ? 'Past Conversations' : 'Vibe Brain'}
            </h3>
            <p className="text-xs text-white/60">
              {showHistory ? 'Click to continue' : 'Your AI companion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!showHistory && (
            <>
              <button
                onClick={toggleHistory}
                className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                title="Past conversations"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={clearConversation}
                className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                title="New conversation"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={minimize}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History View */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : pastConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-white/30" />
              <p className="text-sm text-white/50">No past conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className="w-full rounded-lg bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                >
                  <p className="truncate text-sm font-medium text-white">{conv.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                    <span>{conv.messageCount} messages</span>
                    <span>·</span>
                    <span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Brain className="h-8 w-8 text-purple-400" />
                </div>
                <h4 className="mb-2 text-lg font-medium text-white">Hey there!</h4>
                <p className="max-w-[280px] text-sm text-white/60">
                  I&apos;m Vibe Brain - I know you, your vibes, and everything happening on the
                  platform. Ask me anything!
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["What's my name?", "Who's most active?", "What's trending?"].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-2.5',
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                          : 'bg-white/10 text-white/90'
                      )}
                    >
                      <p className="text-sm">
                        <MessageContent content={message.content} />
                      </p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 border-t border-white/10 pt-2">
                          <p className="mb-1 text-xs text-white/50">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map(source => {
                              const href =
                                source.type === 'vibelog'
                                  ? `/v/${source.id}`
                                  : source.type === 'profile'
                                    ? `/@${source.username}`
                                    : '#';
                              const label =
                                source.type === 'vibelog'
                                  ? source.title?.slice(0, 20)
                                  : source.type === 'profile'
                                    ? `@${source.username}`
                                    : 'Comment';
                              return (
                                <Link
                                  key={`${source.type}-${source.id}`}
                                  href={href}
                                  className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/20"
                                >
                                  {label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <span className="text-sm text-white/60">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Vibe Brain anything..."
                className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-500/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white transition-all hover:scale-105 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
