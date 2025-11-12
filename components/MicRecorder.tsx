'use client';

/* eslint-disable @next/next/no-img-element */

import { Mic2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import AudioPlayer from '@/components/AudioPlayer';
import Controls from '@/components/mic/Controls';
import ProcessingAnimation from '@/components/mic/ProcessingAnimation';
import ProcessingRail from '@/components/mic/ProcessingRail';
import PublishActions from '@/components/mic/PublishActions';
import ToneSettings from '@/components/mic/ToneSettings';
import TranscriptionPanel from '@/components/mic/TranscriptionPanel';
import { useMicStateMachine } from '@/components/mic/useMicStateMachine';
import Waveform from '@/components/mic/Waveform';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import UpgradePrompt from '@/components/UpgradePrompt';
import VibelogContentRenderer from '@/components/VibelogContentRenderer';
import VibelogEditModal from '@/components/VibelogEditModal';
import {
  createTextToSpeechCacheKey,
  normalizeTextToSpeechInput,
  prefetchTextToSpeech,
} from '@/hooks/useTextToSpeech';

interface MicRecorderProps {
  remixContent?: string | null;
}

export default function MicRecorder({ remixContent }: MicRecorderProps = {}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    recordingState,
    recordingTime,
    transcription,
    liveTranscript,
    canEditLive,
    vibelogContent,
    fullVibelogContent,
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
    voiceCloneId,
    vibelogId,
    startRecording,
    stopRecording,
    reset,
    handleCopy,
    handleShare,
    beginEdit,
    beginEditFull,
    finalizeEdit,
    cancelEdit,
    setEditedContent,
    handleTranscriptUpgradeGate,
    updateTranscript,
    updateLiveTranscript,
    setUpgradePrompt,
    clearUpgradePrompt,
    processTranscription,
    processVibelogGeneration,
    processCoverImage,
    completeProcessing,
  } = useMicStateMachine({ remixContent });

  const [isMicCollapsed, setIsMicCollapsed] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [voicePrefetchState, setVoicePrefetchState] = useState<
    'idle' | 'warming' | 'ready' | 'error'
  >('idle');
  const [autoPlayRequest, setAutoPlayRequest] = useState<{ id: string; cacheKey: string } | null>(
    null
  );
  const progressRailRef = useRef<HTMLDivElement>(null);
  const publishActionsRef = useRef<HTMLDivElement>(null);
  const prefetchedKeyRef = useRef<string | null>(null);
  const micCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State to track whether user wants to see full content
  const [showingFullContent, setShowingFullContent] = useState(false);

  const showRecordingUI = recordingState === 'recording';
  const showCompletedUI = recordingState === 'complete';

  // Handler for "Read More" button
  const handleReadMore = () => {
    console.log('📖 [READ-MORE] Expanding to full content');
    console.log('📖 [READ-MORE] Teaser length:', vibelogContent.length);
    console.log('📖 [READ-MORE] Full length:', fullVibelogContent.length);
    console.log('📖 [READ-MORE] Are they different?', fullVibelogContent !== vibelogContent);
    console.log('📖 [READ-MORE] Is logged in?', isLoggedIn);

    // If not logged in, redirect to sign-in page
    if (!isLoggedIn) {
      console.log('📖 [READ-MORE] Redirecting to sign-in...');
      window.location.href =
        '/auth/signin?returnTo=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setShowingFullContent(true);
  };

  const handleVoiceSettingsClick = () => {
    if (typeof window !== 'undefined') {
      window.open('/settings/profile#voice', '_blank', 'noopener,noreferrer');
    }
  };

  const handleCancelAutoPlay = () => {
    setAutoPlayEnabled(false);
    setAutoPlayRequest(null);
  };

  // Determine which content to display
  const displayContent = showingFullContent ? fullVibelogContent || vibelogContent : vibelogContent;
  const shouldShowReadMore =
    isTeaserContent &&
    !showingFullContent &&
    fullVibelogContent &&
    fullVibelogContent !== vibelogContent;

  const normalizedSpeechText = useMemo(
    () => normalizeTextToSpeechInput(displayContent),
    [displayContent]
  );

  const processingStage: 'transcribe' | 'story' | 'cover' | 'voice' = useMemo(() => {
    if (!transcription) {
      return 'transcribe';
    }
    if (!vibelogContent) {
      return 'story';
    }
    if (!coverImage) {
      return 'cover';
    }
    return 'voice';
  }, [transcription, vibelogContent, coverImage]);

  const voiceRailStatus: 'idle' | 'warming' | 'ready' | 'error' = (() => {
    if (voicePrefetchState === 'error') {
      return 'error';
    }
    if (voicePrefetchState === 'warming') {
      return 'warming';
    }
    if (voicePrefetchState === 'ready' || voiceCloneId) {
      return 'ready';
    }
    return 'idle';
  })();

  const stageLabels: Record<'transcribe' | 'story' | 'cover' | 'voice', string> = {
    transcribe: 'Transcribing your riff',
    story: 'Writing your story',
    cover: 'Painting cover art',
    voice: voicePrefetchState === 'ready' ? 'Voice ready' : 'Cloning your voice',
  };
  const statusLabel = stageLabels[processingStage];

  // Parse the displayed content (not just the teaser) to extract title and body
  const displayParsed = useMemo(() => {
    const lines = displayContent.split(/\r?\n/);
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
  }, [displayContent]);

  // Debug logging
  if (showCompletedUI && process.env.NODE_ENV !== 'production') {
    console.log('🔍 [MICRECORDER] Content Debug:', {
      isTeaserContent,
      showingFullContent,
      shouldShowReadMore,
      teaserLength: vibelogContent.length,
      fullLength: fullVibelogContent.length,
      areDifferent: fullVibelogContent !== vibelogContent,
    });
  }

  useEffect(() => {
    if (recordingState === 'processing') {
      if (micCollapseTimerRef.current) {
        clearTimeout(micCollapseTimerRef.current);
      }
      micCollapseTimerRef.current = window.setTimeout(() => {
        setIsMicCollapsed(true);
      }, 1400);
    } else {
      if (micCollapseTimerRef.current) {
        clearTimeout(micCollapseTimerRef.current);
        micCollapseTimerRef.current = null;
      }
      setIsMicCollapsed(false);
    }

    return () => {
      if (micCollapseTimerRef.current) {
        clearTimeout(micCollapseTimerRef.current);
        micCollapseTimerRef.current = null;
      }
    };
  }, [recordingState]);

  useEffect(() => {
    if (recordingState === 'processing' && progressRailRef.current) {
      progressRailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [recordingState]);

  useEffect(() => {
    if (recordingState !== 'processing') {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia('(min-width: 768px)').matches) {
      return;
    }
    progressRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [processingStage, recordingState]);

  useEffect(() => {
    if (recordingState !== 'complete' || !normalizedSpeechText) {
      setVoicePrefetchState('idle');
      prefetchedKeyRef.current = null;
      setAutoPlayRequest(null);
      return;
    }

    const cacheKey = createTextToSpeechCacheKey({
      text: normalizedSpeechText,
      voice: 'shimmer',
      vibelogId,
      voiceCloneId,
      authorId: user?.id,
    });

    if (prefetchedKeyRef.current === cacheKey && voicePrefetchState === 'ready') {
      if (autoPlayEnabled && !autoPlayRequest) {
        setAutoPlayRequest({ id: `${cacheKey}-${Date.now()}`, cacheKey });
      }
      return;
    }

    let cancelled = false;
    prefetchedKeyRef.current = cacheKey;
    setVoicePrefetchState('warming');

    prefetchTextToSpeech(
      {
        text: normalizedSpeechText,
        voice: 'shimmer',
        vibelogId,
        voiceCloneId,
        authorId: user?.id,
        cacheKey,
      },
      {
        onUpgradePrompt: (message, benefits) =>
          setUpgradePrompt({
            visible: true,
            message,
            benefits,
          }),
      }
    )
      .then(() => {
        if (cancelled) {
          return;
        }
        setVoicePrefetchState('ready');
        if (autoPlayEnabled) {
          setAutoPlayRequest({ id: `${cacheKey}-${Date.now()}`, cacheKey });
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        console.error('Failed to prefetch speech audio:', error);
        setVoicePrefetchState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [
    autoPlayEnabled,
    autoPlayRequest,
    normalizedSpeechText,
    recordingState,
    setUpgradePrompt,
    user?.id,
    vibelogId,
    voiceCloneId,
    voicePrefetchState,
  ]);

  useEffect(() => {
    if (autoPlayRequest && publishActionsRef.current) {
      publishActionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [autoPlayRequest]);

  useEffect(() => {
    if (recordingState === 'idle' || recordingState === 'recording') {
      setAutoPlayEnabled(true);
      setAutoPlayRequest(null);
    }
  }, [recordingState]);

  return (
    <div className="w-full">
      {recordingState === 'processing' && (
        <button
          type="button"
          onClick={() =>
            progressRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          className="mb-4 flex w-full items-center justify-center rounded-full border border-electric/30 bg-electric/10 px-4 py-2 text-xs font-semibold text-electric backdrop-blur md:hidden"
        >
          <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-electric" />
          <span>Now: {statusLabel}</span>
        </button>
      )}

      {/* Recording controls with settings gear */}
      <div className="relative flex justify-center">
        {(!isMicCollapsed || recordingState !== 'processing') && (
          <>
            <Controls
              recordingState={recordingState}
              recordingTime={recordingTime}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onReset={reset}
            />
            {/* Settings gear - positioned to the right of mic button */}
            <div className="absolute right-4 top-4 sm:right-8">
              <ToneSettings
                disabled={recordingState === 'recording' || recordingState === 'processing'}
              />
            </div>
          </>
        )}
      </div>

      {isMicCollapsed && recordingState === 'processing' && (
        <div className="sticky top-4 z-30 mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/80 p-3 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => {
              setIsMicCollapsed(false);
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex flex-1 items-center gap-3 text-left"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-electric text-white shadow-md">
              <Mic2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Processing</p>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
          </button>
          <div className="flex-shrink-0">
            <ToneSettings disabled />
          </div>
        </div>
      )}

      {showRecordingUI && <Waveform levels={audioLevels} isActive variant="recording" />}

      <TranscriptionPanel
        transcription={transcription}
        liveTranscript={liveTranscript}
        isRecording={showRecordingUI}
        isComplete={showCompletedUI}
        canEditLive={canEditLive}
        onCopy={content => {
          void handleCopy(content);
        }}
        onEdit={handleTranscriptUpgradeGate}
        onTranscriptUpdate={updateTranscript}
        onLiveTranscriptEdit={updateLiveTranscript}
        isLoggedIn={isLoggedIn}
      />

      <ProcessingAnimation
        isVisible={recordingState === 'processing'}
        recordingTime={recordingTime}
        onTranscribeComplete={processTranscription}
        onGenerateComplete={processVibelogGeneration}
        onCoverComplete={processCoverImage}
        onAnimationComplete={completeProcessing}
        renderMode="headless"
      />

      <div ref={progressRailRef}>
        <ProcessingRail
          isVisible={recordingState === 'processing'}
          transcription={transcription}
          liveTranscript={liveTranscript}
          vibelogContent={vibelogContent}
          coverImage={coverImage}
          voiceCloneId={voiceCloneId}
          voiceStatus={voiceRailStatus}
          onVoiceAction={handleVoiceSettingsClick}
          activeStage={processingStage}
        />
      </div>

      {(voicePrefetchState === 'warming' ||
        (voicePrefetchState === 'ready' && !autoPlayEnabled)) && (
        <div className="mb-6 rounded-2xl border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                {voicePrefetchState === 'warming'
                  ? 'Your voice is warming up'
                  : 'Voice is ready to play'}
              </p>
              <p>
                {voicePrefetchState === 'warming'
                  ? 'We will auto-play once the clone finishes rendering.'
                  : 'Auto-play is off. Tap listen when you are ready.'}
              </p>
            </div>
            {voicePrefetchState === 'warming' && autoPlayEnabled && (
              <button
                type="button"
                onClick={handleCancelAutoPlay}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:border-electric hover:text-electric"
              >
                Cancel auto-play
              </button>
            )}
          </div>
        </div>
      )}

      {audioBlob && showCompletedUI && (
        <AudioPlayer audioBlob={audioBlob} playback={audioPlayback} />
      )}

      {(transcription || vibelogContent) && showCompletedUI && (
        <div className="space-y-8">
          {vibelogContent && (
            <div className="overflow-hidden rounded-3xl border border-border/20 bg-card shadow-lg">
              <div className="border-b border-border/10 bg-gradient-to-r from-electric/5 to-transparent p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{t('recorder.polishedVibelog')}</h3>
                </div>

                <div ref={publishActionsRef}>
                  <PublishActions
                    content={displayContent}
                    title={displayParsed.title || undefined}
                    author={attribution.handle}
                    authorId={user?.id}
                    voiceCloneId={voiceCloneId}
                    vibelogId={vibelogId}
                    isLoggedIn={isLoggedIn}
                    isTeaserContent={isTeaserContent}
                    autoPlayRequest={autoPlayRequest}
                    onCopy={() => {
                      void handleCopy(displayContent);
                    }}
                    onEdit={beginEdit}
                    onShare={() => {
                      void handleShare(displayContent);
                    }}
                    onUpgradePrompt={(message, benefits) =>
                      setUpgradePrompt({ visible: true, message, benefits })
                    }
                  />
                </div>
              </div>

              <div className="p-8">
                {displayParsed.title && (
                  <h1 className="mb-4 bg-gradient-electric bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
                    {displayParsed.title}
                  </h1>
                )}

                {coverImage && (
                  <div className="mb-6">
                    <img
                      src={coverImage.url}
                      alt={coverImage.alt}
                      width={coverImage.width}
                      height={coverImage.height}
                      className="h-auto w-full rounded-2xl border border-border/10 shadow-md"
                      loading="eager"
                    />
                  </div>
                )}

                <VibelogContentRenderer
                  content={displayParsed.body || displayContent}
                  isTeaser={shouldShowReadMore}
                  onReadMore={handleReadMore}
                />
              </div>

              <div className="border-t border-border/10 bg-muted/5">
                <div className="p-6 text-center">
                  {isLoggedIn ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span>{t('components.micRecorder.createdBy')}</span>
                      <button
                        onClick={() => window.open(attribution.profileUrl, '_blank', 'noopener')}
                        className="font-medium text-electric transition-colors hover:text-electric-glow"
                      >
                        {attribution.handle}
                      </button>
                      <button
                        onClick={() => window.open(attribution.profileUrl, '_blank', 'noopener')}
                        className="text-muted-foreground transition-colors hover:text-electric"
                      >
                        {attribution.profileUrl.replace(/^https?:\/\//, '')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => window.open('https://vibelog.io', '_blank', 'noopener')}
                        className="rounded-lg border border-border/30 bg-muted/40 px-3 py-1.5 text-xs font-normal text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground"
                      >
                        vibelog.io
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6 pt-0">
                  <PublishActions
                    content={displayContent}
                    title={displayParsed.title || undefined}
                    author={attribution.handle}
                    authorId={user?.id}
                    voiceCloneId={voiceCloneId}
                    vibelogId={vibelogId}
                    isLoggedIn={isLoggedIn}
                    isTeaserContent={isTeaserContent}
                    onCopy={() => {
                      void handleCopy(displayContent);
                    }}
                    onEdit={beginEditFull}
                    onShare={() => {
                      void handleShare(displayContent);
                    }}
                    onUpgradePrompt={(message, benefits) =>
                      setUpgradePrompt({ visible: true, message, benefits })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[toastSlideUp_0.4s_ease-out]">
          <div className="max-w-sm rounded-xl border border-border/50 bg-card/95 px-6 py-4 shadow-xl backdrop-blur-sm">
            <p className="text-center text-sm font-medium text-foreground">{toast.message}</p>
          </div>
        </div>
      )}

      <UpgradePrompt
        isVisible={upgradePrompt.visible}
        onClose={clearUpgradePrompt}
        message={upgradePrompt.message}
        benefits={upgradePrompt.benefits}
        resetTime={upgradePrompt.resetTime}
      />

      <VibelogEditModal
        isVisible={isEditing}
        editedContent={editedContent}
        onContentChange={setEditedContent}
        onSave={finalizeEdit}
        onCancel={cancelEdit}
      />

      <style jsx>{`
        @keyframes toastSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .star-wars-crawl {
          transform-style: preserve-3d;
          animation: crawlUp 20s linear infinite;
        }

        .crawl-step {
          transform-style: preserve-3d;
          transform: rotateX(8deg);
          margin-bottom: 2rem;
          animation: fadeInScale 1.5s ease-out;
          transform-origin: center center;
        }

        @keyframes crawlUp {
          0% {
            transform: translateY(0) rotateX(8deg);
          }
          100% {
            transform: translateY(-80%) rotateX(8deg);
          }
        }

        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: rotateX(8deg);
          }
          100% {
            opacity: 1;
            transform: rotateX(8deg);
          }
        }

        @media (min-width: 768px) {
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: rotateX(12deg);
            }
            100% {
              opacity: 1;
              transform: rotateX(12deg);
            }
          }
        }

        .glow-text-active {
          text-shadow:
            0 0 20px rgba(97, 144, 255, 0.8),
            0 0 40px rgba(97, 144, 255, 0.6),
            0 0 60px rgba(97, 144, 255, 0.4);
          animation: pulseGlow 6s ease-in-out infinite alternate;
        }

        .glow-text-secondary {
          text-shadow:
            0 0 10px rgba(255, 255, 255, 0.3),
            0 0 20px rgba(255, 255, 255, 0.2);
        }

        .glow-text-completed {
          text-shadow:
            0 0 15px rgba(97, 144, 255, 0.6),
            0 0 25px rgba(97, 144, 255, 0.4),
            0 0 35px rgba(97, 144, 255, 0.3);
        }

        @keyframes pulseGlow {
          0% {
            text-shadow:
              0 0 20px rgba(97, 144, 255, 0.8),
              0 0 40px rgba(97, 144, 255, 0.6),
              0 0 60px rgba(97, 144, 255, 0.4);
          }
          100% {
            text-shadow:
              0 0 30px rgba(97, 144, 255, 1),
              0 0 50px rgba(97, 144, 255, 0.8),
              0 0 80px rgba(97, 144, 255, 0.6);
          }
        }

        @media (min-width: 768px) {
          .crawl-step {
            transform: rotateX(12deg);
            margin-bottom: 2.5rem;
            transform-origin: center center;
          }

          .star-wars-crawl {
            animation: crawlUpDesktop 18s linear infinite;
          }

          @keyframes crawlUpDesktop {
            0% {
              transform: translateY(0) rotateX(12deg);
            }
            100% {
              transform: translateY(-85%) rotateX(12deg);
            }
          }
        }
      `}</style>
    </div>
  );
}
