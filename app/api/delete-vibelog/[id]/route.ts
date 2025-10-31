import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('user_id, audio_url, cover_image_url')
      .eq('id', id)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - not your vibelog' }, { status: 403 });
    }

    // TODO: Clean up storage files (audio, cover images)
    // This would require deleting from Supabase Storage buckets
    // For now, we'll just delete from database
    // Storage cleanup can be handled by a scheduled job or trigger

    // Delete vibelog
    const { error: deleteError } = await supabase.from('vibelogs').delete().eq('id', id);

    if (deleteError) {
      console.error('Failed to delete vibelog:', deleteError);
      return NextResponse.json({ error: 'Failed to delete vibelog' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Vibelog deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vibelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
