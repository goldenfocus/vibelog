'use client';

/**
 * Video State Machine Hook
 * Mirrors useMicStateMachine but for video recording flow
 * Key difference: Video blob is used for both transcription and storage
 */

import { useCallback, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useToneSettings } from '@/hooks/useToneSettings';
import { useVibelogAPI } from '@/hooks/useVibelogAPI';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import type { CoverImage, UpgradePromptState } from '@/types/micRecorder';

export type VideoRecordingState =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'recording'
  | 'preview'
  | 'processing'
  | 'complete'
  | 'error';

export interface ProcessingStep {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
}

interface UseVideoStateMachineReturn {
  // State
  recordingState: VideoRecordingState;
  recordingTime: number;
  videoBlob: Blob | null;
  videoUrl: string | null;
  transcription: string;
  vibelogContent: string;
  vibelogId: string | null;
  coverImage: CoverImage | null;
  error: string | null;
  upgradePrompt: UpgradePromptState;

  // Processing state
  processingSteps: ProcessingStep[];
  activeStepIndex: number;

  // Actions
  setVideoBlob: (blob: Blob | null) => void;
  setRecordingState: (state: VideoRecordingState) => void;
  setRecordingTime: (time: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Processing callbacks (called by VideoProcessingAnimation)
  processVideoUpload: () => Promise<string>;
  processTranscription: () => Promise<string>;
  processVibelogGeneration: () => Promise<string>;
  processCoverImage: (vibelogContent?: string) => Promise<CoverImage | null>;
  completeProcessing: () => Promise<void>;
}

export function useVideoStateMachine(options: {
  vibelogId: string;
  onComplete?: (videoUrl: string) => void;
  onSaveSuccess?: () => void;
}): UseVideoStateMachineReturn {
  const { vibelogId: initialVibelogId, onComplete, onSaveSuccess } = options;

  const { user: _user } = useAuth();
  const { tone } = useToneSettings();
  const { uploadVideo } = useVideoUpload();

  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptState>({
    visible: false,
    message: '',
    benefits: [],
  });
  const vibelogAPI = useVibelogAPI(setUpgradePrompt);

  // State
  const [recordingState, setRecordingState] = useState<VideoRecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [_detectedLanguage, setDetectedLanguage] = useState<string | undefined>();
  const [vibelogContent, setVibelogContent] = useState('');
  const [fullVibelogContent, setFullVibelogContent] = useState('');
  const [vibelogId, _setVibelogId] = useState<string | null>(initialVibelogId);
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Processing steps state
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Refs for processing data
  const processingDataRef = useRef<{
    videoUrl: string | null;
    transcription: string;
    vibelogContent: string;
  }>({
    videoUrl: null,
    transcription: '',
    vibelogContent: '',
  });

  const reset = useCallback(() => {
    setRecordingState('idle');
    setRecordingTime(0);
    setVideoBlob(null);
    setVideoUrl(null);
    setTranscription('');
    setVibelogContent('');
    setFullVibelogContent('');
    setCoverImage(null);
    setError(null);
    setProcessingSteps([]);
    setActiveStepIndex(0);
    processingDataRef.current = {
      videoUrl: null,
      transcription: '',
      vibelogContent: '',
    };
  }, []);

  // Step 1: Upload video to storage
  const processVideoUpload = useCallback(async () => {
    if (!videoBlob || !vibelogId) {
      throw new Error('No video blob or vibelog ID available');
    }

    console.log('📹 [VIDEO-STATE] Uploading video...', {
      blobSize: videoBlob.size,
      vibelogId,
    });

    const result = await uploadVideo({
      videoBlob,
      vibelogId,
      source: 'captured',
      captureMode: 'camera',
    });

    console.log('✅ [VIDEO-STATE] Video uploaded:', result.url);
    setVideoUrl(result.url);
    processingDataRef.current.videoUrl = result.url;

    return result.url;
  }, [videoBlob, vibelogId, uploadVideo]);

  // Step 2: Transcribe video (Whisper extracts audio from video)
  const processTranscription = useCallback(async () => {
    if (!videoBlob) {
      throw new Error('No video blob available');
    }

    console.log('🎤 [VIDEO-STATE] Transcribing video audio...');

    const sessionId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { transcription: transcriptionResult, detectedLanguage: detectedLang } =
      await vibelogAPI.processTranscription(videoBlob, sessionId);

    console.log('✅ [VIDEO-STATE] Transcription complete:', transcriptionResult.substring(0, 100));

    setTranscription(transcriptionResult);
    setDetectedLanguage(detectedLang);
    processingDataRef.current.transcription = transcriptionResult;

    // Store in vibelogAPI for generation step
    vibelogAPI.processingData.current.transcriptionData = transcriptionResult;
    // FIX: Store language in ref so processVibelogGeneration can access it immediately
    vibelogAPI.processingData.current.detectedLanguage = detectedLang;

    return transcriptionResult;
  }, [videoBlob, vibelogAPI]);

  // Step 3: Generate vibelog content from transcription
  const processVibelogGeneration = useCallback(async () => {
    const transcriptionData =
      processingDataRef.current.transcription ||
      vibelogAPI.processingData.current.transcriptionData;

    if (!transcriptionData) {
      throw new Error('No transcription data available');
    }

    // FIX: Use ref instead of state to avoid React async state timing issues
    const languageFromRef = vibelogAPI.processingData.current.detectedLanguage;

    console.log('🚀 [VIDEO-STATE] Generating vibelog content...');
    console.log('🎨 [VIDEO-STATE] Using tone:', tone);
    console.log('🌐 [VIDEO-STATE] Detected language:', languageFromRef);

    const teaserResult = await vibelogAPI.processVibelogGeneration(transcriptionData, {
      enableStreaming: false,
      tone,
      detectedLanguage: languageFromRef,
    });

    console.log('✅ [VIDEO-STATE] Vibelog generated');

    setVibelogContent(teaserResult.content);
    setFullVibelogContent(teaserResult.fullContent || teaserResult.content);
    processingDataRef.current.vibelogContent = teaserResult.fullContent || teaserResult.content;
    vibelogAPI.processingData.current.vibelogContentData =
      teaserResult.fullContent || teaserResult.content;

    return teaserResult.fullContent || teaserResult.content;
  }, [vibelogAPI, tone]);

  // Step 4: Generate cover image
  const processCoverImage = useCallback(
    async (vibelogContentOverride?: string) => {
      try {
        const contentToUse =
          vibelogContentOverride ||
          processingDataRef.current.vibelogContent ||
          vibelogAPI.processingData.current.vibelogContentData ||
          fullVibelogContent;

        if (!contentToUse) {
          console.warn('[VIDEO-STATE] No content available for cover image');
          return null;
        }

        console.log('🖼️ [VIDEO-STATE] Generating cover image...');

        const image = await vibelogAPI.processCoverImage({ vibelogContent: contentToUse });
        setCoverImage(image);

        console.log('✅ [VIDEO-STATE] Cover image generated');
        return image;
      } catch (error) {
        console.warn('[VIDEO-STATE] Cover generation failed:', error);
        return null;
      }
    },
    [fullVibelogContent, vibelogAPI]
  );

  // Step 5: Complete processing - UPDATE existing vibelog (not create new)
  // IMPORTANT: We must UPDATE the existing vibelog that already has video_url set
  const completeProcessing = useCallback(async () => {
    console.log('🎯 [VIDEO-STATE] Completing processing...');

    if (!vibelogId) {
      console.error('❌ [VIDEO-STATE] No vibelog ID available');
      setError('No vibelog ID');
      setRecordingState('error');
      return;
    }

    const contentToSave =
      processingDataRef.current.vibelogContent ||
      vibelogAPI.processingData.current.vibelogContentData ||
      fullVibelogContent ||
      vibelogContent;

    if (!contentToSave) {
      console.error('❌ [VIDEO-STATE] No content available to save');
      setError('No content generated');
      setRecordingState('error');
      return;
    }

    try {
      // Wait for cover image if not ready
      let finalCoverImage = coverImage;
      if (!finalCoverImage) {
        console.log('⏳ [VIDEO-STATE] Generating cover image...');
        try {
          finalCoverImage = await processCoverImage(contentToSave);
        } catch {
          console.warn('[VIDEO-STATE] Cover image failed, continuing without it');
        }
      }

      // Extract title from content (first # heading or first line)
      const lines = contentToSave.split(/\r?\n/);
      let title = 'Video Vibelog';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          title = trimmed.replace(/^#\s+/, '').trim();
          break;
        }
      }

      console.log('💾 [VIDEO-STATE] Updating existing vibelog...', {
        vibelogId,
        title,
        contentLength: contentToSave.length,
        hasVideo: !!processingDataRef.current.videoUrl,
        hasCover: !!finalCoverImage,
      });

      // UPDATE the existing vibelog via save-vibelog API with vibelogId
      // This will update the record that already has video_url set
      const response = await fetch('/api/save-vibelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId, // Pass existing ID to trigger update instead of insert
          title,
          content: contentToSave,
          fullContent: contentToSave,
          transcription: processingDataRef.current.transcription || transcription,
          coverImage: finalCoverImage || undefined,
          isPublished: true,
          isPublic: true,
          metadata: {
            recordingTime,
            source: 'video',
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [VIDEO-STATE] Vibelog updated:', result.vibelogId || vibelogId);

        if (onSaveSuccess) {
          console.log('🔄 [VIDEO-STATE] Triggering feed refresh');
          onSaveSuccess();
        }

        if (onComplete && processingDataRef.current.videoUrl) {
          onComplete(processingDataRef.current.videoUrl);
        }
      } else {
        console.error('❌ [VIDEO-STATE] Save failed:', result.message);
        // Don't fail completely - video is already uploaded
      }
    } catch (err) {
      console.error('❌ [VIDEO-STATE] Complete processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save vibelog');
    }

    setRecordingState('complete');
  }, [
    coverImage,
    fullVibelogContent,
    onComplete,
    onSaveSuccess,
    processCoverImage,
    recordingTime,
    transcription,
    vibelogAPI.processingData,
    vibelogContent,
    vibelogId,
  ]);

  return {
    recordingState,
    recordingTime,
    videoBlob,
    videoUrl,
    transcription,
    vibelogContent,
    vibelogId,
    coverImage,
    error,
    upgradePrompt,
    processingSteps,
    activeStepIndex,
    setVideoBlob,
    setRecordingState,
    setRecordingTime,
    setError,
    reset,
    processVideoUpload,
    processTranscription,
    processVibelogGeneration,
    processCoverImage,
    completeProcessing,
  };
}
