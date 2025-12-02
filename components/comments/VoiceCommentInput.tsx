/**
 * Voice Comment Input Component
 * Voice recording with AI transcription and enhancement
 */

'use client';

import { Edit3, X, Sparkles, Send } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import MediaAttachmentZone from '@/components/comments/MediaAttachmentZone';
import { AudioEngine } from '@/components/mic/AudioEngine';
import Controls from '@/components/mic/Controls';
import Waveform from '@/components/mic/Waveform';
import { useI18n } from '@/components/providers/I18nProvider';
import { useToneSettings } from '@/hooks/useToneSettings';
import type { WritingTone } from '@/hooks/useToneSettings';
import type { MediaAttachment } from '@/types/comments';

type RecordingState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'transcribing'
  | 'reviewing';

interface VoiceCommentInputProps {
  vibelogId: string;
  parentCommentId?: string;
  onCommentAdded: () => void;
}

export default function VoiceCommentInput({
  vibelogId,
  parentCommentId,
  onCommentAdded,
}: VoiceCommentInputProps) {
  const { t } = useI18n();
  const { tone, setTone } = useToneSettings();

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 15 }, () => 0.1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      try {
        setRecordingState('transcribing');

        const formData = new FormData();
        formData.append('audio', blob, 'comment.webm');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to transcribe audio');
        }

        const { transcription } = await response.json();

        if (!transcription || transcription.trim() === '') {
          throw new Error('Transcription is empty. Please try recording again with clearer audio.');
        }

        setTranscript(transcription);
        setOriginalTranscript(transcription);
        setRecordingState('reviewing');
        toast.success(t('toasts.comments.transcriptionReady'));
      } catch (error) {
        console.error('Transcription error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
        toast.error(t('toasts.comments.transcriptionFailed', { error: errorMessage }));
        setTranscript('');
        setRecordingState('processing');
      }
    },
    [t]
  );

  // Initialize audio engine
  useEffect(() => {
    audioEngineRef.current = new AudioEngine({
      onLevelsUpdate: setLevels,
      onDataAvailable: async (blob, duration) => {
        setAudioBlob(blob);
        setRecordingState('transcribing');
        console.log('Recording complete:', blob.size, 'bytes,', duration, 'seconds');
        await transcribeAudio(blob);
      },
      onError: error => {
        toast.error(error);
        setRecordingState('idle');
      },
    });

    return () => {
      audioEngineRef.current?.cleanup();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [transcribeAudio]);

  const startRecording = async () => {
    if (!audioEngineRef.current) {
      return;
    }

    const hasPermission = await audioEngineRef.current.requestPermission();
    if (!hasPermission) {
      toast.error(t('toasts.comments.microphoneDenied'));
      return;
    }

    const started = await audioEngineRef.current.startRecording();
    if (started) {
      setRecordingState('recording');
      setRecordingTime(0);
      setAudioBlob(null);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    audioEngineRef.current?.stopRecordingAndRelease();
    setRecordingState('processing');
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const resetRecording = () => {
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    setTranscript('');
    setOriginalTranscript('');
    setCustomInstructions('');
    setShowCustomInstructions(false);
    setAttachments([]);
    setLevels(Array.from({ length: 15 }, () => 0.1));
  };

  const handleRegenerateComment = async () => {
    if (!transcript.trim()) {
      toast.error(t('toasts.comments.noTranscript'));
      return;
    }

    setIsRegenerating(true);

    try {
      const response = await fetch('/api/comments/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: originalTranscript || transcript,
          tone,
          customInstructions: customInstructions.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enhance comment');
      }

      const { enhanced_content } = await response.json();
      setTranscript(enhanced_content);
      toast.success(t('toasts.comments.enhanced', { tone }));
    } catch (error) {
      console.error('Error regenerating comment:', error);
      toast.error(error instanceof Error ? error.message : t('toasts.comments.enhanceFailed'));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      toast.error(t('toasts.comments.recordVoice'));
      return;
    }

    if (recordingState === 'reviewing' && !transcript.trim()) {
      toast.error(t('toasts.comments.enterOrRecord'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'comment.webm');
      formData.append('vibelogId', vibelogId);

      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload audio');
      }

      const { url: audioUrl } = await uploadResponse.json();

      if (!audioUrl) {
        throw new Error('No audio URL returned from upload');
      }

      // Create comment with audio URL
      const commentResponse = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId,
          audioUrl,
          parentCommentId,
          content: transcript.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (!commentResponse.ok) {
        const error = await commentResponse.json();
        throw new Error(error.error || 'Failed to submit comment');
      }

      toast.success(t('toasts.comments.voiceLive'));
      resetRecording();
      onCommentAdded();
    } catch (error) {
      console.error('Error submitting voice comment:', error);
      toast.error(error instanceof Error ? error.message : t('toasts.comments.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      {(recordingState === 'idle' ||
        recordingState === 'recording' ||
        recordingState === 'processing') && (
        <Controls
          recordingState={
            recordingState === 'idle' ||
            recordingState === 'recording' ||
            recordingState === 'processing'
              ? recordingState
              : 'idle'
          }
          recordingTime={recordingTime}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onReset={resetRecording}
          disabled={isSubmitting}
        />
      )}

      {/* Waveform */}
      {recordingState === 'recording' && (
        <Waveform levels={levels} isActive={true} variant="recording" />
      )}

      {/* Transcribing State */}
      {recordingState === 'transcribing' && (
        <div className="rounded-lg border border-border/30 bg-muted/30 p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-electric/30 border-t-electric" />
          <p className="text-sm font-medium text-foreground">Transcribing your voice...</p>
          <p className="mt-1 text-xs text-muted-foreground">This will just take a moment</p>
        </div>
      )}

      {/* Review & Edit Transcript */}
      {recordingState === 'reviewing' && transcript && (
        <div className="space-y-4 rounded-lg border-2 border-electric/20 bg-card/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-electric" />
              <h4 className="text-sm font-semibold">Review & Edit</h4>
            </div>
            {originalTranscript && transcript !== originalTranscript && (
              <button
                onClick={() => setTranscript(originalTranscript)}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Restore original
              </button>
            )}
          </div>

          {/* Tone Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value as WritingTone)}
              className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-electric focus:outline-none"
            >
              <option value="authentic">😊 Authentic - Natural & genuine</option>
              <option value="professional">💼 Professional - Formal & expert</option>
              <option value="casual">☕ Casual - Friendly & relaxed</option>
              <option value="humorous">😄 Humorous - Funny & lighthearted</option>
              <option value="inspiring">🌟 Inspiring - Motivational</option>
              <option value="analytical">📊 Analytical - Data-driven</option>
              <option value="storytelling">📖 Storytelling - Narrative focus</option>
              <option value="dramatic">🎭 Dramatic - Intense & emotional</option>
              <option value="poetic">✨ Poetic - Literary & artistic</option>
            </select>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowCustomInstructions(!showCustomInstructions)}
              className="text-xs font-medium text-electric transition-opacity hover:opacity-80"
            >
              {showCustomInstructions ? '− Hide' : '+ Add'} custom instructions
            </button>
            {showCustomInstructions && (
              <textarea
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder={t('placeholders.commentEnhance')}
                className="w-full resize-none rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
                rows={2}
              />
            )}
          </div>

          {/* AI Enhance Button */}
          <button
            onClick={handleRegenerateComment}
            disabled={isRegenerating}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-electric/30 bg-electric/5 px-4 py-2.5 text-sm font-semibold text-electric transition-all hover:border-electric/50 hover:bg-electric/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-electric/30 border-t-electric" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Enhance with AI
              </>
            )}
          </button>

          {/* Transcript Editor */}
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={t('placeholders.transcriptEdit')}
            className="w-full resize-none rounded-lg border border-border/30 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-electric focus:outline-none"
            rows={4}
          />

          {/* Media Attachments */}
          <MediaAttachmentZone attachments={attachments} onChange={setAttachments} />

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={resetRecording}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Re-record
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !transcript.trim()}
              className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post Comment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Legacy: Direct Submit for fallback */}
      {recordingState === 'complete' && audioBlob && !transcript && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-white transition-all hover:bg-electric-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post Voice Comment
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
