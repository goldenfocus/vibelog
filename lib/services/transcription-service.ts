/**
 * Transcription Service
 * Core transcription logic extracted for direct use without HTTP calls
 */

import OpenAI from 'openai';

import { getCachedResponse, setCachedResponse } from '@/lib/ai-cache';
import { trackAICost, calculateWhisperCost } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { normalizeVibeLog } from '@/lib/normalize-vibelog';
import { downloadFromStorage } from '@/lib/storage';

export interface TranscriptionResult {
  transcription: string;
  detectedLanguage: string;
  success: boolean;
}

/**
 * Transcribe a video/audio file from Supabase storage
 * This is a direct function call that bypasses HTTP routing
 */
export async function transcribeFromStorage(
  storagePath: string,
  userId: string | null
): Promise<TranscriptionResult> {
  console.log('📥 [TRANSCRIPTION-SERVICE] Downloading media from storage:', storagePath);

  // Download file from Supabase Storage
  const blob = await downloadFromStorage(storagePath);

  // Detect if it's video or audio from blob type
  const isVideo = blob.type?.startsWith('video/');
  const fileExt = isVideo
    ? blob.type.includes('mp4')
      ? 'mp4'
      : blob.type.includes('quicktime')
        ? 'mov'
        : 'webm'
    : 'webm';

  // Convert blob to File
  const audioFile = new File([blob], `recording.${fileExt}`, {
    type: blob.type || 'audio/webm',
  });

  console.log(
    '✅ [TRANSCRIPTION-SERVICE] Downloaded:',
    audioFile.size,
    'bytes',
    isVideo ? '(video)' : '(audio)'
  );

  // Check cache
  const audioBuffer = await audioFile.arrayBuffer();
  const cachedResult = await getCachedResponse('transcription', Buffer.from(audioBuffer));

  if (cachedResult) {
    console.log('💾 [TRANSCRIPTION-SERVICE] Cache hit! Returning cached transcription');

    await trackAICost(userId, 'whisper', 0, {
      endpoint: '/api/video/analyze',
      cache_hit: true,
      file_size: audioFile.size,
    });

    return cachedResult as TranscriptionResult;
  }

  // Check for mock mode
  if (
    !config.ai.openai.apiKey ||
    config.ai.openai.apiKey === 'dummy_key' ||
    config.ai.openai.apiKey === 'your_openai_api_key_here'
  ) {
    console.warn('🧪 [TRANSCRIPTION-SERVICE] Using mock transcription');
    return {
      transcription:
        "Today I want to share some thoughts about the future of voice technology and how it's changing the way we create content.",
      detectedLanguage: 'en',
      success: true,
    };
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: config.ai.openai.apiKey,
    timeout: 60_000,
  });

  // Prepare file for Whisper
  const whisperFile = new File([audioFile], `recording.${fileExt}`, {
    type: audioFile.type || 'audio/webm',
  });

  console.log('🎤 [TRANSCRIPTION-SERVICE] Calling Whisper API...');

  // Transcribe
  const transcription = await openai.audio.transcriptions.create({
    file: whisperFile,
    model: config.ai.openai.whisperModel,
    response_format: 'verbose_json',
  });

  const detectedLanguage = transcription.language || 'en';
  const transcriptionText = normalizeVibeLog(transcription.text);
  const actualDuration = transcription.duration || Math.ceil(audioFile.size / 10000);

  console.log(
    '✅ [TRANSCRIPTION-SERVICE] Transcription complete:',
    transcriptionText.substring(0, 100) + '...'
  );

  // Track cost
  const cost = calculateWhisperCost(actualDuration);
  await trackAICost(userId, 'whisper', cost, {
    endpoint: '/api/video/analyze',
    cache_hit: false,
    duration_seconds: actualDuration,
    file_size: audioFile.size,
    detected_language: detectedLanguage,
  });

  const result: TranscriptionResult = {
    transcription: transcriptionText,
    detectedLanguage,
    success: true,
  };

  // Cache result
  await setCachedResponse('transcription', Buffer.from(audioBuffer), result);

  // NOTE: Do NOT delete the storage file - it's needed for video playback!
  // The video file in storage is the source for the video player.
  // Only audio files uploaded specifically for transcription should be deleted.

  return result;
}
