'use client';

import { Brain, X, Minus, Send, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { useVibeBrainStore } from '@/state/vibe-brain-store';

export function VibeBrainWidget() {
  const {
    isOpen,
    isMinimized,
    messages,
    isLoading,
    error,
    toggle,
    close,
    minimize,
    maximize,
    sendMessage,
    clearConversation,
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
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Vibe Brain</h3>
            <p className="text-xs text-white/60">Your AI companion</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearConversation}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="New conversation"
          >
            <Sparkles className="h-4 w-4" />
          </button>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Brain className="h-8 w-8 text-purple-400" />
            </div>
            <h4 className="mb-2 text-lg font-medium text-white">Hey there!</h4>
            <p className="max-w-[280px] text-sm text-white/60">
              I&apos;m Vibe Brain, your AI companion. I know everything happening on VibeLog. Ask me
              anything!
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["What's trending?", 'Help me create', 'Who should I follow?'].map(suggestion => (
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
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                      : 'bg-white/10 text-white/90'
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <p className="mb-1 text-xs text-white/50">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map(source => (
                          <a
                            key={`${source.type}-${source.id}`}
                            href={
                              source.type === 'vibelog'
                                ? `/v/${source.id}`
                                : source.type === 'profile'
                                  ? `/@${source.username}`
                                  : '#'
                            }
                            className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/20"
                          >
                            {source.type === 'vibelog'
                              ? source.title?.slice(0, 20)
                              : source.type === 'profile'
                                ? `@${source.username}`
                                : 'Comment'}
                          </a>
                        ))}
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
    </div>
  );
}
