/**
 * Message Service - Core Business Logic for Messaging System
 *
 * This module provides high-level functions for message and conversation management.
 * All database operations are abstracted here to keep API routes clean and consistent.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Conversation,
  ConversationWithDetails,
  Message,
  MessageWithDetails,
  MessageContentType,
  MessageStatus,
  Profile,
} from '@/types/database';

// =====================================================
// CONVERSATION OPERATIONS
// =====================================================

/**
 * Get or create a DM conversation between two users
 * Returns existing conversation if found, creates new one if not
 */
export async function getOrCreateDMConversation(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Check if user is blocked
    const { data: blockData } = await supabase
      .from('user_relationships')
      .select('id')
      .or(
        `and(user_id.eq.${userId},target_user_id.eq.${otherUserId},relationship_type.eq.block),and(user_id.eq.${otherUserId},target_user_id.eq.${userId},relationship_type.eq.block)`
      )
      .limit(1);

    if (blockData && blockData.length > 0) {
      return {
        data: null,
        error: new Error('Cannot message blocked user'),
      };
    }

    // Use the database function to get or create conversation
    const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
      participant1_id: userId,
      participant2_id: otherUserId,
    });

    if (error) throw error;

    // Fetch the full conversation object
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;

    return { data: conversation, error: null };
  } catch (err) {
    console.error('[getOrCreateDMConversation] Error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to get or create conversation'),
    };
  }
}

/**
 * Get all conversations for a user with enriched details
 */
export async function getUserConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: ConversationWithDetails[]; error: Error | null }> {
  try {
    // Get all conversations user is participating in
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select(
        `
        conversation_id,
        is_muted,
        is_archived,
        is_pinned,
        last_read_message_id,
        conversations!inner (*)
      `
      )
      .eq('user_id', userId)
      .is('left_at', null)
      .order('conversations(last_message_at)', { ascending: false, nullsFirst: false });

    if (participantError) throw participantError;
    if (!participantData || participantData.length === 0) {
      return { data: [], error: null };
    }

    // Get conversation IDs
    const conversationIds = participantData.map((p) => p.conversation_id);

    // Get all participants for these conversations
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('conversation_participants')
      .select(
        `
        conversation_id,
        user_id,
        profiles!inner (
          id,
          username,
          display_name,
          avatar_url,
          email
        )
      `
      )
      .in('conversation_id', conversationIds)
      .is('left_at', null);

    if (allParticipantsError) throw allParticipantsError;

    // Get last message for each conversation
    const { data: lastMessages, error: lastMessagesError } = await supabase
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
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (lastMessagesError) throw lastMessagesError;

    // Get unread counts
    const { data: unreadCounts } = await supabase.rpc('get_unread_count', {
      p_user_id: userId,
    });

    // Build enriched conversation objects
    const enrichedConversations: ConversationWithDetails[] = participantData.map((p: any) => {
      const conversation = p.conversations;

      // Get participants for this conversation (excluding current user for DMs)
      const participants =
        allParticipants
          ?.filter((ap: any) => ap.conversation_id === conversation.id && ap.user_id !== userId)
          .map((ap: any) => ap.profiles) || [];

      // Get last message
      const lastMessage =
        lastMessages?.find((m: any) => m.conversation_id === conversation.id) || null;

      // Get unread count
      const unreadData = unreadCounts?.find(
        (uc: any) => uc.conversation_id === conversation.id
      );
      const unreadCount = unreadData?.unread_count || 0;

      return {
        ...conversation,
        participants,
        lastMessage: lastMessage
          ? {
              ...lastMessage,
              reactions: [],
              status: undefined,
            }
          : null,
        unreadCount: Number(unreadCount),
        isMuted: p.is_muted,
        isArchived: p.is_archived,
        isPinned: p.is_pinned,
      };
    });

    // Sort by pinned, then by last message time
    enrichedConversations.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return { data: enrichedConversations, error: null };
  } catch (err) {
    console.error('[getUserConversations] Error:', err);
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Failed to fetch conversations'),
    };
  }
}

