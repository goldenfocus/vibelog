/**
 * Reset Stuck Video Generation API Route
 * POST /api/video/reset-stuck
 * Reset all vibelogs stuck in 'generating' status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('[Reset Stuck] Resetting stuck video generation statuses...');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find all vibelogs stuck in generating
    const { data: stuck, error: findError } = await supabase
      .from('vibelogs')
      .select('id, title, video_generation_status')
      .eq('video_generation_status', 'generating');

    if (findError) {
      console.error('[Reset Stuck] Error finding stuck videos:', findError);
      return NextResponse.json(
        { success: false, error: 'Failed to find stuck videos' },
        { status: 500 }
      );
    }

    if (!stuck || stuck.length === 0) {
      console.log('[Reset Stuck] No stuck videos found');
      return NextResponse.json({
        success: true,
        message: 'No stuck videos found',
        count: 0,
      });
    }

    console.log(`[Reset Stuck] Found ${stuck.length} stuck video(s)`);

    // Reset all to null
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        video_generation_status: null,
        video_generation_error: null,
      })
      .eq('video_generation_status', 'generating');

    if (updateError) {
      console.error('[Reset Stuck] Error resetting statuses:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to reset statuses' },
        { status: 500 }
      );
    }

    console.log(`[Reset Stuck] Reset ${stuck.length} video generation status(es)`);

    return NextResponse.json({
      success: true,
      message: `Reset ${stuck.length} stuck video(s)`,
      count: stuck.length,
      videos: stuck.map(v => ({ id: v.id, title: v.title })),
    });
  } catch (error: unknown) {
    console.error('[Reset Stuck] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
