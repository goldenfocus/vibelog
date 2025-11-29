/**
 * Vibelog Status API
 * GET /api/vibelog/[id]/status
 * Returns the current processing status of a vibelog for polling
 */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vibelogId } = await params;

    if (!vibelogId) {
      return NextResponse.json({ error: 'Vibelog ID required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get current user (optional - for future permission check)
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Fetch vibelog status
    const { data: vibelog, error } = await supabase
      .from('vibelogs')
      .select(
        'id, title, content, teaser, public_slug, is_published, video_url, cover_image_url, created_at'
      )
      .eq('id', vibelogId)
      .single();

    if (error || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Determine processing state
    const isProcessing =
      !vibelog.title ||
      vibelog.title === 'Video vibelog' ||
      vibelog.title.includes('processing') ||
      !vibelog.content ||
      vibelog.content.includes('processing');

    const isComplete = !isProcessing && vibelog.is_published;

    return NextResponse.json({
      id: vibelog.id,
      title: vibelog.title,
      content: vibelog.content,
      teaser: vibelog.teaser,
      public_slug: vibelog.public_slug,
      is_published: vibelog.is_published,
      video_url: vibelog.video_url,
      cover_image_url: vibelog.cover_image_url,
      created_at: vibelog.created_at,
      // Processing status indicators
      is_processing: isProcessing,
      is_complete: isComplete,
    });
  } catch (error) {
    console.error('[vibelog-status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
