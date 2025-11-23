/**
 * Follows API
 *
 * POST /api/follows - Follow a user
 * GET /api/follows - Get following/followers list
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';

/**
 * GET /api/follows
 *
 * Get following/followers list for a user
 * Query params:
 * - user_id: string (optional, defaults to current user)
 * - type: "following" | "followers"
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const type = searchParams.get('type') || 'following';

    if (!['following', 'followers'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "following" or "followers"' },
        { status: 400 }
      );
    }

    if (type === 'following') {
      // Get users that this user follows
      const { data: follows, error } = await supabase
        .from('follows')
        .select(
          `
          following_id,
          created_at,
          following:profiles!follows_following_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            follower_count,
            following_count
          )
        `
        )
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        users: follows.map(f => f.following),
        total: follows.length,
      });
    } else {
      // Get users that follow this user
      const { data: followers, error } = await supabase
        .from('follows')
        .select(
          `
          follower_id,
          created_at,
          follower:profiles!follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            follower_count,
            following_count
          )
        `
        )
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({
        users: followers.map(f => f.follower),
        total: followers.length,
      });
    }
  } catch (error) {
    console.error('[GET /api/follows] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/follows
 *
 * Follow a user
 *
 * Body:
 * {
 *   user_id: string (user to follow)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id: followingId } = body;

    if (!followingId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Can't follow yourself
    if (followingId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', followingId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Insert follow (database trigger will update denormalized counts)
    const { data: follow, error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: followingId,
      })
      .select()
      .single();

    if (followError) {
      // If unique constraint violation, already following
      if (followError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already following' });
      }
      throw followError;
    }

    // Create notification for the followed user
    await supabase.from('notifications').insert({
      user_id: followingId,
      type: 'follow',
      actor_id: user.id,
      title: 'New Follower',
      message: `${user.user_metadata?.display_name || user.email} started following you`,
      action_url: `/${user.user_metadata?.username || user.id}`,
    });

    return NextResponse.json({ success: true, follow }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/follows] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/follows
 *
 * Unfollow a user
 *
 * Body:
 * {
 *   user_id: string (user to unfollow)
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id: followingId } = body;

    if (!followingId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Delete follow (database trigger will update denormalized counts)
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('[DELETE /api/follows] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
