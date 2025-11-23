/**
 * Conversations API
 *
 * GET /api/conversations - List user's conversations
 * POST /api/conversations - Create new conversation (DM or group)
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';
import type { ConversationWithDetails, CreateConversationRequest } from '@/types/messaging';

/**
 * GET /api/conversations
 *
 * List all conversations for the authenticated user with:
 * - Participants
 * - Last message
 * - Unread count
 * - Typing indicators
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's conversation participations
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select(
        `
        conversation_id,
        is_muted,
        is_archived,
        last_read_at,
        conversations!inner (
          id,
          type,
          title,
          description,
          avatar_url,
          created_by,
          ai_summary,
          last_message_id,
          last_message_at,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', user.id)
      .order('conversations(last_message_at)', { ascending: false, nullsFirst: false });

    if (participationsError) {
      throw participationsError;
    }
    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationIds = participations.map(p => (p.conversations as { id: string }).id);

    // Get all participants for these conversations
    const { data: allParticipants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select(
        `
        conversation_id,
        user_id,
        is_typing,
        profiles!inner (
          id,
          username,
          display_name,
          avatar_url,
          email
        )
      `
      )
      .in('conversation_id', conversationIds);

    if (participantsError) {
      throw participantsError;
    }

    // Get last messages
    const lastMessageIds = participations
      .map(p => (p.conversations as { last_message_id?: string }).last_message_id)
      .filter(Boolean);

    let lastMessages: unknown[] = [];
    if (lastMessageIds.length > 0) {
      const { data, error: messagesError } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `
        )
        .in('id', lastMessageIds);

      if (messagesError) {
        throw messagesError;
      }
      lastMessages = data || [];
    }

    // Get unread counts
    const { data: unreadCounts } = await supabase.rpc('get_unread_count', {
      p_user_id: user.id,
    });

    // Build enriched conversations
    const conversations: ConversationWithDetails[] = participations.map(p => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conversation = p.conversations as any;
      const participants =
        allParticipants
          ?.filter(ap => ap.conversation_id === conversation.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(ap => ap.profiles as any) || [];

      const lastMessage = lastMessages.find(m => m.id === conversation.last_message_id) || null;

      const unreadData = unreadCounts?.find((uc: any) => uc.conversation_id === conversation.id);
      const unreadCount = unreadData?.unread_count || 0;

      // Check if anyone is typing
      const typingParticipants =
        allParticipants?.filter(
          ap => ap.conversation_id === conversation.id && ap.user_id !== user.id && ap.is_typing
        ) || [];

      // For DMs, identify the other user
      const otherUser =
        conversation.type === 'dm' ? participants.find(pf => pf.id !== user.id) : undefined;

      return {
        ...conversation,
        participants,
        last_message: lastMessage
          ? {
              ...lastMessage,
              reads: [],
              is_read: false,
              read_by_count: 0,
            }
          : null,
        unread_count: Number(unreadCount),
        is_muted: p.is_muted,
        is_archived: p.is_archived,
        is_typing: typingParticipants.length > 0,
        other_user: otherUser,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[GET /api/conversations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 *
 * Create new conversation (DM or group)
 *
 * For DM:
 * { participant_id: "uuid" }
 *
 * For Group:
 * { type: "group", participant_ids: ["uuid1", "uuid2"], title: "Group Name" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateConversationRequest = await request.json();
    const { type = 'dm', participant_id, participant_ids, title, description } = body;

    if (type === 'dm') {
      // Create or get DM conversation
      if (!participant_id) {
        return NextResponse.json({ error: 'participant_id required for DM' }, { status: 400 });
      }

      if (participant_id === user.id) {
        return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
      }

      // Use helper function to get or create DM
      const { data: conversationId, error: rpcError } = await supabase.rpc('get_or_create_dm', {
        user1_id: user.id,
        user2_id: participant_id,
      });

      if (rpcError) {
        throw rpcError;
      }

      // Fetch the full conversation
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return NextResponse.json({ conversation }, { status: 201 });
    }

    if (type === 'group') {
      // Create group conversation
      if (!participant_ids || participant_ids.length === 0) {
        return NextResponse.json({ error: 'participant_ids required for group' }, { status: 400 });
      }

      if (!title) {
        return NextResponse.json({ error: 'title required for group' }, { status: 400 });
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          title,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) {
        throw convError;
      }

      // Add participants (creator + invitees)
      const participants = [
        { conversation_id: conversation.id, user_id: user.id },
        ...participant_ids
          .filter(id => id !== user.id) // Don't add creator twice
          .map(id => ({
            conversation_id: conversation.id,
            user_id: id,
          })),
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) {
        throw participantsError;
      }

      return NextResponse.json({ conversation }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/conversations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
