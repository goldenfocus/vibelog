'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RecordingState } from '@/components/mic/Controls';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVibelogAPI } from '@/hooks/useVibelogAPI';
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
  blogContent: string;
  fullBlogContent: string;
  parsedBlog: { title: string | null; body: string };
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
  setUpgradePrompt: (next: UpgradePromptState) => void;
  clearUpgradePrompt: () => void;

  // Processing callbacks
  processTranscription: () => Promise<string>;
  processBlogGeneration: () => Promise<string>;
  processCoverImage: (blogContent?: string) => Promise<CoverImage | null>;
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
  user: ReturnType<typeof useAuth>['user']
): AttributionDetails {
  const metadata = user?.user_metadata ?? {};
  const slug =
    normaliseUsername(metadata.username) ||
    normaliseUsername(metadata.user_name) ||
    normaliseUsername(metadata.preferred_username) ||
    normaliseUsername((user?.email || '').split('@')[0]);

  const handle = slug ? `@${slug}` : '@vibelog_creator';
  const profileUrl = slug ? `https://vibelog.io/${slug}` : 'https://vibelog.io';

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

export function useMicStateMachine(): UseMicStateMachineReturn {
  const { t } = useI18n();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [fullBlogContent, setFullBlogContent] = useState('');
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

  const speechRecognition = useSpeechRecognition(recordingState);
  const audioPlayback = useAudioPlayback(audioBlob);
  const vibelogAPI = useVibelogAPI(setUpgradePrompt);
  const { saveVibelog } = useBulletproofSave();

  const attribution = useMemo(() => buildAttribution(isLoggedIn, user), [isLoggedIn, user]);

  const parsedBlog = useMemo(() => splitTitleFromMarkdown(blogContent), [blogContent]);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback(() => {
    setRecordingState('idle');
    setTranscription('');
    setBlogContent('');
    setFullBlogContent('');
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
    setBlogContent('');
    setFullBlogContent('');
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
      message: t('components.micRecorder.loginEditMessage', 'Sign in to edit your transcript.'),
      benefits: [
        t(
          'components.micRecorder.benefit.saveHistory',
          'Keep an unlimited history of your vibelogs.'
        ),
        t(
          'components.micRecorder.benefit.editAnytime',
          'Edit transcripts and polished posts anytime.'
        ),
      ],
    });
  }, [isLoggedIn, t]);

  const updateTranscript = useCallback(
    (newTranscription: string) => {
      setTranscription(newTranscription);
      showToast(t('components.micRecorder.transcriptUpdated', 'Transcript updated successfully!'));
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
            showToast(t('toast.copiedWithImage', 'Copied text and cover image!'));
          }
          return;
        }

        await navigator.clipboard.writeText(contentWithSignature);
        if (!opts.silent) {
          showToast(t('toast.copied', 'Copied to clipboard'));
        }
      } catch (error) {
        if (!opts.silent) {
          showToast(t('toast.copyFailed', 'Copy failed. Please try again.'));
        }
        throw error;
      }
    },
    [attribution.markdownSignature, coverImage, showToast, t]
  );

  const handleShare = useCallback(
    async (content?: string) => {
      const shareContent = content || blogContent;
      if (!shareContent) {
        return;
      }

      const attributionBlock = attribution.plainSignature;

      if (navigator.share) {
        try {
          const shareData: ShareData = {
            title: parsedBlog.title || t('share.title', 'Your vibelog'),
            text: `${shareContent}\n\n${attributionBlock}`,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
          };

          if (coverImage) {
            try {
              const imageResponse = await fetch(coverImage.url);
              const imageBlob = await imageResponse.blob();
              const mimeType = imageBlob.type || 'image/jpeg';
              const fileName = mimeType === 'image/png' ? 'vibelog-cover.png' : 'vibelog-cover.jpg';
              const imageFile = new File([imageBlob], fileName, { type: mimeType });

              if (navigator.canShare?.({ files: [imageFile] })) {
                shareData.files = [imageFile];
              }
            } catch (imageError) {
              if (DEBUG_MODE) {
                console.warn('Failed to attach cover image to share payload', imageError);
              }
            }
          }

          await navigator.share(shareData);
          return;
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            return; // user cancelled share sheet
          }
          if (DEBUG_MODE) {
            console.warn('Share failed, falling back to copy', error);
          }
        }
      }

      await handleCopy(shareContent);
      showToast(t('toast.copiedForSharing', 'Copied for sharing'));
    },
    [
      attribution.plainSignature,
      blogContent,
      coverImage,
      handleCopy,
      parsedBlog.title,
      showToast,
      t,
    ]
  );

  const beginEdit = useCallback(() => {
    if (!isLoggedIn) {
      handleTranscriptUpgradeGate();
      return;
    }

    setEditedContent(blogContent);
    setIsEditing(true);
  }, [blogContent, handleTranscriptUpgradeGate, isLoggedIn]);

  const finalizeEdit = useCallback(() => {
    setBlogContent(editedContent);
    setIsEditing(false);
    showToast(t('components.micRecorder.vibelogUpdated', 'Vibelog updated successfully!'));
  }, [editedContent, showToast, t]);

  const cancelEdit = useCallback(() => {
    setEditedContent('');
    setIsEditing(false);
  }, []);

  const processTranscription = useCallback(async () => {
    if (!audioBlob) {
      throw new Error('No audio blob available');
    }

    const transcriptionResult = await vibelogAPI.processTranscription(audioBlob);
    setTranscription(transcriptionResult);

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

    return transcriptionResult;
  }, [audioBlob, user?.id, vibelogAPI]);

  const processBlogGeneration = useCallback(async () => {
    const transcriptionData = vibelogAPI.processingData.current.transcriptionData;
    if (!transcriptionData) {
      throw new Error('No transcription data available');
    }

    const teaserResult = await vibelogAPI.processBlogGeneration(transcriptionData);
    setBlogContent(teaserResult.content);
    setFullBlogContent(teaserResult.fullContent || teaserResult.content);
    setIsTeaserContent(teaserResult.isTeaser);

    return teaserResult.fullContent || teaserResult.content;
  }, [vibelogAPI]);

  const processCoverImage = useCallback(
    async (blogContentOverride?: string) => {
      try {
        const contentToUse =
          blogContentOverride ||
          vibelogAPI.processingData.current.blogContentData ||
          fullBlogContent;

        if (!contentToUse) {
          return null;
        }

        const image = await vibelogAPI.processCoverImage({ blogContent: contentToUse });
        setCoverImage(image);
        return image;
      } catch (error) {
        if (DEBUG_MODE) {
          console.warn('Cover generation failed', error);
        }
        return null;
      }
    },
    [fullBlogContent, vibelogAPI]
  );

  const completeProcessing = useCallback(async () => {
    const contentToSave = blogContent || vibelogAPI.processingData.current.blogContentData;
    if (!contentToSave) {
      if (DEBUG_MODE) {
        console.warn('No content available to save after processing');
      }
      showToast(t('components.micRecorder.noContentToSave', 'No content generated to save.'));
      setRecordingState('complete');
      return;
    }

    try {
      const fullContent = vibelogAPI.processingData.current.blogContentData || contentToSave;

      const result = await saveVibelog({
        content: contentToSave,
        fullContent,
        transcription: transcription || '',
        coverImage: coverImage || undefined,
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
            showToast(t('components.micRecorder.savedWithWarnings', 'Saved with minor warnings.'));
          } else {
            showToast(t('components.micRecorder.saved', 'Vibelog saved successfully!'));
          }
        } else {
          showToast(t('components.micRecorder.saved', 'Vibelog saved successfully!'));
        }
      } else {
        showToast(
          t('components.micRecorder.saveFallback', 'Save issue – content preserved locally.')
        );
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('Unexpected auto-save error', error);
      }
      showToast(
        t('components.micRecorder.saveFallback', 'Save issue – content preserved locally.')
      );
    }

    setTimeout(() => {
      setRecordingState('complete');
    }, 300);
  }, [
    audioData,
    coverImage,
    isTeaserContent,
    recordingTime,
    saveVibelog,
    showToast,
    t,
    transcription,
    user?.id,
    vibelogAPI.processingData,
    blogContent,
  ]);

  useEffect(() => {
    const limit = FREE_PLAN_LIMIT_SECONDS;
    if (recordingState === 'recording' && recordingTime >= limit) {
      stopRecording();
      showToast(
        t(
          'components.micRecorder.timeLimitReached',
          `Recording stopped — Free plan limit reached (${Math.round(limit / 60)} minutes)`
        )
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
    blogContent,
    fullBlogContent,
    parsedBlog,
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
    setUpgradePrompt,
    clearUpgradePrompt: () => setUpgradePrompt({ visible: false, message: '', benefits: [] }),
    processTranscription,
    processBlogGeneration,
    processCoverImage,
    completeProcessing,
  };
}
