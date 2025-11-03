'use client';

import { Info, Loader2, Mic, Play, Pause, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
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

export default function VoiceCloningSettings({ userId }: VoiceCloningSettingsProps) {
  const { profile } = useProfile(userId);
  const { cloneVoice, error: cloneError } = useVoiceCloning();
  const supabase = createClient();

  // Local TTS state for simpler playback control
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT);
  const [isRecloning, setIsRecloning] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasClonedVoice, setHasClonedVoice] = useState(false);
  // CRITICAL: Track the current voice_clone_id locally so it updates immediately
  const [currentVoiceCloneId, setCurrentVoiceCloneId] = useState<string | null>(null);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check if user has a cloned voice and sync with profile
  useEffect(() => {
    if (profile) {
      const voiceCloneId = (profile as ProfileWithVoiceClone).voice_clone_id;
      setHasClonedVoice(!!voiceCloneId);
      // IMPORTANT: Update local state when profile changes
      if (voiceCloneId) {
        setCurrentVoiceCloneId(voiceCloneId);
      }
    }
  }, [profile]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (recordingAudioUrl) {
        URL.revokeObjectURL(recordingAudioUrl);
      }
    };
  }, [recordingAudioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        const url = URL.createObjectURL(audioBlob);
        setRecordingAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
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

    // CRITICAL: Use currentVoiceCloneId instead of profile to get the latest value
    const voiceCloneId = currentVoiceCloneId || (profile as ProfileWithVoiceClone)?.voice_clone_id;
    if (!voiceCloneId) {
      toast.error('No cloned voice found. Please clone your voice first.');
      return;
    }

    // Stop any currently playing audio
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }

    setIsLoadingSample(true);
    setTtsError(null);

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sampleText,
          voice: 'shimmer',
          voiceCloneId: voiceCloneId,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to generate speech' }));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      sampleAudioRef.current = audio;

      audio.onended = () => {
        setIsPlayingSample(false);
        URL.revokeObjectURL(audioUrl);
        sampleAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlayingSample(false);
        setTtsError('Playback failed');
        URL.revokeObjectURL(audioUrl);
        sampleAudioRef.current = null;
      };

      await audio.play();
      setIsPlayingSample(true);
    } catch (error) {
      console.error('TTS error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to play sample';
      setTtsError(errorMessage);
      setIsPlayingSample(false);
      // If error suggests voice isn't ready, show helpful message
      if (
        errorMessage.toLowerCase().includes('voice') ||
        errorMessage.toLowerCase().includes('not found') ||
        errorMessage.toLowerCase().includes('invalid')
      ) {
        toast.error('Voice may still be processing. Please wait a few seconds and try again.');
      }
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleStopSample = () => {
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current.currentTime = 0;
      setIsPlayingSample(false);
    }
  };

  const handleReclone = async () => {
    if (!recordingBlob) {
      setShowTipsModal(true);
      return;
    }

    setIsRecloning(true);
    setIsVoiceProcessing(false);

    try {
      toast.info('Cloning your voice... This may take a moment.');

      // Get the old voice ID before cloning so we can delete it
      const oldVoiceCloneId =
        currentVoiceCloneId || (profile as ProfileWithVoiceClone)?.voice_clone_id;

      const voiceName = `${(profile as ProfileWithVoiceClone)?.display_name || 'User'}'s Voice`;
      const result = await cloneVoice(recordingBlob, undefined, voiceName);

      if (result?.voiceId) {
        // CRITICAL: Update local state IMMEDIATELY with new voice ID
        setCurrentVoiceCloneId(result.voiceId);
        setHasClonedVoice(true);

        toast.success('Voice cloned! Processing... Please wait a few seconds before testing.');

        // Set processing state
        setIsVoiceProcessing(true);

        // Refresh profile from database to ensure consistency
        // Wait a bit for database to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data, error: refreshError } = await supabase
          .from('profiles')
          .select('voice_clone_id')
          .eq('id', userId)
          .single();

        if (refreshError) {
          console.error('Failed to refresh profile:', refreshError);
        } else if (data?.voice_clone_id) {
          // Double-check the database has the new voice ID
          setCurrentVoiceCloneId(data.voice_clone_id);
          console.log('✅ Profile refreshed with new voice_clone_id:', data.voice_clone_id);
        }

        // Delete old voice from ElevenLabs if it exists and is different
        if (oldVoiceCloneId && oldVoiceCloneId !== result.voiceId) {
          try {
            console.log('🗑️ Deleting old voice from ElevenLabs:', oldVoiceCloneId);
            const deleteResponse = await fetch('/api/delete-voice', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ voiceId: oldVoiceCloneId }),
            });

            if (deleteResponse.ok) {
              console.log('✅ Old voice deleted successfully');
            } else {
              console.warn('⚠️ Failed to delete old voice (non-critical)');
            }
          } catch (deleteError) {
            console.warn('Failed to delete old voice (non-critical):', deleteError);
            // Don't fail the whole operation if deletion fails
          }
        }

        // Wait for ElevenLabs to process the voice (usually ready in 3-5 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));

        setIsVoiceProcessing(false);
        toast.success('Voice ready! You can now test it with the Play Sample button.');

        // Clear recording blob so user can record again if needed
        setRecordingBlob(null);
        setRecordingTime(0);
      } else {
        toast.error('Failed to get voice ID from cloning service.');
      }
    } catch (error) {
      console.error('Reclone error:', error);
      setIsVoiceProcessing(false);
      toast.error('Failed to reclone voice. Please try again.');
    } finally {
      setIsRecloning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            Voice Cloning
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Test your cloned voice and create a new one if needed
          </p>
        </div>

        {/* Status Badge */}
        <div
          className={`rounded-lg border p-3 sm:p-4 ${
            hasClonedVoice
              ? 'border-green-500/50 bg-green-500/10'
              : 'border-yellow-500/50 bg-yellow-500/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{hasClonedVoice ? '✓ Voice Cloned' : 'No Voice Clone'}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {hasClonedVoice
                  ? 'Your voice is ready to use'
                  : 'Record 30+ seconds to clone your voice'}
              </p>
            </div>
          </div>
        </div>

        {/* Sample Text Editor */}
        <div className="space-y-2">
          <Label htmlFor="sampleText" className="text-sm font-medium sm:text-base">
            Sample Text
          </Label>
          <Textarea
            id="sampleText"
            value={sampleText}
            onChange={e => setSampleText(e.target.value)}
            placeholder="Enter text to test your cloned voice..."
            rows={4}
            className="resize-none text-sm sm:text-base"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {sampleText.length}/500 characters
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSampleText(DEFAULT_SAMPLE_TEXT)}
              className="text-xs sm:text-sm"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Play Sample Button */}
        {hasClonedVoice && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {isVoiceProcessing && (
              <div className="mb-2 rounded-lg border border-blue-500/50 bg-blue-500/10 p-2 text-center text-xs text-blue-500 sm:text-sm">
                ⏳ Voice is processing... Please wait a few seconds before testing.
              </div>
            )}
            <Button
              onClick={isPlayingSample ? handleStopSample : handlePlaySample}
              disabled={!sampleText.trim() || isLoadingSample || isVoiceProcessing}
              className="flex-1"
              size="lg"
            >
              {isLoadingSample ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : isPlayingSample ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {isVoiceProcessing ? 'Processing...' : 'Play Sample'}
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

        {/* Reclone Section */}
        <div className="border-t border-border/50 pt-4 sm:pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-base font-semibold sm:text-lg">Reclone Your Voice</h3>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Record a new sample to improve or update your voice clone
              </p>
            </div>

            {/* Recording Controls */}
            <div className="space-y-3">
              {!recordingBlob && !isRecording && (
                <Button onClick={startRecording} variant="outline" className="w-full" size="lg">
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                    <div className="flex h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-lg font-semibold">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    Stop Recording
                  </Button>
                </div>
              )}

              {recordingBlob && !isRecording && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/50 bg-card/50 p-3">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Recording: {formatTime(recordingTime)} (
                      {Math.round(recordingBlob.size / 1024)}KB)
                    </p>
                    {recordingBlob.size < 512 * 1024 && (
                      <p className="mt-1 text-xs text-yellow-500">
                        ⚠️ For best results, record at least 30 seconds (512KB)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={startRecording} variant="outline" className="flex-1" size="lg">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Record Again
                    </Button>
                    <Button
                      onClick={handleReclone}
                      disabled={isRecloning || recordingBlob.size < 1024}
                      className="flex-1"
                      size="lg"
                    >
                      {isRecloning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cloning...
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Reclone Voice
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips Button */}
            <Button
              onClick={() => setShowTipsModal(true)}
              variant="ghost"
              size="sm"
              className="w-full text-xs sm:text-sm"
            >
              <Info className="mr-2 h-4 w-4" />
              Tips for Better Voice Cloning
            </Button>
          </div>
        </div>
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
    </div>
  );
}
