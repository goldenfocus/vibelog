import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import {
  trackAICost,
  calculateWhisperCost,
  calculateGPTCost,
  calculateImageCost,
  isDailyLimitExceeded,
  estimateTokens,
} from '@/lib/ai-cost-tracker';
import { getUserDefaultChannel } from '@/lib/channels';
import { config } from '@/lib/config';
import { uploadCover } from '@/lib/cover-storage';
import {
  uploadMusicFile,
  isValidMusicType,
  isMusicVideo,
  MAX_MUSIC_FILE_SIZE,
  getMediaType,
} from '@/lib/music-storage';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import {
  createVibelog,
  normalizeVibelogData,
  SaveVibelogRequest,
  handleAsyncTasks,
} from '@/lib/services/vibelog-service';
import { downloadFromStorage, getVibelogPublicUrl } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for full processing pipeline

/**
 * Media Upload API
 *
 * Handles the complete pipeline for media vibelogs:
 * 1. Upload media file (audio, video, or text)
 * 2. Process content:
 *    - Audio/Video: Transcribe with Whisper
 *    - Text: Read file content directly (skip transcription)
 * 3. Generate title/content with GPT-4o
 * 4. Generate cover image with DALL-E (if not provided)
 * 5. Save as vibelog with media_type
 * 6. Translate to 6 languages
 *
 * Input: FormData with:
 * - file: Media file (audio, video, or text)
 * - coverImage?: Optional cover image file
 * - title?: Optional title override
 * - storagePath?: If file already uploaded via presigned URL
 */
// Text/Document MIME types - these skip Whisper transcription and read content directly
const TEXT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/html',
  'text/xml',
  'text/yaml',
  'text/rtf',
  'application/json',
  'application/xml',
  'application/rtf',
  'application/yaml',
  'application/x-yaml',
];

