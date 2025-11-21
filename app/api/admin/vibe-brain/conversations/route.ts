import { NextRequest, NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const conversationId = searchParams.get('conversationId');

    const adminSupabase = await createServerAdminClient();

    // If specific conversation requested, return its messages
    if (conversationId) {
      const { data: messages, error } = await adminSupabase
        .from('vibe_brain_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ADMIN] Failed to fetch messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      return NextResponse.json({ messages });
    }

    // Otherwise return conversation list
    const { data, error, count } = await adminSupabase
      .from('vibe_brain_conversations')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[ADMIN] Failed to fetch conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Get user info for each conversation
    const userIds = [...new Set(data?.map(c => c.user_id) || [])];
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const conversationsWithUsers = data?.map(conv => ({
      ...conv,
      user: profileMap.get(conv.user_id) || { username: 'Unknown' },
    }));

    return NextResponse.json({
      conversations: conversationsWithUsers,
      total: count,
    });
  } catch (error) {
    console.error('[ADMIN] Conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
