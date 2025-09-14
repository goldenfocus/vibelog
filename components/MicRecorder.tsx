"use client";

import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

// Components
import Waveform from "@/components/mic/Waveform";
import Controls, { RecordingState } from "@/components/mic/Controls";
import TranscriptionPanel from "@/components/mic/TranscriptionPanel";
import PublishActions from "@/components/mic/PublishActions";
import ProcessingAnimation from "@/components/mic/ProcessingAnimation";
import UpgradePrompt from "@/components/UpgradePrompt";
import BlogContentRenderer from "@/components/BlogContentRenderer";
import BlogEditModal from "@/components/BlogEditModal";
import AudioPlayer from "@/components/AudioPlayer";

// Custom Hooks
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useVibelogAPI } from "@/hooks/useVibelogAPI";

// Types
import { ToastState, UpgradePromptState, TeaserResult, CoverImage } from "@/types/micRecorder";

export default function MicRecorder() {
  const { t } = useI18n();
  
  // State
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcription, setTranscription] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [isTeaserContent, setIsTeaserContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null);
  const [isCoverGenerating, setIsCoverGenerating] = useState(false);
  const [isLoggedIn] = useState(false); // TODO: Replace with actual auth state
  const [recordingTime, setRecordingTime] = useState(0);
  const [toast, setToast] = useState<ToastState>({message: "", visible: false});
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePromptState>({ 
    visible: false, 
    message: '', 
    benefits: [] 
  });
  
  // Refs
  const recordingTimer = useRef<number | null>(null);
  const [visibleStepIndex, setVisibleStepIndex] = useState(0);

  // Custom Hooks
  const audioEngine = useAudioEngine(
    (error: string) => showToast(error),
    () => setRecordingState("processing")
  );

  const speechRecognition = useSpeechRecognition(recordingState);
  
  const audioPlayback = useAudioPlayback(audioEngine.audioBlob);
  
  const vibelogAPI = useVibelogAPI(setUpgradePrompt);

  // Utility functions
  const showToast = (message: string) => {
    setToast({message, visible: true});
    setTimeout(() => setToast({message: "", visible: false}), 3000);
  };

  // Recording controls
  const handleStartRecording = async () => {
    const success = await audioEngine.startRecording();
    if (success) {
      setRecordingState("recording");
      setTranscription("");
      setBlogContent("");
      setIsTeaserContent(false);
      setRecordingTime(0);

      // Start recording timer
      recordingTimer.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const handleStopRecording = () => {
    audioEngine.stopRecording();

    // Clear the recording timer
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  const handleReset = () => {
    // Clean up audio engine
    audioEngine.resetAudioEngine();
    
    // Clean up timer
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    // Clean up speech recognition
    speechRecognition.resetTranscript();
    
    // Reset state
    setRecordingState("idle");
    setTranscription("");
    setBlogContent("");
    setIsTeaserContent(false);
    setVisibleStepIndex(0);
    setRecordingTime(0);
  };

  // Content management
  const handleCopy = async (content: string) => {
    try {
      const contentWithSignature = content + '\n\n---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang';

      // Try to copy with cover image if available
      if (coverImage && navigator.clipboard && 'write' in navigator.clipboard) {
        try {
          const imageResponse = await fetch(coverImage.url);
          const imageBlob = await imageResponse.blob();

          // Convert to PNG if it's JPEG, since Clipboard API has limited image format support
          let clipboardBlob = imageBlob;
          if (imageBlob.type === 'image/jpeg') {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            clipboardBlob = await new Promise((resolve, reject) => {
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error('Failed to convert image to PNG'));
                  }
                }, 'image/png');
              };
              img.onerror = reject;
              img.src = URL.createObjectURL(imageBlob);
            });
          }

          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': new Blob([contentWithSignature], { type: 'text/plain' }),
              [clipboardBlob.type]: clipboardBlob
            })
          ]);
          showToast('✅ Copied text + cover image!');
          return;
        } catch (imageError) {
          console.log('Failed to copy image, falling back to text only:', imageError);
        }
      }

      // Fallback to text-only copy
      await navigator.clipboard.writeText(contentWithSignature);
      showToast(t('toast.copied'));
    } catch (err) {
      showToast(t('toast.copyFailed'));
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: t('share.title'),
          text: blogContent + '\n\n---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang',
          url: window.location.href,
        };

        // Try to include cover image if available
        if (coverImage && 'canShare' in navigator && navigator.canShare) {
          try {
            const imageResponse = await fetch(coverImage.url);
            const imageBlob = await imageResponse.blob();
            const imageFile = new File([imageBlob], 'vibelog-cover.jpg', { type: imageBlob.type });

            if (navigator.canShare({ files: [imageFile] })) {
              shareData.files = [imageFile];
              showToast('📤 Sharing text + cover image...');
            }
          } catch (imageError) {
            console.log('Failed to prepare image for sharing, sharing text only:', imageError);
          }
        }

        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy(blogContent);
          showToast(t('toast.copiedForSharing'));
        }
      }
    } else {
      handleCopy(blogContent);
      showToast(t('toast.copiedForSharing'));
    }
  };


  // Edit functions
  const handleEdit = () => {
    if (!isLoggedIn) return;
    setEditedContent(blogContent);
    setIsEditing(true);
  };

  const handleTranscriptEdit = () => {
    if (!isLoggedIn) return;
    setIsEditingTranscript(true);
  };

  const handleTranscriptUpdate = (newTranscription: string) => {
    setTranscription(newTranscription);
    setIsEditingTranscript(false);
    showToast('Transcript updated successfully!');
  };

  const handleSaveEdit = () => {
    setBlogContent(editedContent);
    setIsEditing(false);
    showToast('Vibelog updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditedContent("");
    setIsEditing(false);
  };

  // Extract first H1 as title and return rest of markdown as body
  const splitTitleFromMarkdown = (md: string): { title: string | null; body: string } => {
    const lines = md.split(/\r?\n/);
    let title: string | null = null;
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith('# ')) { title = l.replace(/^#\s+/, '').trim(); start = i + 1; break; }
    }
    const body = lines.slice(start).join('\n');
    return { title, body };
  };

  // AI processing functions for ProcessingAnimation
  const doTranscription = async (): Promise<string> => {
    if (!audioEngine.audioBlob) {
      throw new Error('No audio blob available');
    }
    
    const transcriptionResult = await vibelogAPI.processTranscription(audioEngine.audioBlob);
    setTranscription(transcriptionResult);
    return transcriptionResult;
  };

  const doBlogGeneration = async (): Promise<string> => {
    const transcriptionData = vibelogAPI.processingData.current.transcriptionData;
    if (!transcriptionData) {
      throw new Error('No transcription data available');
    }
    
    const teaserResult: TeaserResult = await vibelogAPI.processBlogGeneration(transcriptionData);
    setBlogContent(teaserResult.content);
    setIsTeaserContent(teaserResult.isTeaser);
    // Cover will be generated during the IMAGE step (gated)
    return teaserResult.content;
  };

  const doCoverGeneration = async () => {
    try {
      setIsCoverGenerating(true);
      const result = await vibelogAPI.processCoverImage({ blogContent });
      setCoverImage(result);
      return result;
    } catch (e) {
      console.error('Cover generation failed', e);
      return null as any;
    } finally {
      setIsCoverGenerating(false);
    }
  };

  // Time limit management
  const getTimeLimit = () => 300; // 5 minutes for free plan
  const hasReachedTimeLimit = () => recordingTime >= getTimeLimit();

  // Auto-stop when time limit is reached
  useEffect(() => {
    if (recordingState === "recording" && hasReachedTimeLimit()) {
      handleStopRecording();
      showToast('Recording stopped - Free plan limit reached (5 minutes)');
    }
  }, [recordingTime, recordingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Recording Controls */}
      <Controls
        recordingState={recordingState}
        recordingTime={recordingTime}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onReset={handleReset}
      />

      {/* Real-time audio visualization */}
      {recordingState === "recording" && (
        <Waveform 
          levels={audioEngine.audioLevels}
          isActive={recordingState === "recording"}
          variant="recording"
        />
      )}

      {/* Transcription Panel */}
      <TranscriptionPanel
        transcription={transcription}
        liveTranscript={speechRecognition.liveTranscript}
        isRecording={recordingState === "recording"}
        isComplete={recordingState === "complete"}
        onCopy={handleCopy}
        onEdit={handleTranscriptEdit}
        onTranscriptUpdate={handleTranscriptUpdate}
        isLoggedIn={isLoggedIn}
      />

      {/* Processing Animation */}
      <ProcessingAnimation
        isVisible={recordingState === "processing"}
        recordingTime={recordingTime}
        onTranscribeComplete={doTranscription}
        onGenerateComplete={doBlogGeneration}
        onCoverComplete={doCoverGeneration}
        onAnimationComplete={() => {
          setTimeout(() => {
            setRecordingState("complete");
          }, 300);
        }}
      />

      {/* Audio Player */}
      {audioEngine.audioBlob && recordingState === "complete" && (
        <AudioPlayer
          audioBlob={audioEngine.audioBlob}
          playback={audioPlayback}
        />
      )}

      {/* Results */}
      {(transcription || blogContent) && recordingState === "complete" && (
        <div className="space-y-8">
          {blogContent && (
            <div className="bg-card rounded-3xl border border-border/20 overflow-hidden shadow-lg">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-electric/5 to-transparent p-6 border-b border-border/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </div>
                    {t('recorder.polishedVibelog')}
                  </h3>
                </div>

                {/* Publish Actions */}
                <PublishActions
                  content={blogContent}
                  isLoggedIn={isLoggedIn}
                  isTeaserContent={isTeaserContent}
                  onCopy={() => handleCopy(blogContent)}
                  onEdit={handleEdit}
                  onShare={handleShare}
                  onUpgradePrompt={(message, benefits) => setUpgradePrompt({
                    visible: true,
                    message,
                    benefits
                  })}
                  showSignature={false}
                />
              </div>

              {/* Cover Image + Content Section */}
              <div className="p-8">
                {(function(){
                  const { title, body } = splitTitleFromMarkdown(blogContent);
                  return (
                    <>
                      {title && (
                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent mb-4 leading-tight">
                          {title}
                        </h1>
                      )}
                      {coverImage && (
                        <div className="mb-6">
                          <img
                            src={coverImage.url}
                            alt={coverImage.alt}
                            width={coverImage.width}
                            height={coverImage.height}
                            className="w-full h-auto rounded-2xl border border-border/10 shadow-md"
                            loading="eager"
                          />
                        </div>
                      )}
                      <BlogContentRenderer content={body || blogContent} isTeaser={isTeaserContent} />
                    </>
                  );
                })()}
              </div>

              {/* Footer Section */}
              <div className="border-t border-border/10 bg-muted/5">
                {/* Creator Attribution */}
                <div className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span>{t('components.micRecorder.createdBy')}</span>
                    <button
                      onClick={() => window.open('https://vibelog.io/vibeyang', '_blank')}
                      className="text-electric hover:text-electric-glow transition-colors font-medium"
                    >
                      @vibeyang
                    </button>
                    <button
                      onClick={() => window.open('https://vibelog.io/vibeyang', '_blank')}
                      className="text-muted-foreground hover:text-electric transition-colors"
                    >
                      vibelog.io/vibeyang
                    </button>
                  </div>
                </div>

                {/* Bottom action buttons */}
                <div className="p-6 pt-0">
                  <PublishActions
                    content={blogContent}
                    isLoggedIn={isLoggedIn}
                    isTeaserContent={isTeaserContent}
                    onCopy={() => handleCopy(blogContent)}
                    onEdit={handleEdit}
                    onShare={handleShare}
                    onUpgradePrompt={(message, benefits) => setUpgradePrompt({
                      visible: true,
                      message,
                      benefits
                    })}
                    showSignature={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 z-50 animate-[toastSlideUp_0.4s_ease-out] transform -translate-x-1/2">
          <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-xl max-w-sm">
            <p className="text-center text-sm font-medium text-foreground">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isVisible={upgradePrompt.visible}
        onClose={() => setUpgradePrompt({ visible: false, message: '', benefits: [] })}
        message={upgradePrompt.message}
        benefits={upgradePrompt.benefits}
        resetTime={upgradePrompt.resetTime}
      />

      {/* Edit Modal */}
      <BlogEditModal
        isVisible={isEditing}
        editedContent={editedContent}
        onContentChange={setEditedContent}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />

      {/* Styles - includes all original animations */}
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

        /* Custom glow effects for symphony text */
        .glow-text-active {
          text-shadow: 0 0 20px rgba(97, 144, 255, 0.8), 
                       0 0 40px rgba(97, 144, 255, 0.6), 
                       0 0 60px rgba(97, 144, 255, 0.4);
          animation: pulseGlow 6s ease-in-out infinite alternate;
        }

        .glow-text-secondary {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 
                       0 0 20px rgba(255, 255, 255, 0.2);
        }

        .glow-text-completed {
          text-shadow: 0 0 15px rgba(97, 144, 255, 0.6), 
                       0 0 25px rgba(97, 144, 255, 0.4), 
                       0 0 35px rgba(97, 144, 255, 0.3);
        }

        @keyframes pulseGlow {
          0% {
            text-shadow: 0 0 20px rgba(97, 144, 255, 0.8), 
                         0 0 40px rgba(97, 144, 255, 0.6), 
                         0 0 60px rgba(97, 144, 255, 0.4);
          }
          100% {
            text-shadow: 0 0 30px rgba(97, 144, 255, 1), 
                         0 0 50px rgba(97, 144, 255, 0.8), 
                         0 0 80px rgba(97, 144, 255, 0.6);
          }
        }

        /* Slightly more perspective for larger screens */
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
