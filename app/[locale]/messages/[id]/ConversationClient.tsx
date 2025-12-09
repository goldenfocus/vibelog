'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export default function ConversationClient() {
  const params = useParams();
  const conversationId = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { top } = useSafeArea();
  const { hide: hideBottomNav, show: showBottomNav } = useBottomNav();
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
  const [inputHeight, setInputHeight] = useState<number>(MESSAGE_INPUT.BASE_HEIGHT);

  // Keyboard detection for auto-scroll on keyboard open
  const { isKeyboardOpen } = useKeyboardHeight();

  // Hide bottom nav on mount, show on unmount (immersive mode)
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

  // Fetch conversation details
  useEffect(() => {
    if (!user || !conversationId) {
      return;
    }

    const fetchConversation = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (!response.ok) {
          // Redirect to messages list on API error
          console.error('Failed to fetch conversations, redirecting to messages');
          router.replace('/messages');
          return;
        }

        const data = await response.json();
        const conv = data.conversations?.find(
          (c: ConversationWithDetails) => c.id === conversationId
        );

        if (!conv) {
          // Conversation not found - redirect to messages list
          console.error('Conversation not found, redirecting to messages');
          router.replace('/messages');
          return;
        }

        setConversation(conv);

        // Mark any message notifications for this conversation as read
        // This clears the notification badge instantly when opening the conversation
        fetch(`/api/conversations/${conversationId}/mark-notifications-read`, {
          method: 'POST',
        }).catch(err => console.error('Failed to mark notifications as read:', err));
      } catch (err) {
        console.error('Error fetching conversation:', err);
        // Redirect on any error
        router.replace('/messages');
      }
    };

    fetchConversation();
  }, [user, conversationId, router]);

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
  // This ensures read receipts (double checkmarks) show correctly for the sender
  useEffect(() => {
    if (!user || !conversationId || messages.length === 0) {
      return;
    }

    // Find all unread messages from other users that we haven't already marked
    const unreadMessages = messages.filter(
      msg => msg.sender_id !== user.id && !msg.is_read && !markedAsReadRef.current.has(msg.id)
    );

    if (unreadMessages.length === 0) {
      return;
    }

    // Mark these messages as "being processed" to avoid duplicate calls
    unreadMessages.forEach(msg => markedAsReadRef.current.add(msg.id));

    // Mark all unread messages as read
    // This updates the sender's read receipts (single -> double checkmark)
    Promise.all(
      unreadMessages.map(msg =>
        fetch(`/api/messages/${msg.id}/read`, { method: 'POST' }).catch(err =>
          console.error(`Failed to mark message ${msg.id} as read:`, err)
        )
      )
    );
  }, [messages, user, conversationId]);

  // Auto-clear stale typing indicators on the client side
  // This handles the case where we're viewing an already-stuck typing indicator
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
          // Fetch the message and sender profile separately (no FK join required)
          const { data: messageData } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            // Fetch sender profile separately
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
            // Check if typing indicator is fresh (within 5 seconds)
            const typingUpdatedAt = payload.new.typing_updated_at
              ? new Date(payload.new.typing_updated_at).getTime()
              : 0;
            const isStale = Date.now() - typingUpdatedAt > 5000;

            // Ignore stale typing indicators
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
          // Update read receipt count when someone reads a message
          const { message_id, user_id: readerId } = payload.new as {
            message_id: string;
            user_id: string;
          };

          // Only update if it's not the current user reading (they already know)
          // and it's not the sender reading their own message
          if (readerId === user.id) {
            return;
          }

          setMessages(prev =>
            prev.map(msg => {
              if (msg.id === message_id && msg.sender_id === user.id) {
                // This is a message I sent, and someone else read it
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

      // Clear reply state
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

  const isGroup = conversation?.type === 'group';
  const otherUser = conversation?.other_user;
  const displayName = isGroup
    ? conversation?.title || 'Group Chat'
    : otherUser?.display_name || 'Unknown User';
  const avatarUrl = isGroup ? conversation?.avatar_url : otherUser?.avatar_url;

  // Calculate bottom padding for messages container
  // inputHeight already includes keyboard/safe-area offset from MessageInput
  // Using 32px buffer to ensure content isn't cut off during initial render race condition
  const messagesBottomPadding = inputHeight + 32;

  return (
    <div className="flex h-dvh flex-col bg-gradient-to-br from-zinc-50 via-metallic-blue-50/20 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Immersive Header - compact, no bottom nav on this page */}
      <ImmersiveHeader
        onBack={() => router.push('/messages')}
        avatar={avatarUrl}
        title={displayName}
        subtitle={
          conversation?.is_typing
            ? 'typing...'
            : otherUser?.username
              ? `@${otherUser.username}`
              : undefined
        }
        isTyping={conversation?.is_typing}
        profileUrl={otherUser?.username ? `/@${otherUser.username}` : undefined}
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

      {/* Message Input - now fixed positioned, no wrapper needed */}
      <MessageInput
        conversationId={conversationId}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onHeightChange={setInputHeight}
      />
    </div>
  );
}
