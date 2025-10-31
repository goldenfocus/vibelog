import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(
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
      return NextResponse.json({ isLiked: false });
    }

    // Check if user has liked this vibelog
    const { data: like } = await supabase
      .from('vibelog_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('vibelog_id', vibelogId)
      .single();

    return NextResponse.json({
      isLiked: !!like,
    });
  } catch {
    return NextResponse.json({ isLiked: false });
  }
}

export async function POST(
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

    // Verify vibelog exists
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('id')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('vibelog_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('vibelog_id', vibelogId)
      .single();

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 });
    }

    // Insert like
    const { error: likeError } = await supabase.from('vibelog_likes').insert({
      user_id: user.id,
      vibelog_id: vibelogId,
    });

    if (likeError) {
      console.error('Failed to like vibelog:', likeError);
      return NextResponse.json(
        { error: 'Failed to like vibelog' },
        { status: 500 }
      );
    }

    // Get updated like_count
    const { data: updatedVibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .single();

    return NextResponse.json({
      success: true,
      liked: true,
      like_count: updatedVibelog?.like_count || 0,
    });
  } catch (error) {
    console.error('Error liking vibelog:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    // Delete like
    const { error: deleteError } = await supabase
      .from('vibelog_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('vibelog_id', vibelogId);

    if (deleteError) {
      console.error('Failed to unlike vibelog:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unlike vibelog' },
        { status: 500 }
      );
    }

    // Get updated like_count
    const { data: updatedVibelog } = await supabase
      .from('vibelogs')
      .select('like_count')
      .eq('id', vibelogId)
      .single();

    return NextResponse.json({
      success: true,
      liked: false,
      like_count: updatedVibelog?.like_count || 0,
    });
  } catch (error) {
    console.error('Error unliking vibelog:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

