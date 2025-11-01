import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

// Helper function to wait for database trigger to complete with retry mechanism
const waitForTrigger = async (
  supabase: any,
  vibelogId: string,
  expectedCount: number,
  maxRetries = 5
): Promise<number> => {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms

    const { data } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    if (data && data.like_count === expectedCount) {
      console.log(`Trigger completed after ${(i + 1) * 100}ms`);
      return data.like_count;
    }
  }

  console.warn(`Trigger timeout after ${maxRetries * 100}ms, using fallback count`);
  return expectedCount; // Fallback to expected count
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vibelogId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get vibelog with like count
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    if (vibelogError || !vibelog) {
      console.error('Error fetching vibelog for like status:', vibelogError);
      return NextResponse.json({ isLiked: false, like_count: 0 }, { status: 200 });
    }

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
      console.warn('Like attempt without authentication:', vibelogId);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Like attempt:', { userId: user.id, vibelogId });

    // Verify vibelog exists
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('id, like_count')
      .eq('id', vibelogId)
      .maybeSingle();

    if (vibelogError || !vibelog) {
      console.error('Vibelog not found for like:', { vibelogId, error: vibelogError });
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
        console.log('Race condition detected, like already exists:', {
          userId: user.id,
          vibelogId,
        });
        return NextResponse.json({
          success: true,
          liked: true,
          like_count: vibelog.like_count + 1,
          message: 'Already liked',
        });
      }

      console.error('Failed to like vibelog:', {
        userId: user.id,
        vibelogId,
        error: likeError,
        code: likeError.code,
        message: likeError.message,
      });
      return NextResponse.json(
        { error: 'Failed to like vibelog', details: likeError.message },
        { status: 500 }
      );
    }

    console.log('Like successfully inserted:', { userId: user.id, vibelogId });

    // Wait for database trigger to update like_count with retry mechanism
    const expectedCount = vibelog.like_count + 1;
    const finalCount = await waitForTrigger(supabase, vibelogId, expectedCount);

    return NextResponse.json({
      success: true,
      liked: true,
      like_count: finalCount,
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

    // Wait for database trigger to update like_count with retry mechanism
    const expectedCount = Math.max(0, vibelog.like_count - 1);
    const finalCount = await waitForTrigger(supabase, vibelogId, expectedCount);

    return NextResponse.json({
      success: true,
      liked: false,
      like_count: finalCount,
    });
  } catch (error) {
    console.error('Error unliking vibelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