/**
 * Create a new group conversation
 */
export async function createGroupConversation(
  supabase: SupabaseClient,
  creatorId: string,
  participantIds: string[],
  title: string
): Promise<{ data: Conversation | null; error: Error | null }> {
  try {
    // Validate minimum participants (creator + at least 1 other)
    if (participantIds.length < 1) {
      return {
        data: null,
        error: new Error('Group conversation requires at least 2 participants'),
      };
    }

    // Create conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        title,
        created_by: creatorId,
      })
      .select()
      .single();

    if (conversationError) throw conversationError;

    // Add creator as owner
    const participants = [
      { conversation_id: conversation.id, user_id: creatorId, role: 'owner' },
      ...participantIds.map((id) => ({
        conversation_id: conversation.id,
        user_id: id,
        role: 'member' as const,
      })),
    ];

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return { data: conversation, error: null };
  } catch (err) {
    console.error('[createGroupConversation] Error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to create group conversation'),
    };
  }
}

// =====================================================
// MESSAGE OPERATIONS
// =====================================================

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  supabase: SupabaseClient,
  senderId: string,
  conversationId: string,
  content: string,
  options: {
    contentType?: MessageContentType;
    parentMessageId?: string;
    attachments?: any[];
    metadata?: any;
  } = {}
): Promise<{ data: MessageWithDetails | null; error: Error | null }> {
  try {
    // Verify user is participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', senderId)
      .is('left_at', null)
      .single();

    if (participantError || !participant) {
      return {
        data: null,
        error: new Error('Not a participant in this conversation'),
      };
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        content_type: options.contentType || 'text',
        parent_message_id: options.parentMessageId || null,
        attachments: options.attachments || [],
        metadata: options.metadata || {},
      })
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
      .single();

    if (messageError) throw messageError;

    // Enrich with empty reactions and status
    const enrichedMessage: MessageWithDetails = {
      ...message,
      reactions: [],
      status: undefined,
    };

    return { data: enrichedMessage, error: null };
  } catch (err) {
    console.error('[sendMessage] Error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to send message'),
    };
  }
}

/**
 * Get messages for a conversation with pagination
 */
export async function getMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  options: {
    limit?: number;
    cursor?: string; // ISO timestamp
    parentMessageId?: string; // For thread replies
  } = {}
): Promise<{
  data: MessageWithDetails[];
  nextCursor: string | null;
  hasMore: boolean;
  error: Error | null;
}> {
  try {
    // Verify user is participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    if (participantError || !participant) {
      return {
        data: [],
        nextCursor: null,
        hasMore: false,
        error: new Error('Not a participant in this conversation'),
      };
    }

    const limit = Math.min(options.limit || 50, 100);

    let query = supabase
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
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    // Filter by parent message ID if getting thread replies
    if (options.parentMessageId) {
      query = query.eq('parent_message_id', options.parentMessageId);
    } else {
      // Only get top-level messages (not replies)
      query = query.is('parent_message_id', null);
    }

    // Cursor-based pagination
    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) throw messagesError;

    const hasMore = messages.length > limit;
    const paginatedMessages = messages.slice(0, limit);

    // Get reactions for all messages
    const messageIds = paginatedMessages.map((m) => m.id);
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);

    // Get message status for current user
    const { data: statuses } = await supabase
      .from('message_status')
      .select('message_id, status')
      .in('message_id', messageIds)
      .eq('user_id', userId);

    // Enrich messages with reactions and status
    const enrichedMessages: MessageWithDetails[] = paginatedMessages.map((message) => {
      // Group reactions by emoji
      const messageReactions = reactions?.filter((r) => r.message_id === message.id) || [];
      const reactionGroups = messageReactions.reduce(
        (acc, r) => {
          if (!acc[r.emoji]) {
            acc[r.emoji] = { emoji: r.emoji, userIds: [], count: 0, hasReacted: false };
          }
          acc[r.emoji].userIds.push(r.user_id);
          acc[r.emoji].count++;
          if (r.user_id === userId) {
            acc[r.emoji].hasReacted = true;
          }
          return acc;
        },
        {} as Record<string, any>
      );

      // Get status for this message
      const status = statuses?.find((s) => s.message_id === message.id)?.status;

      return {
        ...message,
        reactions: Object.values(reactionGroups),
        status,
      };
    });

    const nextCursor = hasMore
      ? paginatedMessages[paginatedMessages.length - 1].created_at
      : null;

    return {
      data: enrichedMessages,
      nextCursor,
      hasMore,
      error: null,
    };
  } catch (err) {
    console.error('[getMessages] Error:', err);
    return {
      data: [],
      nextCursor: null,
      hasMore: false,
      error: err instanceof Error ? err : new Error('Failed to fetch messages'),
    };
  }
}

