import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { checkVideoGenerationStatus, submitVideoGeneration } from '@/lib/video/generator';
import { uploadVideoToStorage } from '@/lib/video/storage';

export const runtime = 'nodejs';

// Process a single queued video job (event-driven, no cron required)
export async function POST(_req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Pick the oldest pending job
    const { data: job, error: jobError } = await supabase
      .from('video_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ message: 'No pending jobs' }, { status: 200 });
    }

    // Mark as processing
    await supabase
      .from('video_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    const vibelogId = job.vibelog_id as string;

    // Fetch vibelog content
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('id, title, teaser, content, cover_image_url, video_request_id')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      await supabase
        .from('video_queue')
        .update({ status: 'failed', error: 'Vibelog not found' })
        .eq('id', job.id);
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Submit job if no request id yet
    let requestId = job.video_request_id || vibelog.video_request_id;
    if (!requestId) {
      const prompt = vibelog.content || vibelog.teaser || vibelog.title;
      const { requestId: submittedId } = await submitVideoGeneration({
        prompt,
        imageUrl: vibelog.cover_image_url || undefined,
        aspectRatio: '16:9',
      });
      requestId = submittedId;

      await supabase
        .from('video_queue')
        .update({ video_request_id: requestId })
        .eq('id', job.id);

      await supabase
        .from('vibelogs')
        .update({
          video_request_id: requestId,
          video_generation_status: 'generating',
          video_requested_at: new Date().toISOString(),
        })
        .eq('id', vibelogId);
    }

    // Check status with fal.ai
    const status = await checkVideoGenerationStatus(requestId);

    if (status.status === 'completed' && status.videoUrl) {
      const storedUrl = await uploadVideoToStorage(status.videoUrl, vibelogId);

      await supabase
        .from('vibelogs')
        .update({
          video_url: storedUrl,
          video_generation_status: 'completed',
          video_generated_at: new Date().toISOString(),
        })
        .eq('id', vibelogId);

      await supabase
        .from('video_queue')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', job.id);

      // Chain to next if any
      triggerNext();

      return NextResponse.json({ success: true, status: 'completed', videoUrl: storedUrl });
    }

    if (status.status === 'failed') {
      await supabase
        .from('vibelogs')
        .update({ video_generation_status: 'failed', video_generation_error: status.error || null })
        .eq('id', vibelogId);

      await supabase
        .from('video_queue')
        .update({ status: 'failed', error: status.error || 'Unknown error', attempts: job.attempts + 1 })
        .eq('id', job.id);

      return NextResponse.json({ success: false, status: 'failed', error: status.error }, { status: 500 });
    }

    // Still queued or generating: leave as processing, update vibelog status
    await supabase
      .from('vibelogs')
      .update({ video_generation_status: status.status === 'queued' ? 'queued' : 'generating' })
      .eq('id', vibelogId);

    // Re-trigger to continue polling on next nudge
    triggerNext();

    return NextResponse.json({ success: true, status: status.status });
  } catch (error) {
    console.error('[video/process-next] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function triggerNext() {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/video/process-next`;
  // Fire-and-forget; errors are non-critical
  fetch(url, { method: 'POST' }).catch(() => {});
}
