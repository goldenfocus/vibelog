/**
 * Video Generation Status API Route
 * GET /api/video/status?vibelogId=xxx
 * Check the status of video generation for a vibelog
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vibelogId = searchParams.get('vibelogId');

    if (!vibelogId) {
      return NextResponse.json(
        { success: false, error: 'vibelogId is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch video generation status
    const { data: vibelog, error } = await supabase
      .from('vibelogs')
      .select('video_generation_status, video_generation_error, video_url, video_duration, video_width, video_height')
      .eq('id', vibelogId)
      .single();

    if (error || !vibelog) {
      return NextResponse.json(
        { success: false, error: 'Vibelog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: vibelog.video_generation_status || 'not_started',
        error: vibelog.video_generation_error,
        videoUrl: vibelog.video_url,
        duration: vibelog.video_duration,
        width: vibelog.video_width,
        height: vibelog.video_height,
      },
    });
  } catch (error: any) {
    console.error('[Video Status API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch video status',
      },
      { status: 500 }
    );
  }
}
