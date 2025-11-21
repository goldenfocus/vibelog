import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    const adminSupabase = await createServerAdminClient();

    // If specific conversation requested, return its messages
    if (conversationId) {
      const { data: messages, error } = await adminSupabase
        .from('vibe_brain_messages')
        .select('role, content, sources, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // Verify conversation belongs to user
      const { data: conv } = await adminSupabase
        .from('vibe_brain_conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      if (!conv || conv.user_id !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      if (error) {
        console.error('[VIBE BRAIN] Failed to fetch messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      return NextResponse.json({ messages });
    }

    // Otherwise return user's conversation list
    const { data: conversations, error } = await adminSupabase
      .from('vibe_brain_conversations')
      .select('id, title, message_count, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[VIBE BRAIN] Failed to fetch conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Get first message of each conversation for preview
    const conversationsWithPreview = await Promise.all(
      (conversations || []).map(async conv => {
        const { data: firstMessage } = await adminSupabase
          .from('vibe_brain_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('role', 'user')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        return {
          id: conv.id,
          title: conv.title || firstMessage?.content?.slice(0, 50) || 'New conversation',
          messageCount: conv.message_count,
          updatedAt: conv.updated_at,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithPreview });
  } catch (error) {
    console.error('[VIBE BRAIN] Conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
