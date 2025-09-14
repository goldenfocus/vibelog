import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Limits: logged-in 10000 per hour; anonymous 10000 per day
    const isDev = process.env.NODE_ENV !== 'production';
    const baseOpts = userId ? { limit: 10000, window: '1 h' as const } : { limit: 10000, window: '24 h' as const };
    const opts = isDev ? { limit: 10000, window: '15 m' as const } : baseOpts;
    const rl = await rateLimit(request, 'text-to-speech', opts, userId || undefined);

    if (!rl.success) {
      if (!userId) {
        return NextResponse.json({
          error: 'Daily limit reached',
          message: 'You\'ve used your 10000 free text-to-speech generations today. Sign in with Google to get 10000 per hour!',
          upgrade: {
            action: 'Sign in with Google',
            benefits: [
              '10000 requests per hour (vs 10000 per day)',
              'Higher quality voice synthesis',
              'Multiple voice options',
              'Faster processing priority'
            ]
          },
          ...rl
        }, {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(((rl.reset || 0) - Date.now()) / 1000))
          }
        });
      }
      return tooManyResponse(rl);
    }

    const { text, voice = 'shimmer' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // Validate text length (OpenAI TTS has a 4096 character limit)
    if (text.length > 4000) {
      return NextResponse.json({
        error: 'Text too long',
        message: 'Text must be under 4000 characters for text-to-speech conversion'
      }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Generating TTS for text:', text.substring(0, 100) + '...', 'with voice:', voice);
    }

    // Check if we have a real API key, otherwise return mock response
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key' || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('🧪 Using mock TTS response for development/testing');

      // Return a small silent audio file as mock
      const mockAudioData = new Uint8Array([
        // Minimal WAV file header for silence (44 bytes + minimal data)
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x28, 0x00, 0x00, 0x00, // File size - 8
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Subchunk1Size
        0x01, 0x00, 0x01, 0x00, // AudioFormat, NumChannels
        0x44, 0xAC, 0x00, 0x00, // SampleRate (44100)
        0x88, 0x58, 0x01, 0x00, // ByteRate
        0x02, 0x00, 0x10, 0x00, // BlockAlign, BitsPerSample
        0x64, 0x61, 0x74, 0x61, // "data"
        0x04, 0x00, 0x00, 0x00, // Data size
        0x00, 0x00, 0x00, 0x00  // Silence data
      ]);

      return new NextResponse(mockAudioData, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': mockAudioData.length.toString(),
        },
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
    });

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      response_format: 'mp3',
    });

    const audioBuffer = Buffer.from(await mp3.arrayBuffer());

    if (process.env.NODE_ENV !== 'production') {
      console.log('TTS generation completed, audio size:', audioBuffer.length, 'bytes');
    }

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('TTS generation error:', error);

    let errorMessage = 'Failed to generate speech';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = 'TTS service configuration error.';
        statusCode = 401;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.error('Detailed TTS error:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}