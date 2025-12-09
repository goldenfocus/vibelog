import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/conversations/[id]/mark-notifications-read
 *
 * Marks all vibe_thread_message notifications for a specific conversation as read.
 * Called when a user opens a conversation to clear the notification badge instantly.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark all unread vibe_thread_message notifications for this conversation as read
    // The action_url format is '/messages/{conversationId}'
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('type', 'vibe_thread_message')
      .eq('is_read', false)
      .eq('action_url', `/messages/${conversationId}`)
      .select('id');

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      markedCount: data?.length || 0,
    });
  } catch (error) {
    console.error('Error in POST /api/conversations/[id]/mark-notifications-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
