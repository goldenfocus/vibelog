import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vibelogId, title, content, teaser, coverImage } = body;

    if (!vibelogId) {
      return NextResponse.json({ error: 'Vibelog ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select(
        'user_id, title, content, teaser, cover_image_url, cover_image_alt, cover_image_width, cover_image_height'
      )
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - not your vibelog' }, { status: 403 });
    }

    // Build update object
    const updates: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (content !== undefined) {
      updates.content = content;
      // Recalculate word count and read time
      const wordCount = content.trim().split(/\s+/).length;
      updates.word_count = wordCount;
      updates.read_time = Math.max(1, Math.ceil(wordCount / 200));
    }

    if (teaser !== undefined) {
      updates.teaser = teaser;
    }

    if (coverImage) {
      updates.cover_image_url = coverImage.url;
      updates.cover_image_alt = coverImage.alt || null;
      updates.cover_image_width = coverImage.width || null;
      updates.cover_image_height = coverImage.height || null;
    }

    // Update vibelog
    const { data: updated, error: updateError } = await supabase
      .from('vibelogs')
      .update(updates)
      .eq('id', vibelogId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update vibelog:', updateError);
      return NextResponse.json({ error: 'Failed to update vibelog' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vibelog: updated,
    });
  } catch (error) {
    console.error('Error updating vibelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
