/**
 * POST /api/messages/send
 *
 * Send a message in a conversation
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendMessageSchema } from '@/lib/messages/validation';
import { sendMessage } from '@/lib/messages/message-service';

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to send messages' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { conversationId, content, contentType, parentMessageId, attachments, metadata } =
      parsed.data;

    // 3. Send message using service
    const { data: message, error } = await sendMessage(supabase, user.id, conversationId, content, {
      contentType,
      parentMessageId,
      attachments,
      metadata,
    });

    if (error) {
      console.error('[POST /api/messages/send] Error:', error);

      // Handle specific error cases
      if (error.message.includes('Not a participant')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // 4. Return success response
    return NextResponse.json(
      {
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/messages/send] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
