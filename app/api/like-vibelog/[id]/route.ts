import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

// Helper function to wait for database trigger to complete
const waitForTrigger = () => new Promise(resolve => setTimeout(resolve, 100));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vibelogId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get vibelog with like count
    const { data: vibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .single();

    if (!user) {
      return NextResponse.json({
        isLiked: false,
        like_count: vibelog?.like_count || 0,
      });
    }

    // Check if user has liked this vibelog (use maybeSingle to avoid error on empty result)
    const { data: like } = await supabase
      .from('vibelog_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('vibelog_id', vibelogId)
      .maybeSingle();

    return NextResponse.json({
      isLiked: !!like,
      like_count: vibelog?.like_count || 0,
    });
  } catch (error) {
    console.error('Error getting like status:', error);
    return NextResponse.json(
      { isLiked: false, like_count: 0 },
      { status: 200 } // Return 200 with safe defaults instead of error
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vibelogId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify vibelog exists
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('id, like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if already liked (use maybeSingle to handle empty results gracefully)
    const { data: existingLike } = await supabase
      .from('vibelog_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('vibelog_id', vibelogId)
      .maybeSingle();

    if (existingLike) {
      // Already liked - return current state (idempotent)
      return NextResponse.json({
        success: true,
        liked: true,
        like_count: vibelog.like_count,
        message: 'Already liked',
      });
    }

    // Insert like
    const { error: likeError } = await supabase.from('vibelog_likes').insert({
      user_id: user.id,
      vibelog_id: vibelogId,
    });

    if (likeError) {
      // Check if it's a unique constraint violation (race condition)
      if (likeError.code === '23505') {
        // Unique violation - already liked, return success
        return NextResponse.json({
          success: true,
          liked: true,
          like_count: vibelog.like_count + 1,
          message: 'Already liked',
        });
      }

      console.error('Failed to like vibelog:', likeError);
      return NextResponse.json(
        { error: 'Failed to like vibelog', details: likeError.message },
        { status: 500 }
      );
    }

    // Wait for database trigger to update like_count
    await waitForTrigger();

    // Get updated like_count after trigger
    const { data: updatedVibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      liked: true,
      like_count: updatedVibelog?.like_count || vibelog.like_count + 1,
    });
  } catch (error) {
    console.error('Error liking vibelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vibelogId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current vibelog state before deletion
    const { data: vibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    if (!vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Delete like (idempotent - returns success even if nothing to delete)
    const { error: deleteError, count } = await supabase
      .from('vibelog_likes')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('vibelog_id', vibelogId);

    if (deleteError) {
      console.error('Failed to unlike vibelog:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unlike vibelog', details: deleteError.message },
        { status: 500 }
      );
    }

    // If nothing was deleted, return current state (already unliked)
    if (count === 0) {
      return NextResponse.json({
        success: true,
        liked: false,
        like_count: vibelog.like_count,
        message: 'Already unliked',
      });
    }

    // Wait for database trigger to update like_count
    await waitForTrigger();

    // Get updated like_count after trigger
    const { data: updatedVibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      liked: false,
      like_count: updatedVibelog?.like_count || Math.max(0, vibelog.like_count - 1),
    });
  } catch (error) {
    console.error('Error unliking vibelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