function isTextFile(mimeType: string): boolean {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  return TEXT_MIME_TYPES.includes(normalized);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🎵 [MEDIA-UPLOAD] Starting media upload process...');

  try {
    // === STEP 0: CIRCUIT BREAKER ===
    if (await isDailyLimitExceeded()) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'AI services have reached their daily limit. Try again tomorrow.',
        },
        { status: 503 }
      );
    }

    // === STEP 1: AUTH CHECK ===
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to upload music.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('👤 [MUSIC-UPLOAD] User:', userId.substring(0, 8) + '...');

    // === STEP 2: RATE LIMITING ===
    const limits = config.rateLimits.generation;
    const opts = limits.authenticated;
    const rl = await rateLimit(request, 'upload-music', opts, userId);
    if (!rl.success) {
      return tooManyResponse(rl);
    }

    // === STEP 3: PARSE REQUEST ===
    const contentType = request.headers.get('content-type') || '';
    let musicFile: File | null = null;
    let coverFile: File | null = null;
    let titleOverride: string | null = null;
    let storagePath: string | null = null;
    let mimeType: string = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      musicFile = formData.get('file') as File | null;
      coverFile = formData.get('coverImage') as File | null;
      titleOverride = formData.get('title') as string | null;
      storagePath = formData.get('storagePath') as string | null;

      if (musicFile) {
        mimeType = musicFile.type;
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      storagePath = body.storagePath;
      titleOverride = body.title;
      mimeType = body.mimeType || 'audio/mpeg';
    }

    // === STEP 4: GET OR UPLOAD MUSIC FILE ===
    let musicUrl: string;
    let musicStoragePath: string;

    const isText = isTextFile(mimeType);

    if (storagePath) {
      // File already uploaded via presigned URL
      console.log(
        '📥 [MEDIA-UPLOAD] Using pre-uploaded file:',
        storagePath,
        isText ? '(text)' : ''
      );
      musicUrl = getVibelogPublicUrl(storagePath);
      musicStoragePath = storagePath;
    } else if (musicFile) {
      // Validate file - accept both music files and text files
      if (!isValidMusicType(musicFile.type) && !isTextFile(musicFile.type)) {
        return NextResponse.json(
          {
            error: 'Invalid file type',
            message: 'Supported formats: MP3, WAV, M4A, OGG, FLAC, MP4, MOV, WebM, TXT, MD',
          },
          { status: 400 }
        );
      }

      if (musicFile.size > MAX_MUSIC_FILE_SIZE) {
        return NextResponse.json(
          {
            error: 'File too large',
            message: `Maximum file size is ${MAX_MUSIC_FILE_SIZE / (1024 * 1024)}MB`,
          },
          { status: 400 }
        );
      }

      console.log(
        '📤 [MUSIC-UPLOAD] Uploading music file:',
        musicFile.name,
        musicFile.size,
        'bytes'
      );

      const buffer = Buffer.from(await musicFile.arrayBuffer());
      const uploadResult = await uploadMusicFile(userId, buffer, musicFile.type);

      if (uploadResult.error || !uploadResult.url || !uploadResult.path) {
        return NextResponse.json(
          { error: 'Upload failed', message: uploadResult.error || 'Unknown error' },
          { status: 500 }
        );
      }

      musicUrl = uploadResult.url;
      musicStoragePath = uploadResult.path;
      mimeType = musicFile.type;
    } else {
      return NextResponse.json(
        { error: 'No file provided', message: 'Please provide a music file to upload.' },
        { status: 400 }
      );
    }

    console.log('✅ [MUSIC-UPLOAD] Music file ready:', musicUrl);

    // === STEP 5: GET CONTENT (Transcribe audio/video OR read text file) ===
    let transcription = '';
    let detectedLanguage = 'en';

    if (isText) {
      // TEXT FILE: Read content directly - no transcription needed
      console.log('📄 [MEDIA-UPLOAD] Reading text file content...');

      try {
        const blob = await downloadFromStorage(musicStoragePath);
        const textContent = await blob.text();
        transcription = textContent.trim();
        console.log('✅ [MEDIA-UPLOAD] Text content read:', transcription.length, 'chars');

        // Basic language detection from content (could be enhanced)
        // For now, default to English - GPT will handle multilingual content well
      } catch (readError) {
        console.error('⚠️ [MEDIA-UPLOAD] Failed to read text file:', readError);
        return NextResponse.json(
          {
            error: 'Failed to read text file',
            message: 'Could not process the uploaded text file.',
          },
          { status: 500 }
        );
      }
    } else {
      // AUDIO/VIDEO: Transcribe with Whisper
      console.log('🎤 [MEDIA-UPLOAD] Transcribing audio...');

      try {
        // Download file for transcription
        const blob = await downloadFromStorage(musicStoragePath);
        const fileExt = mimeType.includes('mp4')
          ? 'mp4'
          : mimeType.includes('mp3')
            ? 'mp3'
            : 'webm';
        const audioFile = new File([blob], `music.${fileExt}`, { type: mimeType });

        // Check for real API key
        if (config.ai.openai.apiKey && config.ai.openai.apiKey !== 'dummy_key') {
          const openai = new OpenAI({
            apiKey: config.ai.openai.apiKey,
            timeout: 120_000,
          });

          const response = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
          });

          transcription = response.text || '';
          detectedLanguage = response.language || 'en';

          // Track cost
          const durationMinutes = (response.duration || 60) / 60;
          const cost = calculateWhisperCost(durationMinutes);
          await trackAICost(userId, 'whisper', cost, {
            endpoint: '/api/vibelog/upload-music',
            duration_minutes: durationMinutes,
          });

          console.log('✅ [MEDIA-UPLOAD] Transcription complete:', transcription.length, 'chars');
        } else {
          console.log('🧪 [MEDIA-UPLOAD] Mock transcription (no API key)');
          transcription = 'This is a test transcription for development.';
        }
      } catch (transcribeError) {
        console.error('⚠️ [MEDIA-UPLOAD] Transcription failed:', transcribeError);
        // Continue without transcription - user can still have a music vibelog
        transcription = '';
      }
    }

    // === STEP 6: GENERATE CONTENT WITH GPT-4O ===
    console.log('📝 [MEDIA-UPLOAD] Generating content...');

    let title = titleOverride || '';
    let teaser = '';
    let content = '';
    const isVideo = isMusicVideo(mimeType);
    // For text files, set media_type to 'text' (will be stored as null media_type for standard vibelog)
    const mediaTypeValue = isText ? null : getMediaType(mimeType);

    try {
      if (config.ai.openai.apiKey && config.ai.openai.apiKey !== 'dummy_key') {
        const openai = new OpenAI({
          apiKey: config.ai.openai.apiKey,
          timeout: 60_000,
        });

        const languageNames: Record<string, string> = {
          en: 'English',
          es: 'Spanish',
          fr: 'French',
          de: 'German',
          vi: 'Vietnamese',
          zh: 'Chinese',
        };
        const languageName = languageNames[detectedLanguage] || 'English';

        const inputTokens = estimateTokens(transcription) + 500;

        // Different prompts for text vs audio/video
        const systemPrompt = isText
          ? `You are a creative writer enhancing and structuring user-provided text. Write in ${languageName}.

CONTEXT: This is a text file upload. Transform it into a polished vibelog post.

CRITICAL:
- Preserve the original meaning and intent
- Enhance clarity, structure, and flow
- Add engaging formatting if appropriate
- Keep the author's voice

OUTPUT FORMAT:
---TITLE---
[Engaging title based on content, 40-60 chars]
---TEASER---
[2-3 sentence hook summarizing the content, 150-250 chars]
---CONTENT---
# [Title]

[Enhanced, well-structured version of the original content with proper formatting, paragraphs, and markdown where appropriate]`
          : `You are a music journalist writing about a ${isVideo ? 'music video' : 'song'}. Write in ${languageName}.

CONTEXT: This is a music upload. The transcription contains lyrics or vocal content from the track.

CRITICAL:
- Write as if reviewing/describing a music release
- Focus on the mood, themes, and artistic expression
- If lyrics are provided, analyze their meaning
- Create an engaging music-focused vibelog

OUTPUT FORMAT:
---TITLE---
[Catchy title for the music, 40-60 chars]
---TEASER---
[2-3 sentence hook about the music, 150-250 chars]
---CONTENT---
# [Title]

[3-5 paragraphs about the music: mood, themes, lyrical analysis, artistic style]

## Lyrics
[If transcription has lyrics, include them formatted nicely. If no clear lyrics, skip this section]`;

        const userPrompt = isText
          ? `Here is the text content to enhance and publish as a vibelog:\n\n"${transcription}"`
          : transcription
            ? `Here are the ${isVideo ? 'vocals/audio' : 'lyrics'} from the music:\n\n"${transcription}"`
            : `This is a ${isVideo ? 'music video' : 'music track'} upload. No transcription available - create a generic music vibelog description.`;

        const completion = await openai.chat.completions.create({
          model: config.ai.openai.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        const rawContent = completion.choices[0]?.message?.content || '';
        const outputTokens = estimateTokens(rawContent);

        // Track cost
        const cost = calculateGPTCost(inputTokens, outputTokens);
        await trackAICost(userId, 'gpt-4o-mini', cost, {
          endpoint: '/api/vibelog/upload-music',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        });

        // Parse response
        const titleMatch = rawContent.match(/---TITLE---\s*([\s\S]*?)---TEASER---/);
        const teaserMatch = rawContent.match(/---TEASER---\s*([\s\S]*?)---CONTENT---/);
        const contentMatch = rawContent.match(/---CONTENT---\s*([\s\S]*?)$/);

        const defaultTitle = isText ? 'Untitled Post' : 'Untitled Track';
        title = titleOverride || (titleMatch ? titleMatch[1].trim() : defaultTitle);
        teaser = teaserMatch ? teaserMatch[1].trim() : '';
        content = contentMatch ? contentMatch[1].trim() : rawContent;

        console.log('✅ [MEDIA-UPLOAD] Content generated:', title);
      } else {
        // Mock for development
        const defaultTitle = isText ? 'Test Text Post' : 'Test Music Track';
        title = titleOverride || defaultTitle;
        teaser = isText
          ? 'This is a test text vibelog created during development.'
          : 'This is a test music vibelog created during development.';
        content = isText
          ? `# ${title}\n\n${transcription || 'Text content.'}`
          : `# ${title}\n\nA beautiful piece of music that speaks to the soul.\n\n## About\n\nThis track showcases artistic expression through sound.`;
      }
    } catch (genError) {
      console.error('⚠️ [MEDIA-UPLOAD] Content generation failed:', genError);
      title = titleOverride || (isText ? 'Text Upload' : 'Music Upload');
      teaser = isText ? 'A new text post.' : 'A new music release.';
      content = `# ${title}\n\n${transcription || (isText ? 'Text content.' : 'Music content.')}`;
    }

    // === STEP 7: GENERATE OR UPLOAD COVER IMAGE ===
    console.log('🎨 [MUSIC-UPLOAD] Processing cover image...');

    let coverImageUrl: string | null = null;

    // First, check if user provided a cover
    if (coverFile) {
      console.log('📤 [MUSIC-UPLOAD] Uploading user-provided cover...');
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const coverResult = await uploadCover('temp-' + Date.now(), coverBuffer, coverFile.type);
      if (coverResult.url) {
        coverImageUrl = coverResult.url;
      }
    }

    // If no cover provided, generate one with DALL-E
    if (!coverImageUrl && config.ai.openai.apiKey && config.ai.openai.apiKey !== 'dummy_key') {
      try {
        console.log('🎨 [MUSIC-UPLOAD] Generating cover with DALL-E...');

        const openai = new OpenAI({
          apiKey: config.ai.openai.apiKey,
          timeout: 60_000,
        });

        // Generate cover prompt based on content type
        const coverPrompt = isText
          ? `Blog post cover image for an article titled "${title}". ${teaser}. Style: Modern, clean, editorial illustration. Abstract or metaphorical representation. Professional and engaging. No text or words in the image.`
          : `Album cover art for a song titled "${title}". ${teaser}. Style: Modern album artwork, cinematic, atmospheric, professional music release cover. No text or words in the image.`;

        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: coverPrompt,
          n: 1,
          size: '1024x1024', // Square for album art
          quality: 'standard',
          style: 'vivid',
        });

        const imageUrl = response.data[0]?.url;

        if (imageUrl) {
          // Track cost
          await trackAICost(userId, 'dall-e-3', calculateImageCost(), {
            endpoint: '/api/vibelog/upload-music',
            image_size: '1024x1024',
          });

          // We'll save this with the vibelog ID later (re-upload to permanent storage)
          coverImageUrl = imageUrl;
        }
      } catch (coverError) {
        console.error('⚠️ [MUSIC-UPLOAD] Cover generation failed:', coverError);
        // Continue without cover - it's optional
      }
    }

    // === STEP 8: SAVE VIBELOG ===
    console.log('💾 [MUSIC-UPLOAD] Saving vibelog...');

    // Get default channel
    const defaultChannel = await getUserDefaultChannel(userId);

    const vibelogRequest: SaveVibelogRequest = {
      title,
      content: teaser,
      fullContent: content,
      transcription: transcription,
      // Only include audio data for audio files (not video or text)
      audioData:
        !isVideo && !isText
          ? {
              url: musicUrl,
              duration: 0, // TODO: Extract duration from file
            }
          : undefined,
      coverImage: coverImageUrl
        ? {
            url: coverImageUrl,
            alt: title,
            width: 1024,
            height: 1024,
          }
        : undefined,
      originalLanguage: detectedLanguage,
      channelId: defaultChannel?.id,
      isPublished: true,
      isPublic: true,
    };

    const { data: normalizedData, warnings } = await normalizeVibelogData(vibelogRequest, userId);

    // Add media-specific fields (only for audio/video, not text)
    const musicVibelogData = {
      ...normalizedData,
      media_type: mediaTypeValue,
      video_url: isVideo ? musicUrl : null,
      // For text uploads, don't store the text file as audio_url
      audio_url: !isVideo && !isText ? musicUrl : normalizedData.audio_url,
    };

    // Create the vibelog
    const supabaseAdmin = await createServerAdminClient();
    const result = await createVibelog(musicVibelogData, userId, supabaseAdmin);

    // If we have a temporary cover URL (from DALL-E), re-upload with proper vibelog ID
    if (coverImageUrl && coverImageUrl.startsWith('http') && result.vibelogId) {
      try {
        const imageResponse = await fetch(coverImageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const finalCover = await uploadCover(result.vibelogId, imageBuffer, 'image/png');

        if (finalCover.url) {
          // Update vibelog with permanent cover URL
          await supabaseAdmin
            .from('vibelogs')
            .update({ cover_image_url: finalCover.url })
            .eq('id', result.vibelogId);
        }
      } catch (coverSaveError) {
        console.error('⚠️ [MUSIC-UPLOAD] Failed to save permanent cover:', coverSaveError);
      }
    }

    // Trigger async tasks (translations, etc.)
    handleAsyncTasks(result.vibelogId, musicVibelogData, userId, supabase);

    console.log('✅ [MUSIC-UPLOAD] Vibelog created:', result.vibelogId);

    // Build public URL
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
    const publicUrl = result.slug ? `/@${username}/${result.slug}` : `/v/${result.vibelogId}`;

    // Determine success message based on content type
    const successMessage = isText
      ? 'Text post published successfully!'
      : isVideo
        ? 'Music video published successfully!'
        : 'Music track published successfully!';

    return NextResponse.json({
      success: true,
      vibelogId: result.vibelogId,
      slug: result.slug,
      publicUrl,
      mediaType: mediaTypeValue,
      message: successMessage,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error) {
    console.error('💥 [MUSIC-UPLOAD] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
