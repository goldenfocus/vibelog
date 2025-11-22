/**
 * GET /api/messages
 *
 * Get messages for a conversation with pagination
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getMessagesSchema } from '@/lib/messages/validation';
import { getMessages } from '@/lib/messages/message-service';

export async function GET(request: Request) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to view messages' }, { status: 401 });
    }

    // 2. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      conversationId: searchParams.get('conversationId'),
      limit: searchParams.get('limit'),
      cursor: searchParams.get('cursor'),
      parentMessageId: searchParams.get('parentMessageId'),
    };

    const parsed = getMessagesSchema.safeParse(queryParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { conversationId, limit, cursor, parentMessageId } = parsed.data;

    // 3. Get messages using service
    const { data: messages, nextCursor, hasMore, error } = await getMessages(
      supabase,
      user.id,
      conversationId,
      {
        limit,
        cursor,
        parentMessageId,
      }
    );

    if (error) {
      console.error('[GET /api/messages] Error:', error);

      if (error.message.includes('Not a participant')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // 4. Return success response
    return NextResponse.json({
      messages,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('[GET /api/messages] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
