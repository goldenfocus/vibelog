'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { useBulletproofSave } from '@/hooks/useBulletproofSave';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVibelogAPI } from '@/hooks/useVibelogAPI';
import { debounce, throttle } from '@/lib/performance';
import type { CoverImage, ToastState, UpgradePromptState } from '@/types/micRecorder';

// Optimized state machine with better performance
interface MicState {
  recordingState: 'idle' | 'recording' | 'processing' | 'complete';
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
  toast: ToastState;
  upgradePrompt: UpgradePromptState;
  isLoggedIn: boolean;
  attribution: {
    markdownSignature: string;
    plainSignature: string;
    profileUrl: string;
    handle: string;
  };
}

interface MicActions {
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
  processTranscription: () => Promise<string>;
  processBlogGeneration: () => Promise<string>;
  processCoverImage: (blogContent?: string) => Promise<CoverImage | null>;
  completeProcessing: () => Promise<void>;
}

const TOAST_DURATION_MS = 3000;
const FREE_PLAN_LIMIT_SECONDS = 300;

// Memoized attribution builder
function buildAttribution(isLoggedIn: boolean, user: ReturnType<typeof useAuth>['user']) {
  const metadata = user?.user_metadata ?? {};
  const slug =
    metadata.username ||
    metadata.user_name ||
    metadata.preferred_username ||
    (user?.email || '').split('@')[0];

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

// Memoized title parser
function parseTitleFromMarkdown(md: string): { title: string | null; body: string } {
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

export function useOptimizedMicState(remixContent?: string | null): MicState & MicActions {
  const { t } = useI18n();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  // Core state
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'processing' | 'complete'
  >('idle');
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

  // Refs for cleanup
  const toastTimeoutRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Memoized values
  const attribution = useMemo(() => buildAttribution(isLoggedIn, user), [isLoggedIn, user]);
  const parsedBlog = useMemo(() => parseTitleFromMarkdown(blogContent), [blogContent]);

  // Optimized toast with debouncing
  const showToast = useCallback(
    debounce((message: string) => {
      setToast({ message, visible: true });
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast({ message: '', visible: false });
        toastTimeoutRef.current = null;
      }, TOAST_DURATION_MS);
    }, 100),
    []
  );

  // Audio engine with optimized callbacks
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

  // Load remix content
  useEffect(() => {
    if (remixContent) {
      setBlogContent(remixContent);
      setFullBlogContent(remixContent);
      setRecordingState('complete');
      showToast('Vibelog loaded for remixing!');
    }
  }, [remixContent, showToast]);

  // Optimized timer cleanup
  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // Reset function
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

  // Optimized recording start
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

  // Optimized recording stop
  const stopRecording = useCallback(() => {
    stopEngineRecording();
    clearRecordingTimer();
  }, [clearRecordingTimer, stopEngineRecording]);

  // Reset function
  const reset = useCallback(() => {
    resetAudioEngine();
    resetRecordingState();
  }, [resetAudioEngine, resetRecordingState]);

  // Throttled transcript update
  const updateTranscript = useCallback(
    throttle((newTranscription: string) => {
      setTranscription(newTranscription);
      showToast(t('components.micRecorder.transcriptUpdated'));
    }, 500),
    [showToast, t]
  );

  // Optimized copy function
  const handleCopy = useCallback(
    async (content: string, opts: { silent?: boolean } = {}) => {
      const signature = attribution.markdownSignature;
      const contentWithSignature = `${content}\n\n${signature}`;

      try {
        await navigator.clipboard.writeText(contentWithSignature);
        if (!opts.silent) {
          showToast(t('toast.copied'));
        }
      } catch (_error) {
        if (!opts.silent) {
          showToast(t('toast.copyFailed'));
        }
        throw _error;
      }
    },
    [attribution.markdownSignature, showToast, t]
  );

  // Optimized share function
  const handleShare = useCallback(
    async (content?: string) => {
      const shareContent = content || blogContent;
      if (!shareContent) {
        return;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: parsedBlog.title || t('share.title'),
            text: `${shareContent}\n\n${attribution.plainSignature}`,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
          });
          return;
        } catch {
          // Fall back to copy
        }
      }

      await handleCopy(shareContent);
      showToast(t('toast.copiedForSharing'));
    },
    [attribution.plainSignature, blogContent, handleCopy, parsedBlog.title, showToast, t]
  );

  // Edit functions
  const beginEdit = useCallback(() => {
    if (!isLoggedIn) {
      setUpgradePrompt({
        visible: true,
        message: t('components.micRecorder.loginEditMessage'),
        benefits: [
          t('components.micRecorder.benefit.saveHistory'),
          t('components.micRecorder.benefit.editAnytime'),
        ],
      });
      return;
    }

    setEditedContent(blogContent);
    setIsEditing(true);
  }, [blogContent, isLoggedIn, t]);

  const finalizeEdit = useCallback(() => {
    setBlogContent(editedContent);
    setIsEditing(false);
    showToast(t('components.micRecorder.vibelogUpdated'));
  }, [editedContent, showToast, t]);

  const cancelEdit = useCallback(() => {
    setEditedContent('');
    setIsEditing(false);
  }, []);

  // Processing functions
  const processTranscription = useCallback(async () => {
    if (!audioBlob) {
      throw new Error('No audio blob available');
    }

    const transcriptionResult = await vibelogAPI.processTranscription(audioBlob);
    setTranscription(transcriptionResult);

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    vibelogAPI
      .uploadAudio(audioBlob, sessionId, user?.id)
      .then(result => setAudioData(result))
      .catch(error => console.warn('Audio upload failed', error));

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
        console.warn('Cover generation failed', error);
        return null;
      }
    },
    [fullBlogContent, vibelogAPI]
  );

  const completeProcessing = useCallback(async () => {
    const contentToSave = blogContent || vibelogAPI.processingData.current.blogContentData;
    if (!contentToSave) {
      showToast(t('components.micRecorder.noContentToSave'));
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
        showToast(t('components.micRecorder.saved'));
      } else {
        showToast(t('components.micRecorder.saveFallback'));
      }
    } catch (error) {
      console.error('Unexpected auto-save error', error);
      showToast(t('components.micRecorder.saveFallback'));
    }

    setTimeout(() => setRecordingState('complete'), 300);
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

  // Time limit check
  useEffect(() => {
    const limit = FREE_PLAN_LIMIT_SECONDS;
    if (recordingState === 'recording' && recordingTime >= limit) {
      stopRecording();
      showToast(t('components.micRecorder.timeLimitReached', { minutes: Math.round(limit / 60) }));
    }
  }, [recordingState, recordingTime, showToast, stopRecording, t]);

  // Cleanup
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
    // State
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

    // Actions
    startRecording,
    stopRecording,
    reset,
    handleCopy,
    handleShare,
    beginEdit,
    finalizeEdit,
    cancelEdit,
    setEditedContent,
    handleTranscriptUpgradeGate: beginEdit,
    updateTranscript,
    setUpgradePrompt,
    clearUpgradePrompt: () => setUpgradePrompt({ visible: false, message: '', benefits: [] }),
    processTranscription,
    processBlogGeneration,
    processCoverImage,
    completeProcessing,
  };
}
