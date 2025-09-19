import { useRef } from 'react';

import {
  TranscriptionResponse,
  BlogGenerationResponse,
  TeaserResult,
  UpgradePromptState,
  ProcessingData,
} from '@/types/micRecorder';

export interface UseVibelogAPIReturn {
  processTranscription: (audioBlob: Blob) => Promise<string>;
  processBlogGeneration: (transcription: string) => Promise<TeaserResult>;
  processCoverImage: (args: {
    blogContent: string;
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
  // Shared data for transcription and blog generation
  const processingDataRef = useRef<ProcessingData>({
    transcriptionData: '',
    blogContentData: '',
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

  const processTranscription = async (audioFile: Blob): Promise<string> => {
    if (!audioFile) {
      console.error('No audio blob available for processing');
      throw new Error('No audio blob available');
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioFile, 'recording.webm');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        await handleAPIError(transcribeResponse);
      }

      const { transcription }: TranscriptionResponse = await transcribeResponse.json();

      if (!transcription) {
        throw new Error('No transcription received from API');
      }

      processingDataRef.current.transcriptionData = transcription;
      return transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const processBlogGeneration = async (transcriptionData: string): Promise<TeaserResult> => {
    try {
      if (!transcriptionData) {
        console.error('No transcription data available for blog generation');
        throw new Error('No transcription data available');
      }

      const blogResponse = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription: transcriptionData }),
      });

      if (!blogResponse.ok) {
        await handleAPIError(blogResponse);
      }

      const { blogContent }: BlogGenerationResponse = await blogResponse.json();

      if (!blogContent) {
        throw new Error('No blog content received from API');
      }

      // Apply teaser logic
      const teaserResult = createTeaserContent(blogContent);
      // Store the FULL content for cover generation, not the teaser
      processingDataRef.current.blogContentData = blogContent;

      return teaserResult;
    } catch (error) {
      console.error('Blog generation error:', error);
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
    blogContent: string;
    username?: string;
    tags?: string[];
  }) => {
    const { title, summary } = parseMarkdown(args.blogContent);

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
        blogContentData: args.blogContent,
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
    processBlogGeneration,
    processCoverImage,
    uploadAudio,
    processingData: processingDataRef,
  };
}
