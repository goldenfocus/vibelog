/**
 * Video Analysis API Route
 * POST /api/video/analyze
 * Analyzes video content to generate title, description, and teaser
 * Pattern: Download video → Transcribe → AI Generate content
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { trackAICost } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { createApiLogger } from '@/lib/logger';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { transcribeFromStorage } from '@/lib/services/transcription-service';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for video analysis

// Validation schema
const AnalyzeVideoSchema = z.object({
  vibelogId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const apiLogger = createApiLogger(request.headers.get('x-request-id') || undefined);

  console.log('🎬 [VIDEO-ANALYZE] Starting video analysis...');

  try {
    // Get authenticated user
    console.log('🔐 [VIDEO-ANALYZE] Getting authenticated user...');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log('❌ [VIDEO-ANALYZE] No user found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('✅ [VIDEO-ANALYZE] User authenticated:', user.id.substring(0, 8) + '...');
    apiLogger.setContext({ userId: user.id, endpoint: '/api/video/analyze' });

    // Rate limiting
    const rl = await rateLimit(request, 'video-analyze', { limit: 50, window: '15 m' }, user.id);
    if (!rl.success) {
      return tooManyResponse(rl);
    }

    // Parse and validate request
    const body = await request.json();
    const validated = AnalyzeVideoSchema.parse(body);
    const { vibelogId } = validated;

    console.log('📋 [VIDEO-ANALYZE] Vibelog ID:', vibelogId);
    apiLogger.debug('Starting video analysis', { vibelogId });

    // Verify vibelog exists and belongs to user
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, user_id, video_url, content, title')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      console.log('❌ [VIDEO-ANALYZE] Vibelog not found:', fetchError?.message);
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      console.log('❌ [VIDEO-ANALYZE] Permission denied');
      return NextResponse.json(
        { error: 'You do not have permission to analyze this vibelog' },
        { status: 403 }
      );
    }

    if (!vibelog.video_url) {
      console.log('❌ [VIDEO-ANALYZE] No video URL');
      return NextResponse.json({ error: 'No video found for this vibelog' }, { status: 400 });
    }

    console.log('📹 [VIDEO-ANALYZE] Video URL:', vibelog.video_url);

    // Extract storage path from video URL
    // Format: https://.../storage/v1/object/public/vibelogs/{path}
    const url = new URL(vibelog.video_url);
    const pathMatch = url.pathname.match(/\/public\/vibelogs\/(.+)$/);
    if (!pathMatch) {
      console.log('❌ [VIDEO-ANALYZE] Invalid video URL format');
      return NextResponse.json({ error: 'Invalid video URL format' }, { status: 400 });
    }
    const storagePath = pathMatch[1];

    console.log('📂 [VIDEO-ANALYZE] Storage path extracted:', storagePath);
    apiLogger.debug('Transcribing video audio', { storagePath });

    // Call transcription service directly (no HTTP call needed!)
    console.log('🎤 [VIDEO-ANALYZE] Calling transcription service...');
    const transcribeResult = await transcribeFromStorage(storagePath, user.id);

    if (!transcribeResult.success || !transcribeResult.transcription) {
      console.error('❌ [VIDEO-ANALYZE] Transcription failed');
      return NextResponse.json(
        { error: 'Failed to transcribe video' },
        { status: 500 }
      );
    }

    const { transcription } = transcribeResult;
    console.log('✅ [VIDEO-ANALYZE] Transcription received, length:', transcription.length);

    apiLogger.debug('Transcription complete', {
      transcriptionLength: transcription.length,
      preview: transcription.substring(0, 100),
    });

    // Generate title and description using GPT-4o-mini
    console.log('🤖 [VIDEO-ANALYZE] Generating title and description via AI...');
    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    apiLogger.debug('Generating title and description via AI');

    const completion = await openai.chat.completions.create({
      model: config.ai.openai.model, // gpt-4o-mini
      messages: [
        {
          role: 'system',
          content: `You are a vibelog title and description generator. Your task is to create compelling, SEO-friendly titles and descriptions for video content.

REQUIREMENTS:
- Title: 5-10 words, engaging and descriptive
- Description: 1-2 sentences, compelling summary
- Teaser: 2-3 sentences, creates curiosity and encourages viewing
- All content should be natural, authentic, and match the speaker's tone

OUTPUT FORMAT (CRITICAL - EXACT FORMAT):
TITLE: [Your title here]
DESCRIPTION: [Your description here]
TEASER: [Your teaser here]

GUIDELINES:
- Make titles clickable and clear
- Descriptions should highlight the main value/insight
- Teasers should create curiosity without spoilers
- Keep language natural and conversational
- Avoid clickbait or misleading statements`,
        },
        {
          role: 'user',
          content: `Generate a title, description, and teaser for this video transcription:

"${transcription.substring(0, 2000)}"

${transcription.length > 2000 ? '\n\n[Transcription truncated for length]' : ''}

Output in the exact format:
TITLE: ...
DESCRIPTION: ...
TEASER: ...`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log('✅ [VIDEO-ANALYZE] AI generation complete');

    // Track AI cost
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    // Cost calculation: GPT-4o-mini is $0.15/1M input, $0.60/1M output
    const cost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;
    trackAICost(user.id, 'gpt-4o-mini', cost, {
      endpoint: '/api/video/analyze',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Parse AI response
    const titleMatch = aiResponse.match(/TITLE:\s*(.+?)(?:\n|$)/i);
    const descriptionMatch = aiResponse.match(/DESCRIPTION:\s*([\s\S]+?)(?:\nTEASER:|$)/i);
    const teaserMatch = aiResponse.match(/TEASER:\s*([\s\S]+?)$/i);

    const title = titleMatch?.[1]?.trim() || 'Video Vibelog';
    const description = descriptionMatch?.[1]?.trim() || transcription.substring(0, 200);
    const teaser = teaserMatch?.[1]?.trim() || transcription.substring(0, 300);

    console.log('🎉 [VIDEO-ANALYZE] Analysis complete:', { title });

    apiLogger.debug('AI generation complete', {
      title,
      descriptionLength: description.length,
      teaserLength: teaser.length,
    });

    // Return analysis results
    return NextResponse.json({
      success: true,
      title,
      description,
      teaser,
      transcription,
    });
  } catch (error: unknown) {
    console.error('💥 [VIDEO-ANALYZE] Uncaught error:', error instanceof Error ? error.message : error);
    console.error('💥 [VIDEO-ANALYZE] Stack:', error instanceof Error ? error.stack : 'N/A');
    apiLogger.error('Video analysis failed', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze video';
    return NextResponse.json(
      {
        error: 'Failed to analyze video',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
