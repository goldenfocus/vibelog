import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vibelogId } = await req.json();

    if (!vibelogId) {
      return NextResponse.json({ error: 'Vibelog ID is required' }, { status: 400 });
    }

    // Verify the vibelog belongs to the user
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('user_id, is_published')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (vibelog.is_published) {
      return NextResponse.json({ error: 'Vibelog is already published' }, { status: 400 });
    }

    // Publish the vibelog
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', vibelogId);

    if (updateError) {
      console.error('[PUBLISH] Failed to publish vibelog:', updateError);
      return NextResponse.json({ error: 'Failed to publish vibelog' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Vibelog published successfully',
    });
  } catch (error) {
    console.error('[PUBLISH] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
