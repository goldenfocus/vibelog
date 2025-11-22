/**
 * GET /api/conversations - Get all conversations for authenticated user
 * POST /api/conversations - Create a new conversation (DM or Group)
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  createDMConversationSchema,
  createGroupConversationSchema,
} from '@/lib/messages/validation';
import {
  getUserConversations,
  getOrCreateDMConversation,
  createGroupConversation,
} from '@/lib/messages/message-service';

export async function GET(request: Request) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to view conversations' }, { status: 401 });
    }

    // 2. Get conversations using service
    const { data: conversations, error } = await getUserConversations(supabase, user.id);

    if (error) {
      console.error('[GET /api/conversations] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // 3. Return success response
    return NextResponse.json({
      conversations,
    });
  } catch (error) {
    console.error('[GET /api/conversations] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to create a conversation' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();

    // Determine if DM or Group based on payload
    const isDM = 'participantId' in body;

    if (isDM) {
      // Create or get DM conversation
      const parsed = createDMConversationSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            details: parsed.error.issues,
          },
          { status: 400 }
        );
      }

      const { participantId } = parsed.data;

      // Prevent creating DM with self
      if (participantId === user.id) {
        return NextResponse.json({ error: 'Cannot create DM with yourself' }, { status: 400 });
      }

      const { data: conversation, error } = await getOrCreateDMConversation(
        supabase,
        user.id,
        participantId
      );

      if (error) {
        console.error('[POST /api/conversations] DM Error:', error);

        if (error.message.includes('blocked')) {
          return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      return NextResponse.json({ conversation }, { status: 201 });
    } else {
      // Create group conversation
      const parsed = createGroupConversationSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            details: parsed.error.issues,
          },
          { status: 400 }
        );
      }

      const { participantIds, title } = parsed.data;

      // Prevent including self in participant list (will be added automatically)
      const filteredParticipants = participantIds.filter((id) => id !== user.id);

      const { data: conversation, error } = await createGroupConversation(
        supabase,
        user.id,
        filteredParticipants,
        title
      );

      if (error) {
        console.error('[POST /api/conversations] Group Error:', error);
        return NextResponse.json({ error: 'Failed to create group conversation' }, { status: 500 });
      }

      return NextResponse.json({ conversation }, { status: 201 });
    }
  } catch (error) {
    console.error('[POST /api/conversations] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
