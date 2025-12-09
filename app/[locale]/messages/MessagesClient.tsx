'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, CheckCheck, MessageCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { BOTTOM_NAV_HEIGHT } from '@/lib/mobile/constants';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { ConversationWithDetails } from '@/types/messaging';
import { formatMessageTime, getMessagePreview } from '@/types/messaging';

export default function MessagesClient() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const isSubscribedRef = useRef(false);

  // Fetch conversations with React Query (cached, no reload on tab switch)
  const { data: conversationsData, isLoading: loading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        console.warn('Failed to fetch conversations:', response.status);
        return { conversations: [] };
      }
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const rawConversations: ConversationWithDetails[] = conversationsData?.conversations || [];

  // Sort conversations by last_message_at (most recent first)
  const conversations = useMemo(() => {
    return [...rawConversations].sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA; // Most recent first
    });
  }, [rawConversations]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, authLoading, router]);

  // Real-time updates for new messages
  useEffect(() => {
    if (!user || isSubscribedRef.current) {
      return;
    }

    const supabase = createClient();
    isSubscribedRef.current = true;

    // Subscribe to new messages
    const channel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Invalidate cache to trigger refetch when new message arrives
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-metallic-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-metallic-blue-50/30 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Navigation />
      <div className="mx-auto max-w-4xl pt-16">
        {/* Premium Header with Gradient */}
        <div className="sticky top-16 z-10 border-b border-metallic-blue-200/20 bg-white/80 backdrop-blur-xl dark:border-metallic-blue-800/20 dark:bg-zinc-900/80">
          <div className="relative overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-metallic-blue-500/5 via-transparent to-metallic-blue-500/5" />

            <div className="relative flex items-center justify-between px-4 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600 shadow-lg shadow-metallic-blue-500/30"
                >
                  <MessageCircle className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="bg-gradient-to-r from-metallic-blue-600 to-metallic-blue-500 bg-clip-text text-2xl font-bold text-transparent dark:from-metallic-blue-400 dark:to-metallic-blue-300">
                    {t('messages.title')}
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {conversations.length === 1
                      ? t('messages.conversationCount', { count: conversations.length })
                      : t('messages.conversationCount_other', { count: conversations.length })}
                  </p>
                </div>
              </div>

              {/* New Message Button - Premium */}
              <Link href="/messages/new">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'group relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2.5 sm:px-5 sm:py-3',
                    'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
                    'text-sm font-semibold text-white shadow-lg shadow-metallic-blue-500/40',
                    'transition-all duration-300 hover:shadow-xl hover:shadow-metallic-blue-500/50'
                  )}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                  <motion.div
                    animate={{ rotate: [0, 90, 0] }}
                    transition={{ duration: 0.3, times: [0, 0.5, 1] }}
                    className="relative"
                  >
                    <Plus size={18} className="relative z-10" />
                  </motion.div>
                  <span className="relative z-10 hidden sm:inline">{t('messages.newMessage')}</span>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="divide-y divide-metallic-blue-100/30 dark:divide-metallic-blue-900/30">
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
          ) : conversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="px-4 py-20 text-center"
            >
              {/* Animated Empty State */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mx-auto inline-block"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-metallic-blue-500/20 to-metallic-blue-600/20 blur-2xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-metallic-blue-500/10 to-metallic-blue-600/10 backdrop-blur-sm">
                  <MessageCircle className="h-12 w-12 text-metallic-blue-500" />
                </div>
              </motion.div>

              <h3 className="mt-6 bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-xl font-bold text-transparent dark:from-zinc-100 dark:to-zinc-400">
                {t('messages.empty.title')}
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {t('messages.empty.subtitle')}
              </p>

              <Link href="/messages/new">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'group relative mt-6 inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3',
                    'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
                    'text-sm font-semibold text-white shadow-lg shadow-metallic-blue-500/30',
                    'transition-all duration-300 hover:shadow-xl hover:shadow-metallic-blue-500/40'
                  )}
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  <Plus size={16} className="relative z-10" />
                  <span className="relative z-10">{t('messages.newMessage')}</span>
                </motion.div>
              </Link>
            </motion.div>
          ) : (
            conversations.map((conversation, index) => {
              const isGroup = conversation.type === 'group';
              const otherUser = conversation.other_user;
              const displayName = isGroup
                ? conversation.title || 'Group Chat'
                : otherUser?.display_name || 'Unknown User';
              const avatarUrl = isGroup ? conversation.avatar_url : otherUser?.avatar_url;
              const lastMessage = conversation.last_message;

              // Use human-friendly URL for DMs, UUID for groups
              const conversationUrl =
                !isGroup && otherUser?.username
                  ? `/messages/dm/${otherUser.username}`
                  : `/messages/${conversation.id}`;

              return (
                <Link key={conversation.id} href={conversationUrl}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    className="dark:hover:from-metallic-blue-950/30 group relative flex items-start gap-4 overflow-hidden px-4 py-4 transition-all duration-300 hover:bg-gradient-to-r hover:from-metallic-blue-50/50 hover:to-transparent sm:px-6"
                  >
                    {/* Hover accent line */}
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileHover={{ scaleY: 1 }}
                      className="absolute left-0 top-0 h-full w-1 origin-top bg-gradient-to-b from-metallic-blue-500 to-metallic-blue-600"
                    />

                    {/* Avatar with Ring */}
                    <div className="relative flex-shrink-0">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      >
                        {avatarUrl ? (
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-metallic-blue-400 to-metallic-blue-600 opacity-0 blur-md transition-opacity group-hover:opacity-50" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="relative h-14 w-14 rounded-full border-2 border-white object-cover shadow-md dark:border-zinc-800"
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-metallic-blue-400 to-metallic-blue-600 opacity-20 blur-md" />
                            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600 text-lg font-bold text-white shadow-lg dark:border-zinc-800">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        )}
                      </motion.div>

                      {/* Unread badge with glow */}
                      {conversation.unread_count > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center"
                        >
                          <div className="absolute inset-0 animate-pulse rounded-full bg-red-500 opacity-50 blur-sm" />
                          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-xs font-bold text-white shadow-lg">
                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          className={cn(
                            'truncate text-base font-semibold transition-colors',
                            conversation.unread_count > 0
                              ? 'text-foreground'
                              : 'text-foreground/80 group-hover:text-foreground'
                          )}
                        >
                          {displayName}
                        </h3>
                        {lastMessage && (
                          <span className="flex-shrink-0 text-xs font-medium text-metallic-blue-500/60 dark:text-metallic-blue-400/60">
                            {formatMessageTime(lastMessage.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Last message preview */}
                      <div className="mt-1.5 flex items-center gap-2">
                        {conversation.is_typing ? (
                          <div className="flex items-center gap-2 text-sm font-medium text-metallic-blue-500">
                            <div className="flex gap-1">
                              <motion.div
                                className="h-2 w-2 rounded-full bg-metallic-blue-500"
                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                              />
                              <motion.div
                                className="h-2 w-2 rounded-full bg-metallic-blue-500"
                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.15 }}
                              />
                              <motion.div
                                className="h-2 w-2 rounded-full bg-metallic-blue-500"
                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                              />
                            </div>
                            <span className="italic">{t('messages.typing')}</span>
                          </div>
                        ) : lastMessage ? (
                          <div className="flex items-center gap-1.5">
                            {/* Read status checkmarks for messages sent by current user */}
                            {lastMessage.sender_id === user.id && (
                              <span className="flex-shrink-0">
                                {lastMessage.read_by_count > 0 ? (
                                  <CheckCheck className="h-4 w-4 text-metallic-blue-500" />
                                ) : (
                                  <Check className="h-4 w-4 text-muted-foreground" />
                                )}
                              </span>
                            )}
                            <p
                              className={cn(
                                'truncate text-sm transition-colors',
                                conversation.unread_count > 0
                                  ? 'font-medium text-foreground/90'
                                  : 'text-muted-foreground group-hover:text-foreground/70'
                              )}
                            >
                              {lastMessage.sender_id === user.id && (
                                <span className="text-metallic-blue-500">{t('messages.you')} </span>
                              )}
                              {getMessagePreview(lastMessage, 60)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">
                            {t('messages.noMessagesInThread')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Chevron indicator */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      className="flex items-center text-metallic-blue-500"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.div>
                  </motion.div>
                </Link>
              );
            })
          )}
        </div>

        {/* Bottom padding for BottomNav */}
        <div style={{ height: BOTTOM_NAV_HEIGHT.BASE + 20 }} className="lg:hidden" />
      </div>
    </div>
  );
}
