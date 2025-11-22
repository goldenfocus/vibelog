/**
 * POST /api/conversations/[id]/mute
 *
 * Mute or unmute a conversation
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { muteConversationSchema } from '@/lib/messages/validation';
import { toggleMuteConversation } from '@/lib/messages/message-service';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = muteConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { action } = parsed.data;
    const conversationId = params.id;

    // 3. Toggle mute using service
    const { data: success, error } = await toggleMuteConversation(
      supabase,
      user.id,
      conversationId,
      action
    );

    if (error) {
      console.error('[POST /api/conversations/[id]/mute] Error:', error);
      return NextResponse.json({ error: 'Failed to mute/unmute conversation' }, { status: 500 });
    }

    // 4. Return success response
    return NextResponse.json({
      success,
      isMuted: action === 'mute',
    });
  } catch (error) {
    console.error('[POST /api/conversations/[id]/mute] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
