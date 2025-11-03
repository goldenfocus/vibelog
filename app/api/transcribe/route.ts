import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { downloadFromStorage, deleteFromStorage } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';

// Use Node.js runtime for better performance with larger payloads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for transcription

export async function POST(request: NextRequest) {
  try {
    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Use rate limits from config
    const limits = config.rateLimits.transcription;
    const opts = userId ? limits.authenticated : limits.anonymous;
    const rl = await rateLimit(request, 'transcribe', opts, userId || undefined);
    if (!rl.success) {
      // Custom response for anonymous users to encourage signup
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message:
              "You've used your 10000 free transcriptions today. Sign in with Google to get 10000 requests every 15 minutes!",
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                '10000 requests every 15 minutes (vs 10000 per day)',
                'No daily limits',
                'Faster processing priority',
                'Save your vibelogs',
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

    // Support two methods: direct upload (formData) and storage path (JSON)
    const contentType = request.headers.get('content-type') || '';
    let audioFile: File;
    let storagePath: string | null = null;

    if (contentType.includes('application/json')) {
      // NEW WAY: Download from storage (supports unlimited file sizes!)
      const body = await request.json();
      storagePath = body.storagePath;

      if (!storagePath) {
        return NextResponse.json({ error: 'Missing storagePath in request body' }, { status: 400 });
      }

      console.log('📥 Downloading audio from storage:', storagePath);

      try {
        // Download file from Supabase Storage
        const blob = await downloadFromStorage(storagePath);

        // Convert blob to File
        audioFile = new File([blob], 'recording.webm', {
          type: blob.type || 'audio/webm',
        });

        console.log('✅ Downloaded:', audioFile.size, 'bytes');
      } catch (storageError) {
        console.error('Storage download failed:', storageError);
        return NextResponse.json(
          {
            error: 'Failed to download audio from storage',
            message: storageError instanceof Error ? storageError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    } else {
      // OLD WAY: Direct formData upload (4MB limit, kept for backwards compatibility)
      const formData = await request.formData();
      const file = formData.get('audio') as File;

      if (!file) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
      }

      audioFile = file;

      // Use file constraints from config (only for direct uploads)
      const { maxSize: MAX_SIZE_BYTES, minSize: MIN_SIZE_BYTES } = config.files.audio;

      // Check for empty or too small files
      if (audioFile.size === 0) {
        return NextResponse.json(
          { error: 'Audio file is empty. Please try recording again.' },
          { status: 400 }
        );
      }

      // Check for minimum file size to avoid corrupted recordings
      if (audioFile.size < MIN_SIZE_BYTES) {
        return NextResponse.json(
          {
            error:
              'Audio file is too small or corrupted. Please try recording again with longer audio.',
          },
          { status: 400 }
        );
      }

      if (audioFile.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: 'Audio file too large' }, { status: 413 });
      }
    }

    if (isDev) {
      console.log(
        '🎤 Transcribing audio:',
        audioFile.size,
        'bytes',
        audioFile.type,
        storagePath ? `(from storage: ${storagePath})` : '(direct upload)'
      );
    }

    // Check if we have a real API key, otherwise return mock response for testing
    if (
      !config.ai.openai.apiKey ||
      config.ai.openai.apiKey === 'dummy_key' ||
      config.ai.openai.apiKey === 'your_openai_api_key_here'
    ) {
      console.warn('🧪 Using mock transcription for development/testing');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return NextResponse.json({
        transcription:
          "Today I want to share some thoughts about the future of voice technology and how it's changing the way we create content. Speaking is our most natural form of communication and I believe we're moving toward a world where your voice becomes your pen.",
        detectedLanguage: 'en',
        success: true,
      });
    }

    // Initialize OpenAI client only when we have a real API key
    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    // Convert File to format OpenAI expects
    // Create a new File with .webm extension to help OpenAI identify the format
    const whisperFile = new File([audioFile], 'recording.webm', {
      type: audioFile.type || 'audio/webm',
    });

    // Use verbose_json to get language detection metadata
    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
      model: config.ai.openai.whisperModel,
      // Remove language parameter to enable auto-detection
      response_format: 'verbose_json',
    });

    // Extract language metadata from verbose response
    const detectedLanguage = transcription.language || 'en'; // ISO 639-1 code
    const transcriptionText = transcription.text;

    if (isDev) {
      console.log('✅ Transcription completed:', transcriptionText.substring(0, 100) + '...');
      console.log('🌐 Detected language:', detectedLanguage);
    }

    // Clean up storage file after successful transcription
    if (storagePath) {
      console.log('🧹 Cleaning up storage file:', storagePath);
      // Fire and forget - don't wait for deletion
      deleteFromStorage(storagePath).catch(err =>
        console.warn('Failed to delete storage file:', err)
      );
    }

    return NextResponse.json({
      transcription: transcriptionText,
      detectedLanguage, // ISO 639-1 code (e.g., "fr", "en", "es")
      success: true,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    // Provide more detailed error information
    let errorMessage = 'Failed to transcribe audio';
    let statusCode = 500;

    if (error instanceof Error) {
      // Handle specific OpenAI API errors
      if (error.message.includes('Unsupported file type')) {
        errorMessage = 'Audio format not supported. Please try a different recording format.';
        statusCode = 415;
      } else if (error.message.includes('File size too large')) {
        errorMessage = 'Audio file is too large. Please record a shorter clip.';
        statusCode = 413;
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = 'API configuration error. Please check your OpenAI settings.';
        statusCode = 401;
      }

      if (isDev) {
        console.error('Detailed error:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
