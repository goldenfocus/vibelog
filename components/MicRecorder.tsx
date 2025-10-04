'use client';

/* eslint-disable @next/next/no-img-element */

import AudioPlayer from '@/components/AudioPlayer';
import BlogContentRenderer from '@/components/BlogContentRenderer';
import BlogEditModal from '@/components/BlogEditModal';
import Controls from '@/components/mic/Controls';
import ProcessingAnimation from '@/components/mic/ProcessingAnimation';
import PublishActions from '@/components/mic/PublishActions';
import TranscriptionPanel from '@/components/mic/TranscriptionPanel';
import { useMicStateMachine } from '@/components/mic/useMicStateMachine';
import Waveform from '@/components/mic/Waveform';
import { useI18n } from '@/components/providers/I18nProvider';
import UpgradePrompt from '@/components/UpgradePrompt';

interface MicRecorderProps {
  remixContent?: string | null;
}

export default function MicRecorder({ remixContent }: MicRecorderProps = {}) {
  const { t } = useI18n();
  const {
    recordingState,
    recordingTime,
    transcription,
    liveTranscript,
    blogContent,
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
    clearUpgradePrompt,
    processTranscription,
    processBlogGeneration,
    processCoverImage,
    completeProcessing,
  } = useMicStateMachine({ remixContent });

  const showRecordingUI = recordingState === 'recording';
  const showCompletedUI = recordingState === 'complete';

  return (
    <div className="w-full">
      <Controls
        recordingState={recordingState}
        recordingTime={recordingTime}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onReset={reset}
      />

      {showRecordingUI && <Waveform levels={audioLevels} isActive variant="recording" />}

      <TranscriptionPanel
        transcription={transcription}
        liveTranscript={liveTranscript}
        isRecording={showRecordingUI}
        isComplete={showCompletedUI}
        onCopy={content => {
          void handleCopy(content);
        }}
        onEdit={handleTranscriptUpgradeGate}
        onTranscriptUpdate={updateTranscript}
        isLoggedIn={isLoggedIn}
      />

      <ProcessingAnimation
        isVisible={recordingState === 'processing'}
        recordingTime={recordingTime}
        onTranscribeComplete={processTranscription}
        onGenerateComplete={processBlogGeneration}
        onCoverComplete={processCoverImage}
        onAnimationComplete={completeProcessing}
      />

      {audioBlob && showCompletedUI && (
        <AudioPlayer audioBlob={audioBlob} playback={audioPlayback} />
      )}

      {(transcription || blogContent) && showCompletedUI && (
        <div className="space-y-8">
          {blogContent && (
            <div className="overflow-hidden rounded-3xl border border-border/20 bg-card shadow-lg">
              <div className="border-b border-border/10 bg-gradient-to-r from-electric/5 to-transparent p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{t('recorder.polishedVibelog')}</h3>
                </div>

                <PublishActions
                  content={blogContent}
                  isLoggedIn={isLoggedIn}
                  isTeaserContent={isTeaserContent}
                  onCopy={() => {
                    void handleCopy(blogContent);
                  }}
                  onEdit={beginEdit}
                  onShare={() => {
                    void handleShare(blogContent);
                  }}
                  onUpgradePrompt={(message, benefits) =>
                    setUpgradePrompt({ visible: true, message, benefits })
                  }
                />
              </div>

              <div className="p-8">
                {parsedBlog.title && (
                  <h1 className="mb-4 bg-gradient-electric bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
                    {parsedBlog.title}
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

                <BlogContentRenderer
                  content={parsedBlog.body || blogContent}
                  isTeaser={isTeaserContent}
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
                    content={blogContent}
                    isLoggedIn={isLoggedIn}
                    isTeaserContent={isTeaserContent}
                    onCopy={() => {
                      void handleCopy(blogContent);
                    }}
                    onEdit={beginEdit}
                    onShare={() => {
                      void handleShare(blogContent);
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

      <BlogEditModal
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
