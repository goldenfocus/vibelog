'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RecordingState } from '@/components/mic/Controls';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';
import { useProfile } from '@/hooks/useProfile';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVibelogAPI } from '@/hooks/useVibelogAPI';
import { useVoiceActivityDetection } from '@/hooks/useVoiceActivityDetection';
import { useVoiceCloning } from '@/hooks/useVoiceCloning';
import type { CoverImage, ToastState, UpgradePromptState } from '@/types/micRecorder';

interface AttributionDetails {
  markdownSignature: string;
  plainSignature: string;
  profileUrl: string;
  handle: string;
}

interface UseMicStateMachineReturn {
  // State
  recordingState: RecordingState;
  recordingTime: number;
  transcription: string;
  liveTranscript: string;
  canEditLive: boolean; // Can edit live transcript during recording (silence detected)
  vibelogContent: string;
  fullVibelogContent: string;
  parsedVibelog: { title: string | null; body: string };
  isTeaserContent: boolean;
  isEditing: boolean;
  editedContent: string;
  coverImage: CoverImage | null;
  audioLevels: number[];
  audioBlob: Blob | null;
  audioPlayback: ReturnType<typeof useAudioPlayback>;
  toast: ToastState;
  upgradePrompt: UpgradePromptState;
  isLoggedIn: boolean;
  attribution: AttributionDetails;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  handleCopy: (content: string, opts?: { silent?: boolean }) => Promise<void>;
  handleShare: (content?: string) => Promise<void>;
  beginEdit: () => void;
  finalizeEdit: () => void;
  cancelEdit: () => void;
  setEditedContent: (content: string) => void;
  handleTranscriptUpgradeGate: () => void;
  updateTranscript: (newTranscription: string) => void;
  updateLiveTranscript: (newTranscript: string) => void; // Update live transcript during recording
  setUpgradePrompt: (next: UpgradePromptState) => void;
  clearUpgradePrompt: () => void;

  // Processing callbacks
  processTranscription: () => Promise<string>;
  processVibelogGeneration: () => Promise<string>;
  processCoverImage: (vibelogContent?: string) => Promise<CoverImage | null>;
  completeProcessing: () => Promise<void>;
}

const TOAST_DURATION_MS = 3000;
const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const FREE_PLAN_LIMIT_SECONDS = 300;

function normaliseUsername(raw?: string | null): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
}

function buildAttribution(
  isLoggedIn: boolean,
  user: ReturnType<typeof useAuth>['user'],
  profileUsername?: string | null
): AttributionDetails {
  // Use profile username if available (current), otherwise fallback to user_metadata
  const slug =
    profileUsername ||
    (user?.user_metadata?.username && normaliseUsername(user.user_metadata.username)) ||
    (user?.user_metadata?.user_name && normaliseUsername(user.user_metadata.user_name)) ||
    (user?.user_metadata?.preferred_username &&
      normaliseUsername(user.user_metadata.preferred_username)) ||
    (user?.email && normaliseUsername(user.email.split('@')[0]));

  const handle = slug ? `@${slug}` : '@vibelog_creator';
  const profileUrl = slug ? `https://vibelog.io/@${slug}` : 'https://vibelog.io';

  if (isLoggedIn && slug) {
    return {
      markdownSignature: `---\n\n*Created with [VibeLog](https://vibelog.io) by [${handle}](${profileUrl})*`,
      plainSignature: `${handle}\n${profileUrl}`,
      profileUrl,
      handle,
    };
  }

  return {
    markdownSignature: `---\n\n*Created with [VibeLog](https://vibelog.io)*`,
    plainSignature: 'Created with vibelog.io',
    profileUrl,
    handle,
  };
}

