/**
 * POST /api/messages/[id]/reactions
 *
 * Add or remove emoji reaction on a message
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { toggleReactionSchema } from '@/lib/messages/validation';
import { toggleReaction } from '@/lib/messages/message-service';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to react to messages' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = toggleReactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { emoji, action } = parsed.data;
    const messageId = params.id;

    // 3. Toggle reaction using service
    const { data: success, error } = await toggleReaction(supabase, user.id, messageId, emoji, action);

    if (error) {
      console.error('[POST /api/messages/[id]/reactions] Error:', error);
      return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
    }

    // 4. Return success response
    return NextResponse.json({
      success,
      action,
      emoji,
    });
  } catch (error) {
    console.error('[POST /api/messages/[id]/reactions] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
