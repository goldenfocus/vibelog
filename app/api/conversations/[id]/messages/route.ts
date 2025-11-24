/**
 * Messages API
 *
 * GET /api/conversations/[id]/messages - Get messages (paginated)
 * POST /api/conversations/[id]/messages - Send new message
 */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { SendMessageRequest, GetMessagesResponse } from '@/types/messaging';

/**
 * GET /api/conversations/[id]/messages
 *
 * Fetch messages with cursor-based pagination
 * Query params:
 * - limit: number (default 50, max 100)
 * - cursor: ISO timestamp (for pagination)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    console.log('[GET /api/conversations/[id]/messages] Creating supabase client...');
    const supabase = await createServerSupabaseClient();
    console.log('[GET /api/conversations/[id]/messages] Getting user...');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log('[GET /api/conversations/[id]/messages] User:', user?.id || 'none');

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const cursor = searchParams.get('cursor'); // ISO timestamp

    // Build query
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
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      throw messagesError;
    }

    const hasMore = messages.length > limit;
    const paginatedMessages = messages.slice(0, limit);
    const nextCursor = hasMore ? paginatedMessages[paginatedMessages.length - 1].created_at : null;

    // Get read receipts for these messages
    const messageIds = paginatedMessages.map(m => m.id);
    const { data: reads } = await supabase
      .from('message_reads')
      .select('*')
      .in('message_id', messageIds);

    // Enrich messages with reads
    const enrichedMessages = paginatedMessages.map(message => {
      const messageReads = reads?.filter(r => r.message_id === message.id) || [];
      const userRead = messageReads.find(r => r.user_id === user.id);

      return {
        ...message,
        reads: messageReads,
        is_read: !!userRead,
        read_by_count: messageReads.length,
      };
    });

    // Reverse to show oldest first (for chat display)
    const response: GetMessagesResponse = {
      messages: enrichedMessages.reverse(),
      nextCursor,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/conversations/[id]/messages] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[GET /api/conversations/[id]/messages] Error details:', {
      errorMessage,
      errorStack,
    });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/messages
 *
 * Send a new message
 *
 * Body:
 * {
 *   content?: string,
 *   audio_url?: string,
 *   audio_duration?: number,
 *   video_url?: string,
 *   attachments?: MediaAttachment[],
 *   reply_to_message_id?: string
 * }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const body: SendMessageRequest = await request.json();
    const { content, audio_url, audio_duration, video_url, attachments, reply_to_message_id } =
      body;

    // Validate: at least one content type required
    if (!content && !audio_url && !video_url && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        audio_url,
        audio_duration,
        video_url,
        attachments: attachments || [],
        reply_to_message_id,
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

    if (insertError) {
      throw insertError;
    }

    // If voice message, trigger transcription asynchronously
    if (audio_url && !message.transcript) {
      // Fire-and-forget transcription
      fetch(`${request.nextUrl.origin}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url,
          message_id: message.id,
        }),
      }).catch(err => console.error('Transcription trigger failed:', err));
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/conversations/[id]/messages] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
