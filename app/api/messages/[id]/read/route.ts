/**
 * Message Read Receipt API
 *
 * POST /api/messages/[id]/read - Mark message as read
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';

/**
 * POST /api/messages/[id]/read
 *
 * Mark a message as read for the current user.
 * Creates a read receipt in the message_reads table.
 * Also updates conversation_participants.last_read_message_id
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

    // Get the message to verify it exists and get conversation_id
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, created_at')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Prevent sender from marking their own messages as read
    // This would incorrectly inflate read_by_count
    if (message.sender_id === user.id) {
      return NextResponse.json({ success: true }); // Silent success, no-op
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

    // Insert read receipt (upsert to prevent duplicates)
    const { error: readError } = await supabase.from('message_reads').upsert(
      {
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: 'message_id,user_id',
      }
    );

    if (readError) {
      throw readError;
    }

    // Update conversation_participants.last_read_at
    // The trigger on message_reads will handle updating last_read_message_id
    // Note: mark_conversation_read function only takes conversation_id and user_id
    await supabase.rpc('mark_conversation_read', {
      p_conversation_id: message.conversation_id,
      p_user_id: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/messages/[id]/read] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
