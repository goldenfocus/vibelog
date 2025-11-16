/**
 * Cleanup Stuck Video Generation API Route
 * POST /api/video/cleanup-stuck
 * Auto-reset vibelogs stuck in 'generating' status for more than 10 minutes
 * This should be called periodically (e.g., via cron job or manual trigger)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(_request: NextRequest) {
  try {
    console.log('[Cleanup Stuck] Running cleanup job...');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find all vibelogs stuck in generating for more than 10 minutes
    // Calculate 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuck, error: findError } = await supabase
      .from('vibelogs')
      .select('id, title, video_generation_status, updated_at')
      .eq('video_generation_status', 'generating')
      .lt('updated_at', tenMinutesAgo);

    if (findError) {
      console.error('[Cleanup Stuck] Error finding stuck videos:', findError);
      return NextResponse.json(
        { success: false, error: 'Failed to find stuck videos' },
        { status: 500 }
      );
    }

    if (!stuck || stuck.length === 0) {
      console.log('[Cleanup Stuck] No stuck videos found (all recent or none stuck)');
      return NextResponse.json({
        success: true,
        message: 'No stuck videos found',
        count: 0,
      });
    }

    console.log(`[Cleanup Stuck] Found ${stuck.length} stuck video(s) older than 10 minutes`);

    // Reset all to failed (with a timeout error message)
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        video_generation_status: 'failed',
        video_generation_error: 'Video generation timed out and was auto-reset by cleanup job',
      })
      .eq('video_generation_status', 'generating')
      .lt('updated_at', tenMinutesAgo);

    if (updateError) {
      console.error('[Cleanup Stuck] Error resetting statuses:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to reset statuses' },
        { status: 500 }
      );
    }

    console.log(`[Cleanup Stuck] Reset ${stuck.length} stuck video status(es) to failed`);

    return NextResponse.json({
      success: true,
      message: `Reset ${stuck.length} stuck video(s) to failed`,
      count: stuck.length,
      videos: stuck.map(v => ({ id: v.id, title: v.title, stuckSince: v.updated_at })),
    });
  } catch (error: unknown) {
    console.error('[Cleanup Stuck] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
