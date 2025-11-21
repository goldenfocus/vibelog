'use client';

import { useState, useMemo } from 'react';

import AudioPlayer from '@/components/AudioPlayer';
import Controls from '@/components/mic/Controls';
import { ProcessedVibelogCard } from '@/components/mic/ProcessedVibelogCard';
import ProcessingAnimation from '@/components/mic/ProcessingAnimation';
import ProcessingPeek from '@/components/mic/ProcessingPeek';
import ToneSettings from '@/components/mic/ToneSettings';
import TranscriptionPanel from '@/components/mic/TranscriptionPanel';
import { useMicStateMachine } from '@/components/mic/useMicStateMachine';
import Waveform from '@/components/mic/Waveform';
import { useI18n } from '@/components/providers/I18nProvider';
import UpgradePrompt from '@/components/UpgradePrompt';
import VibelogEditModal from '@/components/VibelogEditModal';

interface MicRecorderProps {
  remixContent?: string | null;
  onSaveSuccess?: (() => void) | null;
}

export default function MicRecorder({ remixContent, onSaveSuccess }: MicRecorderProps = {}) {
  const { t } = useI18n();
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
  } = useMicStateMachine({ remixContent, onSaveSuccess });

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

  // Determine which content to display
  const displayContent = showingFullContent ? fullVibelogContent || vibelogContent : vibelogContent;
  const shouldShowReadMore =
    isTeaserContent &&
    !showingFullContent &&
    fullVibelogContent &&
    fullVibelogContent !== vibelogContent;

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

  return (
    <div className="w-full">
      {/* Recording controls with settings gear */}
      <div className="relative flex justify-center">
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
      </div>

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
      />

      <ProcessingPeek
        isVisible={recordingState === 'processing'}
        transcription={transcription}
        vibelogContent={vibelogContent}
        coverImage={coverImage}
      />

      {audioBlob && showCompletedUI && (
        <AudioPlayer audioBlob={audioBlob} playback={audioPlayback} />
      )}

      {(transcription || vibelogContent) && showCompletedUI && vibelogContent && (
        <div className="space-y-8">
          <ProcessedVibelogCard
            t={t}
            displayParsed={displayParsed}
            displayContent={displayContent}
            coverImage={coverImage}
            isLoggedIn={isLoggedIn}
            isTeaserContent={isTeaserContent}
            attribution={attribution}
            vibelogId={vibelogId}
            shouldShowReadMore={shouldShowReadMore}
            onReadMore={handleReadMore}
            onCopy={() => {
              void handleCopy(displayContent);
            }}
            onShare={() => {
              void handleShare(displayContent);
            }}
            onEditTeaser={beginEdit}
            onEditFull={beginEditFull}
            onUpgradePrompt={(message, benefits) =>
              setUpgradePrompt({ visible: true, message, benefits })
            }
          />
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
      `}</style>
    </div>
  );
}
