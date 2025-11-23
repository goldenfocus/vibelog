/**
 * Message Reactions API
 *
 * POST /api/messages/[id]/reactions - Add/remove emoji reaction
 * GET /api/messages/[id]/reactions - Get all reactions for a message
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';

/**
 * GET /api/messages/[id]/reactions
 *
 * Get all reactions for a message
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();

    // Get all reactions for this message
    const { data: reactions, error } = await supabase
      .from('reactions')
      .select(
        `
        *,
        user:profiles!reactions_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq('reactable_type', 'message')
      .eq('reactable_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Group by emoji for convenient display
    const grouped = reactions.reduce(
      (acc, reaction) => {
        const emoji = reaction.emoji;
        if (!acc[emoji]) {
          acc[emoji] = {
            emoji,
            count: 0,
            users: [],
          };
        }
        acc[emoji].count++;
        acc[emoji].users.push(reaction.user);
        return acc;
      },
      {} as Record<
        string,
        {
          emoji: string;
          count: number;
          users: Array<{ id: string; username: string; display_name: string; avatar_url: string }>;
        }
      >
    );

    return NextResponse.json({
      reactions,
      grouped: Object.values(grouped),
    });
  } catch (error) {
    console.error('[GET /api/messages/[id]/reactions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/messages/[id]/reactions
 *
 * Add or remove an emoji reaction to a message
 *
 * Body:
 * {
 *   emoji: string (single emoji character, e.g. "👍", "❤️", "😂")
 *   action: "add" | "remove"
 * }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emoji, action } = body;

    // Validate emoji
    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Validate action
    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "add" or "remove"' }, { status: 400 });
    }

    // Get the message to verify it exists and get conversation_id
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Verify user is participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    if (action === 'add') {
      // Add reaction (or do nothing if already exists)
      const { data: reaction, error: insertError } = await supabase
        .from('reactions')
        .insert({
          user_id: user.id,
          reactable_type: 'message',
          reactable_id: messageId,
          emoji,
        })
        .select()
        .single();

      if (insertError) {
        // If unique constraint violation, reaction already exists
        if (insertError.code === '23505') {
          return NextResponse.json({ success: true, message: 'Reaction already exists' });
        }
        throw insertError;
      }

      return NextResponse.json({ success: true, reaction }, { status: 201 });
    } else {
      // Remove reaction
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('reactable_type', 'message')
        .eq('reactable_id', messageId)
        .eq('emoji', emoji);

      if (deleteError) {
        throw deleteError;
      }

      return NextResponse.json({ success: true, message: 'Reaction removed' });
    }
  } catch (error) {
    console.error('[POST /api/messages/[id]/reactions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
