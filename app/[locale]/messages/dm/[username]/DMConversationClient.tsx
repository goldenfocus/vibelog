'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import { ImmersiveHeader } from '@/components/mobile/ImmersiveHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { useBottomNav } from '@/components/providers/BottomNavProvider';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSafeArea } from '@/hooks/useSafeArea';
import { MESSAGE_INPUT } from '@/lib/mobile/constants';
import { createClient } from '@/lib/supabase';
import type { ConversationWithDetails, MessageWithDetails } from '@/types/messaging';

export default function DMConversationClient() {
  const params = useParams();
  const username = params?.username as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { top } = useSafeArea();
  const { hide: hideBottomNav, show: showBottomNav } = useBottomNav();
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
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
  const [inputHeight, setInputHeight] = useState<number>(MESSAGE_INPUT.BASE_HEIGHT);

  // Keyboard detection for auto-scroll on keyboard open
  const { isKeyboardOpen } = useKeyboardHeight();

  // Hide bottom nav on mount, show on unmount (immersive messaging mode)
  useEffect(() => {
    hideBottomNav();
    return () => showBottomNav();
  }, [hideBottomNav, showBottomNav]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, authLoading, router]);

  // Fetch conversation by username
  useEffect(() => {
    if (!user || !username) {
      return;
    }

    const fetchConversation = async () => {
      try {
        // Strip @ prefix if present in URL
        const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

        const response = await fetch(`/api/conversations/dm/${cleanUsername}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found');
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch conversation');
        }

        const data = await response.json();
        const conv = data.conversation;

        if (!conv) {
          setError('Could not start conversation');
          setLoading(false);
          return;
        }

        setConversation({
          ...conv,
          participants: [],
          last_message: null,
          unread_count: 0,
          is_muted: false,
          is_archived: false,
          is_typing: false,
        });
        setConversationId(conv.id);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation');
        setLoading(false);
      }
    };

    fetchConversation();
  }, [user, username, router]);

  // Fetch messages once we have conversationId
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
    fetchMessages();
  }, [user, conversationId, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Auto-scroll when keyboard opens (ensures latest messages stay visible)
  useEffect(() => {
    if (isKeyboardOpen && shouldAutoScroll && messagesEndRef.current) {
      // Small delay to let keyboard animation complete
      const timeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isKeyboardOpen, shouldAutoScroll]);

  // Track which messages we've already marked as read to avoid duplicate API calls
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Mark ALL unread messages as read when viewing the conversation
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) {
      return;
    }

    const unreadMessages = messages.filter(
      msg => msg.sender_id !== user.id && !msg.is_read && !markedAsReadRef.current.has(msg.id)
    );

    if (unreadMessages.length === 0) {
      return;
    }

    unreadMessages.forEach(msg => markedAsReadRef.current.add(msg.id));

    Promise.all(
      unreadMessages.map(msg =>
        fetch(`/api/messages/${msg.id}/read`, { method: 'POST' }).catch(err =>
          console.error(`Failed to mark message ${msg.id} as read:`, err)
        )
      )
    );
  }, [messages, user, conversationId]);

  // Auto-clear stale typing indicators
  useEffect(() => {
    if (!conversation?.is_typing) {
      return;
    }

    const timeout = setTimeout(() => {
      setConversation(prev => (prev ? { ...prev, is_typing: false } : null));
    }, 5000);

    return () => clearTimeout(timeout);
  }, [conversation?.is_typing]);

  // Real-time updates
  useEffect(() => {
    if (!user || !conversationId) {
      return;
    }

    const supabase = createClient();

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
          const { data: messageData } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            let senderProfile = null;
            if (messageData.sender_id) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, email')
                .eq('id', messageData.sender_id)
                .single();
              senderProfile = profileData;
            }

            const newMessage = {
              ...messageData,
              sender: senderProfile,
            };

            setMessages(prev => [
              ...prev,
              {
                ...newMessage,
                reads: [],
                is_read: false,
                read_by_count: 0,
              },
            ]);

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
          if (payload.new.is_typing !== payload.old.is_typing) {
            const typingUpdatedAt = payload.new.typing_updated_at
              ? new Date(payload.new.typing_updated_at).getTime()
              : 0;
            const isStale = Date.now() - typingUpdatedAt > 5000;

            if (payload.new.is_typing && isStale) {
              return;
            }

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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        payload => {
          const { message_id, user_id: readerId } = payload.new as {
            message_id: string;
            user_id: string;
          };

          if (readerId === user.id) {
            return;
          }

          setMessages(prev =>
            prev.map(msg => {
              if (msg.id === message_id && msg.sender_id === user.id) {
                return {
                  ...msg,
                  read_by_count: (msg.read_by_count || 0) + 1,
                };
              }
              return msg;
            })
          );
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

      setReplyTo(null);

      // Force scroll to bottom after sending - ensures timestamp is visible
      // Small delay to allow the message to be added to DOM
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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

  const otherUser = conversation?.other_user;
  const displayName = otherUser?.display_name || otherUser?.username || 'Unknown User';
  const avatarUrl = otherUser?.avatar_url;

  // Calculate bottom padding for messages container
  // inputHeight already includes keyboard/safe-area offset from MessageInput
  // Using 32px buffer to ensure content isn't cut off during initial render race condition
  const messagesBottomPadding = inputHeight + 32;

  return (
    <div className="flex h-dvh flex-col bg-gradient-to-br from-zinc-50 via-metallic-blue-50/20 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Immersive Header - fixed positioned, compact */}
      <ImmersiveHeader
        onBack={() => router.push('/messages')}
        avatar={avatarUrl}
        title={displayName}
        subtitle={conversation?.is_typing ? 'typing...' : `@${otherUser?.username || username}`}
        isTyping={conversation?.is_typing}
      />

      {/* Spacer for fixed header */}
      <div style={{ height: `calc(56px + ${top}px)` }} className="flex-shrink-0" />

      {/* Messages - with dynamic bottom padding for fixed input */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pt-6 sm:px-6"
        style={{ paddingBottom: messagesBottomPadding }}
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
                    {showDateSeparator && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative my-6 flex items-center justify-center"
                      >
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-metallic-blue-200/30 dark:border-metallic-blue-800/30" />
                        </div>
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

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input - now fixed positioned, no wrapper needed */}
      {conversationId && (
        <MessageInput
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onHeightChange={setInputHeight}
        />
      )}
    </div>
  );
}