function splitTitleFromMarkdown(md: string): { title: string | null; body: string } {
  const lines = md.split(/\r?\n/);
  let title: string | null = null;
  let start = 0;

  for (let i = 0; i < lines.length; i++) {
    const candidate = lines[i].trim();
    if (candidate.startsWith('# ')) {
      title = candidate.replace(/^#\s+/, '').trim();
      start = i + 1;
      break;
    }
  }

  const body = lines.slice(start).join('\n');
  return { title, body };
}

interface UseMicStateMachineOptions {
  remixContent?: string | null;
}

export function useMicStateMachine(
  options: UseMicStateMachineOptions = {}
): UseMicStateMachineReturn {
  const { remixContent } = options;
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const isLoggedIn = Boolean(user);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [vibelogContent, setVibelogContent] = useState('');
  const [fullVibelogContent, setFullVibelogContent] = useState('');
  const [isTeaserContent, setIsTeaserContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null);
  const [audioData, setAudioData] = useState<{ url: string; duration: number } | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptState>({
    visible: false,
    message: '',
    benefits: [],
  });

  const toastTimeoutRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast({ message: '', visible: false });
      toastTimeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const {
    audioLevels,
    audioBlob,
    startRecording: startEngineRecording,
    stopRecording: stopEngineRecording,
    resetAudioEngine,
  } = useAudioEngine(showToast, () => setRecordingState('processing'));

  // Voice Activity Detection - detects silence to enable editing
  const { canEdit: canEditLive } = useVoiceActivityDetection({
    audioLevels,
    isRecording: recordingState === 'recording',
    silenceThreshold: 0.2, // 20% of max volume
    silenceDebounceMs: 2000, // 2 seconds of silence
    voiceDebounceMs: 500, // 0.5 seconds of voice to exit edit mode
  });

  const speechRecognition = useSpeechRecognition({
    recordingState,
    isEditMode: canEditLive,
  });
  const audioPlayback = useAudioPlayback(audioBlob);
  const vibelogAPI = useVibelogAPI(setUpgradePrompt);
  const { saveVibelog } = useBulletproofSave();
  const { cloneVoice } = useVoiceCloning();

  // Use current profile username (not cached user_metadata) for attribution
  const attribution = useMemo(
    () => buildAttribution(isLoggedIn, user, profile?.username),
    [isLoggedIn, user, profile?.username]
  );

  const parsedVibelog = useMemo(() => splitTitleFromMarkdown(vibelogContent), [vibelogContent]);

  // Load remix content when provided
  useEffect(() => {
    if (remixContent) {
      console.log('🎵 Loading remix content...');
      setVibelogContent(remixContent);
      setFullVibelogContent(remixContent);
      setRecordingState('complete');
      showToast('Vibelog loaded for remixing!');
    }
  }, [remixContent, showToast]);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback(() => {
    setRecordingState('idle');
    setTranscription('');
    setVibelogContent('');
    setFullVibelogContent('');
    setIsTeaserContent(false);
    setRecordingTime(0);
    setCoverImage(null);
    setAudioData(null);
    setEditedContent('');
    clearRecordingTimer();
    speechRecognition.resetTranscript();
  }, [clearRecordingTimer, speechRecognition]);

  const startRecording = useCallback(async () => {
    const success = await startEngineRecording();
    if (!success) {
      return;
    }

    setRecordingState('recording');
    setTranscription('');
    setVibelogContent('');
    setFullVibelogContent('');
    setIsTeaserContent(false);
    setRecordingTime(0);
    setCoverImage(null);
    setAudioData(null);

    clearRecordingTimer();
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, [clearRecordingTimer, startEngineRecording]);

  const stopRecording = useCallback(() => {
    stopEngineRecording();
    clearRecordingTimer();
  }, [clearRecordingTimer, stopEngineRecording]);

  const reset = useCallback(() => {
    resetAudioEngine();
    resetRecordingState();
  }, [resetAudioEngine, resetRecordingState]);

  const handleTranscriptUpgradeGate = useCallback(() => {
    if (isLoggedIn) {
      return;
    }

    setUpgradePrompt({
      visible: true,
      message: t('components.micRecorder.loginEditMessage'),
      benefits: [
        t('components.micRecorder.benefit.saveHistory'),
        t('components.micRecorder.benefit.editAnytime'),
      ],
    });
  }, [isLoggedIn, t]);

  const updateTranscript = useCallback(
    (newTranscription: string) => {
      setTranscription(newTranscription);
      showToast(t('components.micRecorder.transcriptUpdated'));
    },
    [showToast, t]
  );

  const handleCopy = useCallback(
    async (content: string, opts: { silent?: boolean } = {}) => {
      const signature = attribution.markdownSignature;
      const contentWithSignature = `${content}\n\n${signature}`;

      try {
        if (navigator.clipboard && 'write' in navigator.clipboard && coverImage) {
          const imageResponse = await fetch(coverImage.url);
          const imageBlob = await imageResponse.blob();
          let clipboardBlob = imageBlob;

          if (imageBlob.type === 'image/jpeg') {
            const img = document.createElement('img');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            clipboardBlob = await new Promise<Blob>((resolve, reject) => {
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error('Failed to convert image to PNG'));
                  }
                }, 'image/png');
              };
              img.onerror = () => reject(new Error('Failed to load cover image'));
              img.src = URL.createObjectURL(imageBlob);
            });
          }

          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': new Blob([contentWithSignature], { type: 'text/plain' }),
              [clipboardBlob.type]: clipboardBlob,
            }),
          ]);

          if (!opts.silent) {
            showToast(t('toast.copiedWithImage'));
          }
          return;
        }

        await navigator.clipboard.writeText(contentWithSignature);
        if (!opts.silent) {
          showToast(t('toast.copied'));
        }
      } catch (error) {
        if (!opts.silent) {
          showToast(t('toast.copyFailed'));
        }
        throw error;
      }
    },
    [attribution.markdownSignature, coverImage, showToast, t]
  );

  const handleShare = useCallback(
    async (content?: string) => {
      const shareContent = content || vibelogContent;
      if (!shareContent) {
        return;
      }

      const attributionBlock = attribution.plainSignature;

      // Check if Web Share API is available
      if (!navigator.share) {
        // No native share support, fall back to copy
        await handleCopy(shareContent);
        showToast(t('toast.copiedForSharing'));
        return;
      }

      try {
        const shareData: ShareData = {
          title: parsedVibelog.title || t('share.title'),
          text: `${shareContent}\n\n${attributionBlock}`,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        };

        // Try to share - keep it simple for maximum compatibility
        await navigator.share(shareData);
        showToast('✨ Shared successfully!');
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          // User cancelled share sheet - this is normal, don't show error
          return;
        }

        // Share failed, log error and fall back to copy
        console.error('Share failed:', error);
        await handleCopy(shareContent);
        showToast(t('toast.copiedForSharing'));
      }
    },
    [attribution.plainSignature, vibelogContent, handleCopy, parsedVibelog.title, showToast, t]
  );

  const beginEdit = useCallback(() => {
    if (!isLoggedIn) {
      handleTranscriptUpgradeGate();
      return;
    }

    setEditedContent(vibelogContent);
    setIsEditing(true);
  }, [vibelogContent, handleTranscriptUpgradeGate, isLoggedIn]);

  const finalizeEdit = useCallback(() => {
    setVibelogContent(editedContent);
    setIsEditing(false);
    showToast(t('components.micRecorder.vibelogUpdated'));
  }, [editedContent, showToast, t]);

  const cancelEdit = useCallback(() => {
    setEditedContent('');
    setIsEditing(false);
  }, []);

  const processTranscription = useCallback(async () => {
    if (!audioBlob) {
      throw new Error('No audio blob available');
    }

    // Generate sessionId first (needed for both transcription and audio upload)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const transcriptionResult = await vibelogAPI.processTranscription(audioBlob, sessionId);
    setTranscription(transcriptionResult);

    vibelogAPI
      .uploadAudio(audioBlob, sessionId, user?.id)
      .then(result => {
        setAudioData(result);
        if (DEBUG_MODE) {
          console.debug('Audio uploaded', result.url);
        }
      })
      .catch(error => {
        if (DEBUG_MODE) {
          console.warn('Audio upload failed', error);
        }
      });

    // Clone voice in the background (don't block transcription)
    if (isLoggedIn && audioBlob.size > 1024 * 1024) {
      // Only clone if logged in and audio is substantial (>1MB, roughly >1 minute)
      // Clone voice asynchronously - don't wait for it
      cloneVoice(
        audioBlob,
        undefined,
        `${profile?.username || user?.email?.split('@')[0] || 'User'}'s Voice`
      )
        .then(voiceId => {
          if (voiceId && DEBUG_MODE) {
            console.log('✅ Voice cloned successfully:', voiceId);
          }
        })
        .catch(error => {
          if (DEBUG_MODE) {
            console.warn('Voice cloning failed (non-blocking):', error);
          }
        });
    }

    return transcriptionResult;
  }, [audioBlob, user?.id, vibelogAPI, isLoggedIn, cloneVoice, profile?.username, user?.email]);

  const processVibelogGeneration = useCallback(async () => {
    const transcriptionData = vibelogAPI.processingData.current.transcriptionData;
    if (!transcriptionData) {
      throw new Error('No transcription data available');
    }

    console.log('🚀 [VIBELOG-GEN] Starting generation...');

    // OPTIMIZATION 2: Enable streaming for real-time content delivery
    const teaserResult = await vibelogAPI.processVibelogGeneration(transcriptionData, {
      enableStreaming: true,
      onStreamChunk: (_chunk: string) => {
        // Optional: Update UI with streaming chunks in real-time
        // Streaming logs disabled to reduce console noise
      },
    });

    console.log('✅ [VIBELOG-GEN] Generation complete, setting state...');

    setVibelogContent(teaserResult.content);
    setFullVibelogContent(teaserResult.fullContent || teaserResult.content);
    setIsTeaserContent(teaserResult.isTeaser);

    // FIX: Set the ref so completeProcessing can access content immediately (before React state updates)
    vibelogAPI.processingData.current.vibelogContentData =
      teaserResult.fullContent || teaserResult.content;

    console.log('💾 [VIBELOG-GEN] Content stored in ref:', {
      refLength: vibelogAPI.processingData.current.vibelogContentData?.length || 0,
      hasContent: !!vibelogAPI.processingData.current.vibelogContentData,
    });

    return teaserResult.fullContent || teaserResult.content;
  }, [vibelogAPI]);

  const processCoverImage = useCallback(
    async (vibelogContentOverride?: string) => {
      try {
        const contentToUse =
          vibelogContentOverride ||
          vibelogAPI.processingData.current.vibelogContentData ||
          fullVibelogContent;

        if (!contentToUse) {
          return null;
        }

        const image = await vibelogAPI.processCoverImage({ vibelogContent: contentToUse });
        setCoverImage(image);
        return image;
      } catch (error) {
        if (DEBUG_MODE) {
          console.warn('Cover generation failed', error);
        }
        return null;
      }
    },
    [fullVibelogContent, vibelogAPI]
  );

  const completeProcessing = useCallback(async () => {
    console.log('🎯 [COMPLETE-PROCESSING] Starting save process at', Date.now());

    // CRITICAL FIX: Wait for content to be available (with timeout)
    const maxWaitTime = 30000; // 30 seconds max (increased for slow connections)
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const hasContent =
        fullVibelogContent ||
        vibelogContent ||
        vibelogAPI.processingData.current.vibelogContentData;

      if (hasContent && hasContent.length > 50) {
        console.log(
          '✅ [COMPLETE-PROCESSING] Content available after',
          Date.now() - startTime,
          'ms'
        );
        break;
      }

      const elapsed = Date.now() - startTime;
      // Only log every 2 seconds to avoid console spam
      if (elapsed % 2000 < checkInterval) {
        console.log('⏳ [COMPLETE-PROCESSING] Waiting for content... elapsed:', elapsed, 'ms');
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // Debug: Check what's in the ref
    console.log('🔍 [COMPLETE-PROCESSING] Ref contents:', {
      refExists: !!vibelogAPI.processingData.current,
      vibelogContentDataLength: vibelogAPI.processingData.current.vibelogContentData?.length || 0,
      vibelogContentDataPreview: vibelogAPI.processingData.current.vibelogContentData?.substring(
        0,
        100
      ),
      transcriptionDataLength: vibelogAPI.processingData.current.transcriptionData?.length || 0,
    });

    // FIX: Use fullVibelogContent as primary source, then fallback to ref
    const contentToSave =
      fullVibelogContent || vibelogContent || vibelogAPI.processingData.current.vibelogContentData;

    console.log('📝 [COMPLETE-PROCESSING] Content check:', {
      hasFullVibelogContent: !!fullVibelogContent,
      fullVibelogContentLength: fullVibelogContent?.length || 0,
      hasVibelogContent: !!vibelogContent,
      vibelogContentLength: vibelogContent?.length || 0,
      hasProcessingData: !!vibelogAPI.processingData.current.vibelogContentData,
      processingDataLength: vibelogAPI.processingData.current.vibelogContentData?.length || 0,
      contentLength: contentToSave?.length || 0,
    });

    if (!contentToSave) {
      console.error('❌ [COMPLETE-PROCESSING] No content available to save');
      if (DEBUG_MODE) {
        console.warn('No content available to save after processing');
      }
      showToast(t('components.micRecorder.noContentToSave'));
      setRecordingState('complete');
      return;
    }

    try {
      const fullContent = vibelogAPI.processingData.current.vibelogContentData || contentToSave;

      // CRITICAL: Wait for cover image generation to complete before saving
      let finalCoverImage = coverImage;
      if (!finalCoverImage) {
        console.log('⏳ [COMPLETE-PROCESSING] Cover image not ready, generating now...');
        try {
          const generatedCover = await processCoverImage(fullContent);
          if (generatedCover) {
            finalCoverImage = generatedCover;
            console.log('✅ [COMPLETE-PROCESSING] Cover image generated successfully!');
          } else {
            console.log('⚠️  [COMPLETE-PROCESSING] Cover image generation returned null');
          }
        } catch (error) {
          console.error('❌ [COMPLETE-PROCESSING] Cover image generation failed:', error);
          // Continue without cover image - don't block the save
        }
      } else {
        console.log(
          '✅ [COMPLETE-PROCESSING] Cover image already available from background generation'
        );
      }

      console.log('💾 [COMPLETE-PROCESSING] Calling saveVibelog with:', {
        contentLength: contentToSave.length,
        fullContentLength: fullContent.length,
        hasTranscription: !!transcription,
        hasCoverImage: !!finalCoverImage,
        hasAudioData: !!audioData,
        userId: user?.id || 'anonymous',
      });

      const result = await saveVibelog({
        content: contentToSave,
        fullContent,
        transcription: transcription || '',
        coverImage: finalCoverImage || undefined,
        audioData: audioData || undefined,
        userId: user?.id,
        isTeaser: isTeaserContent,
        metadata: {
          recordingTime,
          processingSteps: ['transcribe', 'generate', 'format', 'image'],
          clientVersion: '1.0.0',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        },
      });

      if (result.success) {
        // CRITICAL: Store sessionId for anonymous users to claim later
        if (result.isAnonymous && result.sessionId && typeof window !== 'undefined') {
          try {
            // Store in localStorage so we can claim after sign-in
            const existingSessions = localStorage.getItem('vibelog_anonymous_sessions');
            const sessions = existingSessions ? JSON.parse(existingSessions) : [];
            if (!sessions.includes(result.sessionId)) {
              sessions.push(result.sessionId);
              localStorage.setItem('vibelog_anonymous_sessions', JSON.stringify(sessions));
              console.log('💾 [SAVE] Stored anonymous sessionId for claiming:', result.sessionId);
            }
          } catch (err) {
            console.warn('Failed to store sessionId:', err);
          }
        }

        // Clone voice after saving vibelog (if we have audio and vibelogId)
        if (audioBlob && result.vibelogId && isLoggedIn && audioBlob.size > 1024 * 1024) {
          // Only clone if logged in and audio is substantial (>1MB, roughly >1 minute)
          // Clone voice asynchronously - don't wait for it
          cloneVoice(
            audioBlob,
            result.vibelogId,
            `${profile?.username || user?.email?.split('@')[0] || 'User'}'s Voice`
          )
            .then(voiceId => {
              if (voiceId && DEBUG_MODE) {
                console.log('✅ Voice cloned and saved with vibelog:', voiceId, result.vibelogId);
              }
            })
            .catch(error => {
              if (DEBUG_MODE) {
                console.warn('Voice cloning failed after save (non-blocking):', error);
              }
            });
        }

        if (result.warnings?.length) {
          const criticalWarnings = result.warnings.filter((warning: string) => {
            return (
              !warning.includes('Title was auto-generated') &&
              !warning.includes('Used direct insert fallback') &&
              !warning.includes('Stored in failures table') &&
              !warning.includes('Main insert failed but data was preserved')
            );
          });

          if (criticalWarnings.length) {
            showToast(t('components.micRecorder.savedWithWarnings'));
          } else {
            showToast(result.message || t('components.micRecorder.saved'));
          }
        } else {
          showToast(result.message || t('components.micRecorder.saved'));
        }
      } else {
        showToast(t('components.micRecorder.saveFallback'));
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('Unexpected auto-save error', error);
      }
      showToast(t('components.micRecorder.saveFallback'));
    }

    setTimeout(() => {
      setRecordingState('complete');
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    audioData,
    coverImage,
    fullVibelogContent,
    isTeaserContent,
    processCoverImage,
    recordingTime,
    saveVibelog,
    showToast,
    t,
    transcription,
    user?.id,
    // Note: vibelogAPI.processingData is a ref, not a state value, so it doesn't need to be in deps
    // Including it causes stale closure issues where the ref data isn't accessible
    vibelogContent,
  ]);

  useEffect(() => {
    const limit = FREE_PLAN_LIMIT_SECONDS;
    if (recordingState === 'recording' && recordingTime >= limit) {
      stopRecording();
      showToast(
        t('components.micRecorder.timeLimitReached', {
          minutes: Math.round(limit / 60),
        })
      );
    }
  }, [recordingState, recordingTime, showToast, stopRecording, t]);

  useEffect(
    () => () => {
      clearRecordingTimer();
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    },
    [clearRecordingTimer]
  );

  return {
    recordingState,
    recordingTime,
    transcription,
    liveTranscript: speechRecognition.liveTranscript,
    canEditLive,
    vibelogContent,
    fullVibelogContent,
    parsedVibelog,
    isTeaserContent,
    isEditing,
    editedContent,
    coverImage,
    audioLevels,
    audioBlob,
    audioPlayback,
    toast,
    upgradePrompt,
    isLoggedIn,
    attribution,
    startRecording,
    stopRecording,
    reset,
    handleCopy,
    handleShare,
    beginEdit,
    finalizeEdit,
    cancelEdit,
    setEditedContent,
    handleTranscriptUpgradeGate,
    updateTranscript,
    updateLiveTranscript: speechRecognition.updateTranscript,
    setUpgradePrompt,
    clearUpgradePrompt: () => setUpgradePrompt({ visible: false, message: '', benefits: [] }),
    processTranscription,
    processVibelogGeneration,
    processCoverImage,
    completeProcessing,
  };
}
