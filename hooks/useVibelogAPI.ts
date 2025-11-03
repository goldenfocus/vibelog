import { useRef } from 'react';

import {
  TranscriptionResponse,
  VibelogGenerationResponse,
  TeaserResult,
  UpgradePromptState,
  ProcessingData,
} from '@/types/micRecorder';

export interface UseVibelogAPIReturn {
  processTranscription: (audioBlob: Blob, sessionId?: string) => Promise<string>;
  processVibelogGeneration: (
    transcription: string,
    options?: {
      enableStreaming?: boolean;
      onStreamChunk?: (chunk: string) => void;
      tone?: string;
      keepFillerWords?: boolean;
    }
  ) => Promise<TeaserResult>;
  processCoverImage: (args: {
    vibelogContent: string;
    username?: string;
    tags?: string[];
  }) => Promise<{ url: string; alt: string; width: number; height: number }>;
  uploadAudio: (
    audioBlob: Blob,
    sessionId: string,
    userId?: string
  ) => Promise<{ url: string; duration: number }>;
  processingData: React.MutableRefObject<ProcessingData>;
}

export function useVibelogAPI(
  onUpgradePrompt: (prompt: UpgradePromptState) => void
): UseVibelogAPIReturn {
  const DEBUG_MODE = process.env.NODE_ENV !== 'production';
  // Shared data for transcription and vibelog generation
  const processingDataRef = useRef<ProcessingData>({
    transcriptionData: '',
    vibelogContentData: '',
  });

  const createTeaserContent = (fullContent: string): TeaserResult => {
    // Always create a teaser for non-logged users to encourage signup
    // Target: Show approximately 3 paragraphs or ~3-4 sentences maximum

    // Split content into paragraphs first
    const paragraphs = fullContent.split('\n\n').filter(p => p.trim().length > 0);

    // If we have 3 or fewer short paragraphs, show them all
    if (paragraphs.length <= 3 && fullContent.length <= 800) {
      return { content: fullContent, isTeaser: true, fullContent };
    }

    // For longer content, create a meaningful teaser
    let teaserContent = '';
    let paragraphCount = 0;

    // Try to include up to 3 paragraphs or until we hit a reasonable length limit
    for (const paragraph of paragraphs) {
      if (paragraphCount >= 3) {
        break;
      }

      const potentialContent = teaserContent + (teaserContent ? '\n\n' : '') + paragraph;

      // Stop if adding this paragraph would make it too long (aim for ~600-800 chars)
      if (potentialContent.length > 800 && paragraphCount > 0) {
        break;
      }

      teaserContent = potentialContent;
      paragraphCount++;

      // If we've got a good amount of content (600+ chars), stop here
      if (teaserContent.length >= 600) {
        break;
      }
    }

    // Fallback: if paragraph-based approach didn't work well, use sentence-based
    if (!teaserContent || teaserContent.length < 300) {
      const sentences = fullContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
      teaserContent = '';
      let sentenceCount = 0;
      const maxSentences = 4; // Aim for 3-4 sentences max

      for (let i = 0; i < sentences.length && sentenceCount < maxSentences; i++) {
        const sentence = sentences[i].trim() + '.';
        const potentialContent = teaserContent + (teaserContent ? ' ' : '') + sentence;

        // Stop if this would make it too long and we already have some content
        if (potentialContent.length > 800 && teaserContent.length > 300) {
          break;
        }

        teaserContent = potentialContent;
        sentenceCount++;
      }
    }

    // Ensure we have at least some content
    if (!teaserContent) {
      const firstSentence = fullContent.split(/[.!?]+/)[0];
      teaserContent = firstSentence
        ? firstSentence.trim() + '.'
        : fullContent.slice(0, 400) + '...';
    }

    return {
      content: teaserContent,
      isTeaser: true,
      fullContent,
    };
  };

  const handleAPIError = async (response: Response): Promise<never> => {
    if (response.status === 429) {
      try {
        const errorData = await response.json();
        if (errorData.upgrade) {
          // Show upgrade prompt instead of error
          onUpgradePrompt({
            visible: true,
            message: errorData.message || 'Daily limit reached. Sign in to get more requests!',
            benefits: errorData.upgrade.benefits || [],
            resetTime: errorData.reset,
          });
          throw new Error('UPGRADE_PROMPT_SHOWN'); // Special error to stop processing
        }
        // If we got JSON but no upgrade info, throw with the parsed error
        console.error(`API failed with status ${response.status}:`, errorData);
        throw new Error(`API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      } catch {
        // If JSON parsing fails, try to get text (but response may already be consumed)
        try {
          const errorText = await response.text();
          console.error(`API failed with status ${response.status}:`, errorText);
          throw new Error(`API failed: ${response.status} - ${errorText}`);
        } catch {
          // If both JSON and text fail, just use status
          console.error(`API failed with status ${response.status}`);
          throw new Error(`API failed: ${response.status}`);
        }
      }
    } else {
      // For non-429 errors, try to get error text
      try {
        const errorText = await response.text();
        console.error(`API failed with status ${response.status}:`, errorText);
        throw new Error(`API failed: ${response.status} - ${errorText}`);
      } catch {
        console.error(`API failed with status ${response.status}`);
        throw new Error(`API failed: ${response.status}`);
      }
    }
  };

  const processTranscription = async (audioFile: Blob, sessionId?: string): Promise<string> => {
    if (!audioFile) {
      console.error('No audio blob available for processing');
      throw new Error('No audio blob available');
    }

    try {
      console.log('🎤 Starting transcription process...');
      console.log(
        '📦 Audio file size:',
        audioFile.size,
        'bytes',
        `(${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`
      );

      // NEW FLOW: Get presigned URL, then upload directly to Supabase
      // This bypasses Vercel's 4.5MB serverless function limit

      // Step 1: Get presigned upload URL from server
      console.log('🔑 Getting presigned upload URL...');
      const urlResponse = await fetch('/api/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: audioFile.type,
          fileSize: audioFile.size,
          sessionId, // Pass sessionId for anonymous users
        }),
      });

      if (!urlResponse.ok) {
        await handleAPIError(urlResponse);
      }

      const { uploadUrl, storagePath } = await urlResponse.json();
      console.log('✅ Got presigned URL. Path:', storagePath);

      // Step 2: Upload directly to Supabase Storage (bypasses Vercel limits!)
      console.log(
        '⬆️  Uploading to storage...',
        `(${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`
      );
      // Strip codecs parameter from MIME type (e.g., "audio/webm;codecs=opus" -> "audio/webm")
      const contentType = audioFile.type.split(';')[0].trim();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioFile,
        headers: {
          'Content-Type': contentType,
          'x-upsert': 'false',
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Storage upload failed:', uploadResponse.status, errorText);
        throw new Error(`Storage upload failed: ${uploadResponse.status}`);
      }

      console.log('✅ Upload complete! Path:', storagePath);

      // Step 3: Request transcription (API downloads from storage)
      console.log('🎯 Requesting transcription...');
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      });

      if (!transcribeResponse.ok) {
        await handleAPIError(transcribeResponse);
      }

      const { transcription }: TranscriptionResponse = await transcribeResponse.json();

      if (!transcription) {
        throw new Error('No transcription received from API');
      }

      console.log('✅ Transcription complete!');
      processingDataRef.current.transcriptionData = transcription;
      return transcription;
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw error;
    }
  };

  const processVibelogGeneration = async (
    transcriptionData: string,
    options?: {
      enableStreaming?: boolean;
      onStreamChunk?: (chunk: string) => void;
      tone?: string;
      keepFillerWords?: boolean;
    }
  ): Promise<TeaserResult> => {
    try {
      if (!transcriptionData) {
        console.error('No transcription data available for vibelog generation');
        throw new Error('No transcription data available');
      }

      // OPTIMIZATION 2: Enable streaming for faster perceived performance
      const enableStreaming = options?.enableStreaming ?? false;
      const tone = options?.tone;
      const keepFillerWords = options?.keepFillerWords;

      const vibelogResponse = await fetch('/api/generate-vibelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: transcriptionData,
          stream: enableStreaming,
          ...(tone && { tone }),
          ...(keepFillerWords !== undefined && { keepFillerWords }),
        }),
      });

      if (!vibelogResponse.ok) {
        await handleAPIError(vibelogResponse);
      }

      // OPTIMIZATION 2: Handle streaming response
      if (
        enableStreaming &&
        vibelogResponse.headers.get('content-type')?.includes('text/event-stream')
      ) {
        const reader = vibelogResponse.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          try {
            let streamComplete = false;
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    streamComplete = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      fullContent += parsed.content;
                      options?.onStreamChunk?.(parsed.content);
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }

              // Break outer loop when stream is complete
              if (streamComplete) {
                break;
              }
            }
          } finally {
            reader.releaseLock();
          }
        }

        // Parse the streamed content
        const teaserMatch = fullContent.match(/---TEASER---\s*([\s\S]*?)---FULL---/);
        const fullMatch = fullContent.match(/---FULL---\s*([\s\S]*?)$/);

        let teaser = '';
        let vibelogContent = '';

        if (teaserMatch && fullMatch) {
          teaser = teaserMatch[1].trim();
          vibelogContent = fullMatch[1].trim();
        } else {
          vibelogContent = fullContent;
          teaser = createTeaserContent(vibelogContent).content;
        }

        const teaserResult: TeaserResult = {
          content: teaser,
          isTeaser: true,
          fullContent: vibelogContent,
        };

        // Store the FULL content for cover generation
        processingDataRef.current.vibelogContentData = vibelogContent;

        console.log('💾 [VIBELOG-GEN-STREAM] Stored in processingDataRef at', Date.now(), {
          length: vibelogContent.length,
          refHasData: !!processingDataRef.current.vibelogContentData,
          preview: vibelogContent.substring(0, 100),
        });

        if (DEBUG_MODE) {
          console.log('🎯 [VIBELOG-GEN-STREAM] Teaser length:', teaserResult.content.length);
          console.log('🎯 [VIBELOG-GEN-STREAM] Full content length:', vibelogContent.length);
        }

        return teaserResult;
      }

      // Non-streaming response (backward compatible)
      const { vibelogTeaser, vibelogContent }: VibelogGenerationResponse =
        await vibelogResponse.json();

      if (!vibelogContent) {
        throw new Error('No vibelog content received from API');
      }

      // Use AI-generated teaser if available, otherwise fall back to client-side teaser logic
      const teaserResult: TeaserResult = vibelogTeaser
        ? {
            content: vibelogTeaser,
            isTeaser: true,
            fullContent: vibelogContent,
          }
        : createTeaserContent(vibelogContent);

      // Store the FULL content for cover generation, not the teaser
      processingDataRef.current.vibelogContentData = vibelogContent;

      if (DEBUG_MODE) {
        console.log('🎯 [VIBELOG-GEN] Teaser length:', teaserResult.content.length);
        console.log('🎯 [VIBELOG-GEN] Full content length:', vibelogContent.length);
        console.log('🎯 [VIBELOG-GEN] Using AI-generated teaser:', !!vibelogTeaser);
      }

      return teaserResult;
    } catch (error) {
      console.error('Vibelog generation error:', error);
      throw error;
    }
  };

  // Extract title and summary from markdown (improved heuristics)
  function parseMarkdown(md: string): { title: string; summary?: string } {
    const lines = md.split(/\r?\n/);
    let title = 'Untitled';
    let summary = '';
    let i = 0;

    // Look for the first heading (# title)
    for (; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith('# ')) {
        title = l.replace(/^#\s+/, '').trim();
        i++;
        break;
      }
    }

    // Look for the first meaningful paragraph as summary
    for (; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) {
        continue;
      } // Skip empty lines
      if (l.startsWith('#')) {
        break;
      } // Stop at next heading
      if (l.startsWith('![')) {
        continue;
      } // Skip image markdown
      if (l.startsWith('---')) {
        continue;
      } // Skip separators

      // Clean the line and use it as summary
      const cleanLine = l
        .replace(/^\*+\s*/, '') // Remove bullet points
        .replace(/^\d+\.\s*/, '') // Remove numbered lists
        .replace(/^>\s*/, '') // Remove blockquotes
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
        .replace(/`([^`]+)`/g, '$1') // Remove code formatting
        .trim();

      if (cleanLine && cleanLine.length > 10) {
        // Require meaningful length
        summary = cleanLine;
        break;
      }
    }

    return { title, summary };
  }

  const uploadAudio = async (
    audioBlob: Blob,
    sessionId: string,
    userId?: string
  ): Promise<{ url: string; duration: number }> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId);
      if (userId) {
        formData.append('userId', userId);
      }

      if (DEBUG_MODE) {
        console.log('🎵 [AUDIO-UPLOAD] Uploading original recording...');
      }

      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('Audio upload failed:', response.status, text);
        throw new Error(`Audio upload failed: ${response.status}`);
      }

      const data = await response.json();
      if (DEBUG_MODE) {
        console.log('✅ [AUDIO-UPLOAD] Upload successful:', data.url);
      }

      // Calculate duration from blob (approximate)
      const duration = await getAudioDuration(audioBlob);

      return {
        url: data.url,
        duration: duration || 0,
      };
    } catch (error) {
      console.error('Audio upload error:', error);
      // Don't fail the whole process if audio upload fails
      return { url: '', duration: 0 };
    }
  };

  // Helper function to get audio duration
  const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise(resolve => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });

      audio.src = url;
    });
  };

  const processCoverImage = async (args: {
    vibelogContent: string;
    username?: string;
    tags?: string[];
  }) => {
    const { title, summary } = parseMarkdown(args.vibelogContent);

    try {
      const requestBody = { title, summary, username: args.username, tags: args.tags };

      const res = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Cover generation failed:', res.status, text);
        throw new Error(`Cover generation failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      processingDataRef.current = {
        ...processingDataRef.current,
        vibelogContentData: args.vibelogContent,
      };

      return {
        url: data.url as string,
        alt: data.alt as string,
        width: data.width as number,
        height: data.height as number,
      };
    } catch (e) {
      console.error('Cover generation error, using fallback:', e);
      return {
        url: '/og-image.png',
        alt: `${title} — cinematic cover image`,
        width: 1200,
        height: 630,
      };
    }
  };

  return {
    processTranscription,
    processVibelogGeneration,
    processCoverImage,
    uploadAudio,
    processingData: processingDataRef,
  };
}
