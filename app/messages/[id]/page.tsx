'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase';
import type { ConversationWithDetails, MessageWithDetails } from '@/types/messaging';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    sender: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, authLoading, router]);

  // Fetch conversation details
  useEffect(() => {
    if (!user || !conversationId) {
      return;
    }

    const fetchConversation = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        const conv = data.conversations?.find(
          (c: ConversationWithDetails) => c.id === conversationId
        );

        if (!conv) {
          setError('Conversation not found');
          return;
        }

        setConversation(conv);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation');
      }
    };

    fetchConversation();
  }, [user, conversationId]);

  // Fetch messages
  const fetchMessages = useCallback(
    async (cursor?: string) => {
      if (!user || !conversationId) {
        return;
      }

      try {
        const url = cursor
          ? `/api/conversations/${conversationId}/messages?cursor=${cursor}`
          : `/api/conversations/${conversationId}/messages`;

        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 403) {
            setError('You do not have access to this conversation');
            return;
          }
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();

        if (cursor) {
          // Prepend older messages
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages || []);
        }

        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, conversationId]
  );

  useEffect(() => {
    if (!user || !conversationId) {
      return;
    }
    setLoading(true);
    fetchMessages();
  }, [user, conversationId, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender_id !== user.id && !lastMessage.is_read) {
      fetch(`/api/messages/${lastMessage.id}/read`, { method: 'POST' }).catch(err =>
        console.error('Failed to mark message as read:', err)
      );
    }
  }, [messages, user, conversationId]);

  // Real-time updates
  useEffect(() => {
    if (!user || !conversationId) {
      return;
    }

    const supabase = createClient();

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async payload => {
          // Fetch the full message with sender details
          const { data: newMessage } = await supabase
            .from('messages')
            .select(
              `
              *,
              sender:profiles!messages_sender_id_fkey (
                id,
                username,
                display_name,
                avatar_url,
                email
              )
            `
            )
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages(prev => [
              ...prev,
              {
                ...newMessage,
                reads: [],
                is_read: false,
                read_by_count: 0,
              },
            ]);

            // Mark as read if from someone else
            if (newMessage.sender_id !== user.id) {
              fetch(`/api/messages/${newMessage.id}/read`, { method: 'POST' }).catch(err =>
                console.error('Failed to mark message as read:', err)
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          // Handle typing indicators
          if (payload.new.is_typing !== payload.old.is_typing) {
            setConversation(prev =>
              prev
                ? {
                    ...prev,
                    is_typing: payload.new.is_typing && payload.new.user_id !== user.id,
                  }
                : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  // Handle send message
  const handleSendMessage = async (data: {
    content?: string;
    audio_url?: string;
    audio_duration?: number;
    reply_to_message_id?: string;
  }) => {
    if (!conversationId) {
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Clear reply state
      setReplyTo(null);

      // Message will be added via real-time subscription
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  // Handle typing indicator
  const handleTyping = async (isTyping: boolean) => {
    if (!conversationId) {
      return;
    }

    try {
      const supabase = createClient();
      await supabase
        .from('conversation_participants')
        .update({
          is_typing: isTyping,
          typing_updated_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user?.id);
    } catch (err) {
      console.error('Error updating typing status:', err);
    }
  };

  // Handle reply
  const handleReply = (message: MessageWithDetails) => {
    setReplyTo({
      id: message.id,
      content: message.content || '🎤 Voice message',
      sender: message.sender?.display_name || 'Unknown',
    });
  };

  // Load more messages
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && nextCursor) {
      setLoadingMore(true);
      fetchMessages(nextCursor);
    }
  };

  // Detect scroll position for auto-scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-metallic-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-lg text-red-500">{error}</p>
        <button
          onClick={() => router.push('/messages')}
          className="mt-4 text-sm text-metallic-blue-500 hover:underline"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  const isGroup = conversation?.type === 'group';
  const otherUser = conversation?.other_user;
  const displayName = isGroup
    ? conversation?.title || 'Group Chat'
    : otherUser?.display_name || 'Unknown User';
  const avatarUrl = isGroup ? conversation?.avatar_url : otherUser?.avatar_url;

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-zinc-50 via-metallic-blue-50/20 to-zinc-100 pt-16 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Premium Header with Gradient */}
      <div className="relative flex-shrink-0 border-b border-metallic-blue-200/20 bg-white/80 backdrop-blur-xl dark:border-metallic-blue-800/20 dark:bg-zinc-900/80">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-metallic-blue-500/5 via-transparent to-metallic-blue-500/5" />

        <div className="relative flex items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Back button with hover effect */}
            <motion.button
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/messages')}
              className="rounded-xl p-2 transition-all duration-200 hover:bg-metallic-blue-100 dark:hover:bg-metallic-blue-900/30"
            >
              <ArrowLeft size={20} className="text-metallic-blue-600 dark:text-metallic-blue-400" />
            </motion.button>

            {/* Avatar with glow effect */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="relative"
            >
              {avatarUrl ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-metallic-blue-400 to-metallic-blue-600 opacity-0 blur-md transition-opacity hover:opacity-50" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="relative h-11 w-11 rounded-full border-2 border-white object-cover shadow-md dark:border-zinc-800"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-metallic-blue-400 to-metallic-blue-600 opacity-20 blur-md" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600 text-base font-bold text-white shadow-lg dark:border-zinc-800">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Online status indicator */}
              {!isGroup && Math.random() > 0.5 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute bottom-0 right-0"
                >
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm dark:border-zinc-900" />
                </motion.div>
              )}
            </motion.div>

            {/* Name and status */}
            <div>
              <h2 className="bg-gradient-to-r from-zinc-900 to-zinc-700 bg-clip-text text-base font-bold text-transparent dark:from-zinc-100 dark:to-zinc-300">
                {displayName}
              </h2>
              {conversation?.is_typing ? (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs font-medium text-metallic-blue-500"
                >
                  <div className="flex gap-0.5">
                    <motion.div
                      className="h-1.5 w-1.5 rounded-full bg-metallic-blue-500"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="h-1.5 w-1.5 rounded-full bg-metallic-blue-500"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="h-1.5 w-1.5 rounded-full bg-metallic-blue-500"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                  <span className="italic">typing...</span>
                </motion.div>
              ) : (
                <p className="text-xs text-emerald-500">online</p>
              )}
            </div>
          </div>

          {/* Options menu with hover effect */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl p-2 transition-all duration-200 hover:bg-metallic-blue-100 dark:hover:bg-metallic-blue-900/30"
          >
            <MoreVertical
              size={20}
              className="text-metallic-blue-600 dark:text-metallic-blue-400"
            />
          </motion.button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="relative h-12 w-12"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-metallic-blue-500 to-metallic-blue-300 opacity-20 blur-lg" />
              <div className="relative h-12 w-12 rounded-full border-2 border-metallic-blue-500/20 border-t-metallic-blue-500" />
            </motion.div>
          </div>
        ) : (
          <>
            {/* Load more button */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 text-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-metallic-blue-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md disabled:opacity-50 dark:bg-zinc-800/80 dark:text-metallic-blue-400 dark:hover:bg-zinc-800"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-3 w-3 rounded-full border border-metallic-blue-500 border-t-transparent"
                      />
                      Loading...
                    </span>
                  ) : (
                    'Load older messages'
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* Messages list */}
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isCurrentUser = message.sender_id === user.id;
                const showDateSeparator =
                  index === 0 ||
                  new Date(messages[index - 1].created_at).toDateString() !==
                    new Date(message.created_at).toDateString();

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    {/* Premium Date separator */}
                    {showDateSeparator && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative my-6 flex items-center justify-center"
                      >
                        {/* Decorative lines */}
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-metallic-blue-200/30 dark:border-metallic-blue-800/30" />
                        </div>

                        {/* Date badge */}
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-metallic-blue-500/10 to-metallic-blue-600/10 blur-sm" />
                          <span className="relative inline-block rounded-full border border-metallic-blue-200/30 bg-white/90 px-4 py-1.5 text-xs font-semibold text-metallic-blue-600 shadow-sm backdrop-blur-sm dark:border-metallic-blue-800/30 dark:bg-zinc-900/90 dark:text-metallic-blue-400">
                            {new Date(message.created_at).toLocaleDateString([], {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    <MessageBubble
                      message={message}
                      isCurrentUser={isCurrentUser}
                      onReply={handleReply}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
