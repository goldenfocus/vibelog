/**
 * DM Conversation by Username API
 *
 * GET /api/conversations/dm/[username] - Get or create DM with user by username
 *
 * Returns the conversation details, creating a new DM if one doesn't exist.
 * This enables human-friendly URLs like /messages/@username
 */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Strip @ prefix if present (allows both @username and username)
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

    // Look up the target user by username
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('username', cleanUsername)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Can't message yourself
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    // Get or create DM conversation
    const { data: conversationId, error: rpcError } = await supabase.rpc('get_or_create_dm', {
      user1_id: user.id,
      user2_id: targetUser.id,
    });

    if (rpcError) {
      console.error('[API] get_or_create_dm error:', rpcError);
      return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 });
    }

    // Fetch full conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('[API] fetch conversation error:', convError);
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        other_user: targetUser,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/conversations/dm/[username] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
