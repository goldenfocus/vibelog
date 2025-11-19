/**
 * Universal Reactions API
 *
 * Endpoints:
 * - POST   /api/reactions       - Add a reaction
 * - DELETE /api/reactions       - Remove a reaction
 * - GET    /api/reactions       - Get reactions for content
 */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ReactableType, AddReactionRequest, RemoveReactionRequest } from '@/types/reactions';

// ============================================================================
// POST - Add Reaction
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AddReactionRequest = await request.json();
    const { reactableType, reactableId, emoji } = body;

    // Validate input
    if (!reactableType || !reactableId || !emoji) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert reaction
    const { data, error } = await supabase
      .from('reactions')
      .insert({
        reactable_type: reactableType,
        reactable_id: reactableId,
        user_id: user.id,
        emoji,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate reaction (already exists)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Reaction already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Remove Reaction
// ============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RemoveReactionRequest = await request.json();
    const { reactableType, reactableId, emoji } = body;

    // Validate input
    if (!reactableType || !reactableId || !emoji) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Delete reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('reactable_type', reactableType)
      .eq('reactable_id', reactableId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  }
}

// ============================================================================
// GET - Get Reactions for Content
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;

    const reactableType = searchParams.get('type') as ReactableType;
    const reactableId = searchParams.get('id');

    // Validate input
    if (!reactableType || !reactableId) {
      return NextResponse.json({ error: 'Missing type or id parameter' }, { status: 400 });
    }

    // Get current user (optional, for checking user_reacted)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch reactions summary
    const { data, error } = await supabase
      .from('reactions_summary')
      .select('*')
      .eq('reactable_type', reactableType)
      .eq('reactable_id', reactableId);

    if (error) {
      throw error;
    }

    // Transform to response format
    const reactions = (data || []).map(r => ({
      emoji: r.emoji,
      count: r.count,
      user_ids: r.user_ids || [],
      user_reacted: user ? (r.user_ids || []).includes(user.id) : false,
    }));

    const userReactions = user ? reactions.filter(r => r.user_reacted).map(r => r.emoji) : [];

    const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      reactions,
      total_count: totalCount,
      user_reactions: userReactions,
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}
