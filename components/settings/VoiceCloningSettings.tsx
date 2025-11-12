'use client';

import { Circle, Info, Loader2, Mic, Play, Pause, RefreshCw, Check, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import Waveform from '@/components/mic/Waveform';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useVoiceCloning } from '@/hooks/useVoiceCloning';
import { createClient } from '@/lib/supabase';

interface VoiceCloningSettingsProps {
  userId: string;
}

// Funny prefilled sample text that users can edit
const DEFAULT_SAMPLE_TEXT =
  "Hey there! This is my cloned voice speaking. Pretty cool, right? I can sound exactly like myself even when I'm not actually talking. Mind-blowing stuff!";

interface ProfileWithVoiceClone {
  voice_clone_id?: string | null;
  display_name?: string | null;
}

// Processing steps for animation
const PROCESSING_STEPS = [
  { label: 'Uploading audio', duration: 800 },
  { label: 'Analyzing voice patterns', duration: 1200 },
  { label: 'Cloning your voice', duration: 2000 },
  { label: 'Saving to profile', duration: 600 },
];

export default function VoiceCloningSettings({ userId }: VoiceCloningSettingsProps) {
  const { profile, refetch: refetchProfile } = useProfile(userId);
  const { cloneVoice, error: cloneError } = useVoiceCloning();

  // Use global TTS hook instead of local audio element
  const {
    isPlaying: isPlayingSample,
    isLoading: isLoadingSample,
    error: ttsError,
    playText,
    stop: stopSample,
  } = useTextToSpeech();

  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT);
  const [isRecloning, setIsRecloning] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasClonedVoice, setHasClonedVoice] = useState(false);
  const [currentVoiceCloneId, setCurrentVoiceCloneId] = useState<string | null>(null);

  // Waveform audio levels (15 bars)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(15).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Force refetch profile on mount to get latest voice_clone_id
  useEffect(() => {
    console.log('🔄 [VOICE-CLONE] Component mounted, refreshing profile data...');
    refetchProfile();
  }, [refetchProfile]);

  // Check if user has a cloned voice and sync with profile
  useEffect(() => {
    if (profile) {
      const voiceCloneId = (profile as ProfileWithVoiceClone).voice_clone_id;

      // Always update current voice clone ID from profile
      if (voiceCloneId) {
        setCurrentVoiceCloneId(voiceCloneId);
        setHasClonedVoice(true);
        console.log('✅ [VOICE-CLONE] Profile loaded with voice_clone_id:', voiceCloneId);
      } else {
        console.log('⚠️ [VOICE-CLONE] Profile has no voice_clone_id');
        setHasClonedVoice(false);
      }
    }
  }, [profile]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const updateAudioLevels = () => {
    if (!analyserRef.current) {
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Map to 15 bars
    const levels = Array(15)
      .fill(0)
      .map((_, i) => {
        const start = Math.floor((i * dataArray.length) / 15);
        const end = Math.floor(((i + 1) * dataArray.length) / 15);
        const avg = dataArray.slice(start, end).reduce((a, b) => a + b, 0) / (end - start);
        return Math.min(1, avg / 255);
      });

    setAudioLevels(levels);
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analysis for waveform
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start waveform animation
      updateAudioLevels();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordingBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());

        // Stop waveform animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAudioLevels(Array(15).fill(0));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handlePlaySample = async () => {
    if (!sampleText.trim()) {
      return;
    }

    // If already playing, stop it
    if (isPlayingSample) {
      stopSample();
      return;
    }

    try {
      // CRITICAL FIX: Fetch fresh voice_clone_id directly from database, bypassing ALL caching
      console.log('🔄 [VOICE-CLONE] Fetching latest voice_clone_id directly from database...');
      const supabase = createClient();
      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('voice_clone_id')
        .eq('id', userId)
        .single();

      if (profileError || !freshProfile?.voice_clone_id) {
        console.error('❌ [VOICE-CLONE] Failed to fetch voice_clone_id:', profileError);
        toast.error('No cloned voice found. Please clone your voice first.');
        return;
      }

      const voiceCloneId = freshProfile.voice_clone_id;
      console.log('🎵 [VOICE-CLONE] Playing sample with FRESH voice ID:', voiceCloneId);

      // Use the TTS hook which now uses the global player
      await playText({
        text: sampleText,
        voice: 'shimmer',
        voiceCloneId,
      });
      console.log('✅ [VOICE-CLONE] Sample playback started');
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to play sample. Please try again.');
    }
  };

  const handleStopSample = () => {
    stopSample();
  };

  const handleReclone = async () => {
    if (!recordingBlob) {
      setShowTipsModal(true);
      return;
    }

    setIsRecloning(true);
    setProcessingStep(0);
    setShowSuccess(false);

    try {
      const oldVoiceCloneId =
        currentVoiceCloneId || (profile as ProfileWithVoiceClone)?.voice_clone_id;

      console.log('🎙️ [VOICE-CLONE] Starting voice cloning...');
      console.log('  Old voice ID:', oldVoiceCloneId);
      console.log('  User ID:', userId);

      // Animate through processing steps
      const stepPromises = PROCESSING_STEPS.map((step, index) => {
        return new Promise<void>(resolve => {
          setTimeout(
            () => {
              setProcessingStep(index);
              console.log(`  Step ${index + 1}/${PROCESSING_STEPS.length}: ${step.label}`);
              resolve();
            },
            PROCESSING_STEPS.slice(0, index).reduce((sum, s) => sum + s.duration, 0)
          );
        });
      });

      // Start step animations
      Promise.all(stepPromises);

      const voiceName = `${(profile as ProfileWithVoiceClone)?.display_name || 'User'}'s Voice`;
      const result = await cloneVoice(recordingBlob, undefined, voiceName);

      if (result?.voiceId) {
        console.log('✅ [VOICE-CLONE] Voice cloning succeeded! New voice ID:', result.voiceId);

        // CRITICAL: Update local state IMMEDIATELY
        setCurrentVoiceCloneId(result.voiceId);

        // Wait a bit for backend to save to database
        console.log('⏳ [VOICE-CLONE] Waiting for database write to complete...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Refresh profile data from database
        console.log('🔄 [VOICE-CLONE] Refreshing profile from database...');
        await refetchProfile();

        // Show success animation
        setShowSuccess(true);
        setProcessingStep(PROCESSING_STEPS.length);

        // Auto-transition to cloned state after animation
        setTimeout(() => {
          setShowSuccess(false);
          setHasClonedVoice(true);
          setRecordingBlob(null);
          setRecordingTime(0);
          console.log('🎉 [VOICE-CLONE] Ready to test! Voice ID:', result.voiceId);
        }, 2000);

        // Delete old voice from ElevenLabs if it exists and is different
        if (oldVoiceCloneId && oldVoiceCloneId !== result.voiceId) {
          try {
            console.log('🗑️ [VOICE-CLONE] Deleting old voice from ElevenLabs:', oldVoiceCloneId);
            await fetch('/api/delete-voice', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ voiceId: oldVoiceCloneId }),
            });
            console.log('✅ [VOICE-CLONE] Old voice deleted successfully');
          } catch (deleteError) {
            console.warn(
              '⚠️ [VOICE-CLONE] Failed to delete old voice (non-critical):',
              deleteError
            );
          }
        }
      } else {
        console.error('❌ [VOICE-CLONE] No voice ID returned from cloning service');
        toast.error('Failed to get voice ID from cloning service.');
      }
    } catch (error) {
      console.error('❌ [VOICE-CLONE] Reclone error:', error);
      toast.error('Failed to reclone voice. Please try again.');
      setShowSuccess(false);
    } finally {
      setIsRecloning(false);
      setProcessingStep(0);
    }
  };

  const handleReset = () => {
    setRecordingBlob(null);
    setRecordingTime(0);
    setHasClonedVoice(false);
    setCurrentVoiceCloneId(null);
    setAudioLevels(Array(15).fill(0));
    setSampleText(DEFAULT_SAMPLE_TEXT);
    setShowSuccess(false);
    toast.info('Voice clone reset. Record a new one!');
  };

  const handleMainAction = () => {
    if (isRecording) {
      stopRecording();
    } else if (recordingBlob && !hasClonedVoice) {
      handleReclone();
    } else if (hasClonedVoice) {
      if (isPlayingSample) {
        handleStopSample();
      } else {
        handlePlaySample();
      }
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMainButtonContent = () => {
    if (isRecording) {
      return (
        <Circle className="h-20 w-20 animate-pulse fill-current text-red-500 sm:h-24 sm:w-24" />
      );
    }
    if (isRecloning) {
      if (showSuccess) {
        return (
          <Check className="h-20 w-20 animate-[checkmark_0.6s_ease-out] text-green-500 sm:h-24 sm:w-24" />
        );
      }
      return (
        <div className="h-20 w-20 animate-spin rounded-full border-8 border-current border-t-transparent sm:h-24 sm:w-24" />
      );
    }
    if (hasClonedVoice) {
      return isPlayingSample ? (
        <Pause className="h-20 w-20 sm:h-24 sm:w-24" />
      ) : (
        <Play className="h-20 w-20 sm:h-24 sm:w-24" />
      );
    }
    return <Mic className="h-20 w-20 sm:h-24 sm:w-24" />;
  };

  const getStatusText = () => {
    if (isRecording) {
      return 'Recording...';
    }
    if (showSuccess) {
      return 'Success! 🎉';
    }
    if (isRecloning) {
      return PROCESSING_STEPS[processingStep]?.label || 'Processing...';
    }
    if (hasClonedVoice) {
      return 'Voice Cloned ✓';
    }
    if (recordingBlob) {
      return 'Ready to Clone';
    }
    return 'Clone Your Voice';
  };

  const getSubtext = () => {
    if (isRecording) {
      return 'Click to stop';
    }
    if (showSuccess) {
      return 'Ready to test your new voice!';
    }
    if (isRecloning) {
      return 'Please wait...';
    }
    if (hasClonedVoice) {
      return 'Click to test your voice';
    }
    if (recordingBlob) {
      return 'Click to start cloning';
    }
    return 'Click to record 30+ seconds';
  };

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-electric/20 bg-gradient-to-br from-card/40 via-card/30 to-electric/5 backdrop-blur-xl">
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-2xl font-bold sm:text-3xl">
            <Mic className="h-6 w-6 text-electric sm:h-7 sm:w-7" />
            Voice Cloning
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Clone your voice and test it in seconds
          </p>
        </div>

        {/* Central Circular Control */}
        <div className="flex flex-col items-center space-y-6">
          <button
            onClick={handleMainAction}
            disabled={
              isLoadingSample ||
              isRecloning ||
              (!sampleText.trim() && hasClonedVoice) ||
              showSuccess
            }
            className={`transition-electric group relative flex h-40 w-40 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50 disabled:hover:shadow-none sm:h-48 sm:w-48 ${
              showSuccess
                ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-[0_20px_40px_rgba(34,197,94,0.4)]'
                : 'bg-gradient-electric hover:shadow-[0_20px_40px_rgba(97,144,255,0.3)]'
            }`}
          >
            {getMainButtonContent()}
            {showSuccess && (
              <Sparkles className="absolute -right-2 -top-2 h-8 w-8 animate-pulse text-yellow-400" />
            )}
          </button>

          {/* Status Text */}
          <div className="text-center">
            <div className="text-xl font-bold sm:text-2xl">{getStatusText()}</div>
            <div className="text-sm text-muted-foreground">{getSubtext()}</div>
            {isRecording && (
              <div className="mt-2 font-mono text-2xl font-bold">{formatTime(recordingTime)}</div>
            )}
          </div>
        </div>

        {/* Waveform During Recording */}
        {isRecording && (
          <div className="py-4">
            <Waveform levels={audioLevels} isActive={true} variant="recording" />
          </div>
        )}

        {/* Processing Animation with Steps */}
        {isRecloning && !showSuccess && (
          <div className="rounded-3xl border border-electric/20 bg-gradient-to-br from-card/40 via-card/30 to-electric/5 p-6">
            <div className="space-y-4">
              {PROCESSING_STEPS.map((step, index) => (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 transition-all ${
                    processingStep >= index ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  {processingStep > index ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : processingStep === index ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-electric border-t-transparent" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-700" />
                  )}
                  <div className="text-base font-medium">{step.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-[2px] w-full overflow-hidden rounded bg-slate-700/30">
              <div className="metallic-strike h-full w-full" />
            </div>
          </div>
        )}

        {/* Success Animation */}
        {showSuccess && (
          <div className="rounded-3xl border border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-12 w-12 animate-pulse text-yellow-400" />
            <h3 className="mb-2 text-2xl font-bold text-green-500">Voice Cloned Successfully!</h3>
            <p className="text-muted-foreground">Preparing your voice for testing...</p>
          </div>
        )}

        {/* Recording Info */}
        {recordingBlob && !isRecording && !hasClonedVoice && !isRecloning && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
            <p className="font-medium text-green-500">
              <Check className="mr-2 inline h-4 w-4" />
              Recording Complete: {formatTime(recordingTime)} (
              {Math.round(recordingBlob.size / 1024)}
              KB)
            </p>
            {recordingBlob.size < 512 * 1024 && (
              <p className="mt-2 text-xs text-yellow-500">
                ⚠️ For best results, record at least 30 seconds (512KB)
              </p>
            )}
          </div>
        )}

        {/* Sample Text + Actions (Only show when voice is cloned) */}
        {hasClonedVoice && !isRecloning && !showSuccess && (
          <div className="space-y-4 border-t border-border/50 pt-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold">Test Your Voice</h3>
              <Textarea
                value={sampleText}
                onChange={e => setSampleText(e.target.value)}
                placeholder="Type something to test your cloned voice..."
                rows={3}
                className="resize-none text-base"
                maxLength={500}
              />
            </div>

            <Button
              onClick={isPlayingSample ? handleStopSample : handlePlaySample}
              disabled={!sampleText.trim() || isLoadingSample}
              className="w-full bg-gradient-electric"
              size="lg"
            >
              {isLoadingSample ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : isPlayingSample ? (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Play Sample
                </>
              )}
            </Button>
          </div>
        )}

        {/* Errors */}
        {(ttsError || cloneError) && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
            {ttsError || cloneError}
          </div>
        )}

        {/* Action Buttons */}
        {!isRecloning && !showSuccess && (
          <div className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row">
            {!isRecording && (recordingBlob || hasClonedVoice) && (
              <Button onClick={startRecording} variant="outline" className="flex-1" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Record New Sample
              </Button>
            )}
            <Button
              onClick={() => setShowTipsModal(true)}
              variant="ghost"
              size="lg"
              className="flex-1"
            >
              <Info className="mr-2 h-4 w-4" />
              Tips
            </Button>
            {(recordingBlob || hasClonedVoice) && (
              <Button onClick={handleReset} variant="outline" size="lg" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tips Modal */}
      <Dialog open={showTipsModal} onOpenChange={setShowTipsModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tips for Better Voice Cloning</DialogTitle>
            <DialogDescription>
              Follow these tips to get the best results from your voice clone
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold sm:text-base">📏 Recording Length</h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Record at least 30 seconds (512KB) for good quality. Longer recordings (1-2 minutes)
                produce even better results.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold sm:text-base">🎤 Audio Quality</h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Use a quiet environment with minimal background noise. A good microphone helps, but
                your phone&apos;s built-in mic works too.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold sm:text-base">🗣️ Speaking Style</h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Speak naturally and clearly. Don&apos;t rush. Use your normal speaking pace and
                tone. Avoid whispering or shouting.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold sm:text-base">📝 Content Variety</h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Include a variety of words and sentences. Reading a short story or article works
                great. Avoid repetitive phrases.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold sm:text-base">✨ Consistency</h4>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Record in one session without long pauses. Keep your distance from the microphone
                consistent throughout.
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
              <p className="text-xs font-medium text-blue-500 sm:text-sm">
                💡 Pro Tip: Try reading aloud from a book or article. The variety helps the AI learn
                your voice patterns better!
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowTipsModal(false)}>Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .metallic-strike {
          background: linear-gradient(
            90deg,
            rgba(148, 163, 184, 0.2) 0%,
            rgba(229, 231, 235, 0.9) 40%,
            rgba(203, 213, 225, 0.7) 60%,
            rgba(148, 163, 184, 0.2) 100%
          );
          background-size: 200% 100%;
          animation: metallic-scan 1100ms linear infinite;
        }

        @keyframes metallic-scan {
          0% {
            background-position: 0% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