/**
 * Update message status (delivered/read)
 */
export async function updateMessageStatus(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
  status: MessageStatus
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('message_status')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('message_id', messageId)
      .eq('user_id', userId);

    if (error) throw error;

    return { data: true, error: null };
  } catch (err) {
    console.error('[updateMessageStatus] Error:', err);
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to update message status'),
    };
  }
}

/**
 * Add or remove a reaction to a message
 */
export async function toggleReaction(
  supabase: SupabaseClient,
  userId: string,
  messageId: string,
  emoji: string,
  action: 'add' | 'remove'
): Promise<{ data: boolean; error: Error | null }> {
  try {
    if (action === 'add') {
      const { error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (error) throw error;
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('[toggleReaction] Error:', err);
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to toggle reaction'),
    };
  }
}

/**
 * Mark all messages in a conversation as read
 */
export async function markConversationAsRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    await supabase.rpc('mark_conversation_as_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    return { data: true, error: null };
  } catch (err) {
    console.error('[markConversationAsRead] Error:', err);
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to mark conversation as read'),
    };
  }
}

// =====================================================
// USER RELATIONSHIP OPERATIONS
// =====================================================

/**
 * Block or unblock a user
 */
export async function toggleBlockUser(
  supabase: SupabaseClient,
  userId: string,
  targetUserId: string,
  action: 'block' | 'unblock'
): Promise<{ data: boolean; error: Error | null }> {
  try {
    if (action === 'block') {
      // Add block relationship
      const { error } = await supabase.from('user_relationships').insert({
        user_id: userId,
        target_user_id: targetUserId,
        relationship_type: 'block',
      });

      if (error) throw error;

      // Optionally: Delete all conversations between users
      // This is a design decision - you may want to just hide them instead
    } else {
      // Remove block relationship
      const { error } = await supabase
        .from('user_relationships')
        .delete()
        .eq('user_id', userId)
        .eq('target_user_id', targetUserId)
        .eq('relationship_type', 'block');

      if (error) throw error;
    }

    return { data: true, error: null };
  } catch (err) {
    console.error('[toggleBlockUser] Error:', err);
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to block/unblock user'),
    };
  }
}

/**
 * Mute or unmute a conversation
 */
export async function toggleMuteConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  action: 'mute' | 'unmute'
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_muted: action === 'mute' })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;

    return { data: true, error: null };
  } catch (err) {
    console.error('[toggleMuteConversation] Error:', err);
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to mute/unmute conversation'),
    };
  }
}

/**
 * Archive or unarchive a conversation
 */
export async function toggleArchiveConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  action: 'archive' | 'unarchive'
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ is_archived: action === 'archive' })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;

    return { data: true, error: null };
  } catch (err) {
    console.error('[toggleArchiveConversation] Error:', err);
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to archive/unarchive conversation'),
    };
  }
}
