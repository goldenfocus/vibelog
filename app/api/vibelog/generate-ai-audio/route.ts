import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { createServerSupabaseClient } from '@/lib/supabase';

// Initialize OpenAI client lazily to avoid errors if API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured - AI audio generation unavailable');
      return NextResponse.json(
        {
          error: 'AI audio generation is not configured',
          message: 'The OpenAI API key is missing. Please configure OPENAI_API_KEY environment variable.',
        },
        { status: 503 }
      );
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

    // If original audio exists, we don't need to generate AI audio
    // (user can toggle between original and AI narration)
    // But for now, let's generate it anyway for comparison

    // Prepare the text content for TTS
    const textContent = `${vibelog.title}. ${vibelog.content}`;

    // Truncate if too long (most TTS models have limits around 4000-5000 chars)
    const truncatedContent = textContent.slice(0, 4000);

    // Generate speech using OpenAI TTS with Shimmer voice
    console.log('🎙️ Generating AI narration with OpenAI TTS for vibelog:', vibelog.id);

    const openai = getOpenAIClient();
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // High-quality model
      voice: 'shimmer', // Shimmer voice - warm, empathetic
      input: truncatedContent,
      speed: 1.0,
    });

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

    // Provide more helpful error messages
    let errorMessage = 'Failed to generate AI audio';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'AI audio generation is not configured';
        statusCode = 503;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'OpenAI API rate limit exceeded';
        statusCode = 429;
      } else if (error.message.includes('quota')) {
        errorMessage = 'OpenAI API quota exceeded';
        statusCode = 429;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: statusCode }
    );
  }
}
