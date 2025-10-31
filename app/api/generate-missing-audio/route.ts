import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { storeTTSAudio, hashTTSContent } from '@/lib/storage';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

/**
 * Generate missing TTS audio for vibelogs that don't have audio_url
 * This endpoint can be called manually or via cron job to backfill audio
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin secret (optional security)
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.GENERATE_AUDIO_SECRET;
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = await createServerAdminClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const batch = searchParams.get('batch') === 'true';

    // Find vibelogs without audio_url
    const { data: vibelogs, error } = await adminSupabase
      .from('vibelogs')
      .select('id, content, title')
      .is('audio_url', null)
      .eq('is_published', true)
      .eq('is_public', true)
      .limit(limit);

    if (error) {
      console.error('Error fetching vibelogs:', error);
      return NextResponse.json({ error: 'Failed to fetch vibelogs' }, { status: 500 });
    }

    if (!vibelogs || vibelogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vibelogs need audio generation',
        processed: 0,
      });
    }

    console.log(`🎙️ [GENERATE-MISSING-AUDIO] Found ${vibelogs.length} vibelogs without audio`);

    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'dummy_key' ||
      process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
    ) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
    });

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      cached: 0,
      errors: [] as string[],
    };

    // Process each vibelog
    for (const vibelog of vibelogs) {
      try {
        if (!vibelog.content || vibelog.content.length < 10) {
          console.log(`⚠️ [GENERATE-MISSING-AUDIO] Vibelog ${vibelog.id} has no content, skipping`);
          results.failed++;
          continue;
        }

        // Clean content for TTS
        const cleanContent = vibelog.content
          .replace(/#{1,6}\s/g, '') // Remove headers
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1') // Remove italic
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
          .replace(/`([^`]+)`/g, '$1') // Remove code
          .replace(/\n\s*\n/g, '\n') // Remove extra newlines
          .trim();

        // Truncate if too long
        const ttsText =
          cleanContent.length > 4000 ? cleanContent.substring(0, 4000) + '...' : cleanContent;

        if (!ttsText || ttsText.length < 10) {
          results.failed++;
          continue;
        }

        // Check cache
        const contentHash = hashTTSContent(ttsText, 'shimmer');
        const { data: cachedEntry } = await adminSupabase
          .from('tts_cache')
          .select('audio_url')
          .eq('content_hash', contentHash)
          .single();

        let audioUrl: string | null = null;

        if (cachedEntry?.audio_url) {
          // Use cached audio
          audioUrl = cachedEntry.audio_url;
          results.cached++;
          console.log(`✅ [GENERATE-MISSING-AUDIO] Using cached audio for vibelog ${vibelog.id}`);
        } else {
          // Generate new TTS
          console.log(`🎙️ [GENERATE-MISSING-AUDIO] Generating TTS for vibelog ${vibelog.id}...`);

          const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'shimmer',
            input: ttsText,
            response_format: 'mp3',
          });

          const audioBuffer = Buffer.from(await mp3.arrayBuffer());

          // Store in cache
          audioUrl = await storeTTSAudio(contentHash, audioBuffer);

          // Save to cache table
          await adminSupabase.from('tts_cache').upsert(
            {
              content_hash: contentHash,
              text_content: ttsText,
              voice: 'shimmer',
              audio_url: audioUrl,
              audio_size_bytes: audioBuffer.length,
              last_accessed_at: new Date().toISOString(),
              access_count: 1,
            },
            {
              onConflict: 'content_hash',
            }
          );

          console.log(`✅ [GENERATE-MISSING-AUDIO] TTS generated for vibelog ${vibelog.id}`);
        }

        // Update vibelog with audio URL
        await adminSupabase
          .from('vibelogs')
          .update({
            audio_url: audioUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vibelog.id);

        results.succeeded++;
        results.processed++;
      } catch (error) {
        console.error(`❌ [GENERATE-MISSING-AUDIO] Error processing vibelog ${vibelog.id}:`, error);
        results.failed++;
        results.errors.push(
          `Vibelog ${vibelog.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Small delay between requests to avoid rate limiting
      if (!batch) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} vibelogs`,
      results,
    });
  } catch (error) {
    console.error('Error generating missing audio:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
