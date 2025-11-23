import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { trackAICost, calculateTTSCost, isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
// import { checkAndBlockBots } from '@/lib/botid-check'; // DISABLED: Blocking legit users
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 120; // TTS can take longer for long content

export async function POST(request: NextRequest) {
  try {
    // 🛡️ BOT PROTECTION: DISABLED - was blocking legitimate users
    // const botCheck = await checkAndBlockBots();
    // if (botCheck) {
    //   return botCheck;
    // }

    // 🛡️ CIRCUIT BREAKER: Check if daily cost limit exceeded
    if (await isDailyLimitExceeded()) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message:
            'AI services have reached their daily cost limit ($50). Service will resume tomorrow.',
        },
        { status: 503 }
      );
    }

    // Rate limit per user
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Use rate limits from config (COST PROTECTION - TTS is expensive!)
    const limits = config.rateLimits.tts;
    const opts = userId ? limits.authenticated : limits.anonymous;
    const rl = await rateLimit(request, 'generate-ai-audio', opts, userId || undefined);
    if (!rl.success) {
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message: `You've used your ${opts.limit} free AI audio generations today. Sign in to get ${limits.authenticated.limit} per day!`,
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                `${limits.authenticated.limit} AI audio generations per day`,
                'Save your vibelogs',
                'Access to premium features',
              ],
            },
            ...rl,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(((rl.reset || 0) - Date.now()) / 1000)),
            },
          }
        );
      }
      return tooManyResponse(rl);
    }

    const { vibelogId } = await request.json();

    if (!vibelogId) {
      return NextResponse.json({ error: 'Vibelog ID is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get the vibelog
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('id, title, content, audio_url, ai_audio_url')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if AI audio already exists
    if (vibelog.ai_audio_url) {
      return NextResponse.json({
        success: true,
        message: 'AI audio already exists',
        audioUrl: vibelog.ai_audio_url,
      });
    }

    // Prepare the text content for TTS
    const textContent = `${vibelog.title}. ${vibelog.content}`;

    // Truncate if too long (TTS has limits around 4000-5000 chars)
    const MAX_TTS_CHARS = 4000;
    const truncatedContent = textContent.slice(0, MAX_TTS_CHARS);

    // Check for real API key
    if (
      !config.ai.openai.apiKey ||
      config.ai.openai.apiKey === 'dummy_key' ||
      config.ai.openai.apiKey === 'your_openai_api_key_here'
    ) {
      console.warn('🧪 AI audio generation - no API key configured');
      return NextResponse.json(
        {
          error: 'AI audio generation is not configured',
          message: 'The OpenAI API key is missing.',
        },
        { status: 503 }
      );
    }

    console.log('🎙️ Generating AI narration for vibelog:', vibelog.id);

    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 120_000, // 2 minutes for TTS
    });

    // Generate speech using OpenAI TTS with Shimmer voice
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // High-quality model
      voice: 'shimmer', // Shimmer voice - warm, empathetic
      input: truncatedContent,
      speed: 1.0,
    });

    // 💰 COST TRACKING (TTS-1-HD: $0.03/1K chars)
    const cost = calculateTTSCost(truncatedContent.length);
    const { allowed } = await trackAICost(userId || null, 'tts-1-hd', cost, {
      endpoint: '/api/vibelog/generate-ai-audio',
      text_length: truncatedContent.length,
      vibelog_id: vibelogId,
    });

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Daily cost limit exceeded',
          message: 'AI services have reached their daily limit. Try again tomorrow.',
        },
        { status: 503 }
      );
    }

    if (isDev) {
      console.log(`💰 TTS cost: $${cost.toFixed(4)} (${truncatedContent.length} chars)`);
    }

    // Convert response to buffer
    const arrayBuffer = await mp3Response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `ai-narration-${vibelog.id}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage.from('audio').upload(fileName, buffer, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
    });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('audio').getPublicUrl(fileName);

    // Update vibelog with AI audio URL
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({ ai_audio_url: publicUrl })
      .eq('id', vibelogId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update vibelog' }, { status: 500 });
    }

    console.log('✅ AI narration generated successfully:', publicUrl);

    return NextResponse.json({
      success: true,
      message: 'AI audio generated successfully',
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error('❌ Error generating AI audio:', error);

    let errorMessage = 'Failed to generate AI audio';
    let statusCode = 500;
    let errorDetails = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.message.includes('Invalid API key') || error.message.includes('invalid_api_key')) {
        errorMessage = 'API configuration error';
        statusCode = 401;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'OpenAI API rate limit exceeded';
        statusCode = 429;
      } else if (error.message.includes('quota') || error.message.includes('insufficient')) {
        errorMessage = 'OpenAI API quota exceeded';
        statusCode = 402;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails || 'Unknown error',
      },
      { status: statusCode }
    );
  }
}
