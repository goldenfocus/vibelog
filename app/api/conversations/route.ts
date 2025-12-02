/**
 * Conversations API
 *
 * GET /api/conversations - List user's conversations
 * POST /api/conversations - Create new conversation (DM or group)
 */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import type {
  ConversationWithDetails,
  CreateConversationRequest,
  ConversationType,
} from '@/types/messaging';

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
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear stale typing indicators (older than 5 seconds)
    // This is the server-side cleanup for stuck "typing..." indicators
    await supabase.rpc('clear_stale_typing_indicators');

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

    const conversationIds = participations.map(
      p => (p.conversations as unknown as { id: string }).id
    );

    // Get all participants for these conversations
    const { data: allParticipantsRaw, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, is_typing, typing_updated_at')
      .in('conversation_id', conversationIds);

    if (participantsError) {
      throw participantsError;
    }

    // Get all participant user IDs and fetch their profiles separately
    const participantUserIds = [...new Set(allParticipantsRaw?.map(p => p.user_id) || [])];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, email')
      .in('id', participantUserIds);

    if (profilesError) {
      throw profilesError;
    }

    // Create a map for quick profile lookup
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Combine participants with their profiles
    const allParticipants =
      allParticipantsRaw?.map(p => ({
        ...p,
        profiles: profilesMap.get(p.user_id) || null,
      })) || [];

    // Get last messages - fetch by last_message_id OR get the latest message for each conversation
    const conversationIdsWithoutLastMessage: string[] = [];
    const lastMessageIds: string[] = [];

    participations.forEach(p => {
      const conv = p.conversations as unknown as { id: string; last_message_id?: string };
      if (conv.last_message_id) {
        lastMessageIds.push(conv.last_message_id);
      } else {
        conversationIdsWithoutLastMessage.push(conv.id);
      }
    });

    let lastMessages: Array<{
      id: string;
      sender?: Profile | null;
      conversation_id?: string;
      [key: string]: any;
    }> = [];

    // Fetch messages by last_message_id
    if (lastMessageIds.length > 0) {
      const { data: messagesRaw, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('id', lastMessageIds);

      if (messagesError) {
        throw messagesError;
      }

      lastMessages = messagesRaw || [];
    }

    // For conversations without last_message_id, fetch the most recent message directly
    // This handles cases where messages exist but the trigger didn't update last_message_id
    if (conversationIdsWithoutLastMessage.length > 0) {
      for (const convId of conversationIdsWithoutLastMessage) {
        const { data: latestMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestMessage) {
          lastMessages.push(latestMessage);
        }
      }
    }

    // Get sender profiles separately
    const senderIds = [...new Set(lastMessages.map(m => m.sender_id).filter(Boolean))];
    let sendersMap = new Map<string, Profile>();
    if (senderIds.length > 0) {
      const { data: sendersData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', senderIds);
      sendersMap = new Map(sendersData?.map(s => [s.id, s as Profile]) || []);
    }

    // Enrich messages with sender profiles
    lastMessages = lastMessages.map(m => ({
      ...m,
      sender: m.sender_id ? sendersMap.get(m.sender_id) || null : null,
    }));

    // Get unread counts
    const { data: unreadCounts } = await supabase.rpc('get_unread_count', {
      p_user_id: user.id,
    });

    // Build enriched conversations
    const conversations: ConversationWithDetails[] = participations.map(p => {
      const conversation = p.conversations as unknown as {
        id: string;
        type: ConversationType;
        title: string | null;
        description: string | null;
        avatar_url: string | null;
        created_by: string | null;
        ai_summary: string | null;
        last_message_id: string | null;
        last_message_at: string | null;
        created_at: string;
        updated_at: string;
      };
      const participants =
        allParticipants
          ?.filter(ap => ap.conversation_id === conversation.id)
          .map(ap => ap.profiles as unknown as Profile) || [];

      // Find last message by ID or by conversation_id (for conversations without last_message_id)
      const lastMessage =
        lastMessages.find(m => m.id === conversation.last_message_id) ||
        lastMessages.find(m => m.conversation_id === conversation.id) ||
        null;

      const unreadData = unreadCounts?.find((uc: any) => uc.conversation_id === conversation.id);
      const unreadCount = unreadData?.unread_count || 0;

      // Check if anyone is typing (filter out stale indicators > 10 seconds old)
      const typingParticipants =
        allParticipants?.filter(ap => {
          if (ap.conversation_id !== conversation.id || ap.user_id === user.id || !ap.is_typing) {
            return false;
          }
          // Filter out stale typing indicators
          if (ap.typing_updated_at) {
            const isStale = Date.now() - new Date(ap.typing_updated_at).getTime() > 10000;
            if (isStale) {
              return false;
            }
          }
          return true;
        }) || [];

      // For DMs, identify the other user
      const otherUser =
        conversation.type === 'dm' ? participants.find(pf => pf.id !== user.id) : undefined;

      return {
        ...conversation,
        participants,
        last_message: lastMessage
          ? ({
              ...(lastMessage as any),
              reads: [],
              is_read: false,
              read_by_count: 0,
            } as any)
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
    console.error('[API] GET /api/conversations error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
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
    const supabase = await createServerSupabaseClient();
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
        return NextResponse.json({ error: `Database error: ${rpcError.message}` }, { status: 500 });
      }

      // Fetch the full conversation
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError) {
        return NextResponse.json(
          { error: `Failed to fetch conversation: ${fetchError.message}` },
          { status: 500 }
        );
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
    console.error('[API] POST /api/conversations error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
