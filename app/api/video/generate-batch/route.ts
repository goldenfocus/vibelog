/**
 * Batch Video Generation API Route
 * POST /api/video/generate-batch
 * Generate videos for user's recent vibelogs that don't have videos yet
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('[Batch Video] Starting batch video generation...');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`[Batch Video] Fetching last ${limit} vibelogs for user:`, userId);

    // Fetch user's recent vibelogs
    const { data: vibelogs, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, title, content, teaser, cover_image_url, video_url, video_generation_status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('[Batch Video] Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vibelogs' },
        { status: 500 }
      );
    }

    if (!vibelogs || vibelogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vibelogs found',
        results: [],
      });
    }

    console.log(`[Batch Video] Found ${vibelogs.length} vibelogs`);

    // Filter vibelogs that need video generation
    const needsVideo = vibelogs.filter(
      v =>
        !v.video_url &&
        v.video_generation_status !== 'generating' &&
        v.video_generation_status !== 'completed'
    );

    console.log(`[Batch Video] ${needsVideo.length} vibelogs need videos`);

    if (needsVideo.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All vibelogs already have videos',
        results: [],
      });
    }

    // Generate videos sequentially
    const results = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const vibelog of needsVideo) {
      console.log(`[Batch Video] Generating video for: ${vibelog.id} - ${vibelog.title}`);

      try {
        const response = await fetch(`${baseUrl}/api/video/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vibelogId: vibelog.id,
            prompt: vibelog.content || vibelog.teaser,
            imageUrl: vibelog.cover_image_url,
            aspectRatio: '16:9',
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log(`[Batch Video] ✅ Success: ${vibelog.id}`);
          results.push({
            vibelogId: vibelog.id,
            title: vibelog.title,
            success: true,
            videoUrl: data.data?.videoUrl,
          });
        } else {
          console.error(`[Batch Video] ❌ Failed: ${vibelog.id} -`, data.error);
          results.push({
            vibelogId: vibelog.id,
            title: vibelog.title,
            success: false,
            error: data.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        console.error(`[Batch Video] ❌ Error for ${vibelog.id}:`, error);
        results.push({
          vibelogId: vibelog.id,
          title: vibelog.title,
          success: false,
          error: error.message || 'Request failed',
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[Batch Video] Complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} videos, ${failCount} failed`,
      total: results.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('[Batch Video] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Batch video generation failed',
      },
      { status: 500 }
    );
  }
}
