'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import Waveform from '@/components/mic/Waveform';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { cn } from '@/lib/utils';
import { SendMessageRequest } from '@/types/messaging';

interface MessageInputProps {
  conversationId: string;
  onSendMessage: (data: SendMessageRequest) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  replyTo?: { id: string; content: string; sender: string } | null;
  onClearReply?: () => void;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  replyTo,
  onClearReply,
}: MessageInputProps) {
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio engine integration
  const {
    audioLevels,
    audioBlob,
    duration,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    resetAudioEngine,
  } = useAudioEngine(
    error => console.error('Audio error:', error),
    () => {}
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [textContent]);

  // Typing indicator
  useEffect(() => {
    if (textContent.length > 0) {
      onTyping?.(true);
      const timeout = setTimeout(() => onTyping?.(false), 1000);
      return () => clearTimeout(timeout);
    } else {
      onTyping?.(false);
    }
  }, [textContent, onTyping]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Format recording time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start voice recording
  const handleStartVoiceRecording = async () => {
    const success = await startAudioRecording();
    if (success) {
      setIsRecording(true);
      setInputMode('voice');
    }
  };

  // Stop voice recording
  const handleStopVoiceRecording = () => {
    stopAudioRecording();
    setIsRecording(false);
  };

  // Send voice message
  const handleSendVoiceMessage = async () => {
    if (!audioBlob) {
      return;
    }

    try {
      setIsSending(true);

      // Upload audio to Supabase Storage
      const formData = new FormData();
      formData.append('file', audioBlob, `voice-message-${Date.now()}.webm`);

      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      const { url: audioUrl } = await uploadResponse.json();

      // Send message
      await onSendMessage({
        audio_url: audioUrl,
        audio_duration: duration,
        reply_to_message_id: replyTo?.id,
      });

      // Reset
      resetAudioEngine();
      setInputMode('text');
      onClearReply?.();
    } catch (error) {
      console.error('Failed to send voice message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Send text message
  const handleSendTextMessage = async () => {
    if (!textContent.trim()) {
      return;
    }

    try {
      setIsSending(true);

      await onSendMessage({
        content: textContent.trim(),
        reply_to_message_id: replyTo?.id,
      });

      // Reset
      setTextContent('');
      onClearReply?.();
    } catch (error) {
      console.error('Failed to send text message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key (send on Enter, new line on Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTextMessage();
    }
  };

  // Cancel recording
  const handleCancelRecording = () => {
    handleStopVoiceRecording();
    resetAudioEngine();
    setInputMode('text');
  };

  return (
    <div className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Reply indicator */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-metallic-blue-500">
                  Replying to {replyTo.sender}
                </div>
                <div className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {replyTo.content}
                </div>
              </div>
              <button
                onClick={onClearReply}
                className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4">
        {inputMode === 'text' ? (
          <div className="flex items-end gap-2">
            {/* Text input */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className={cn(
                  'w-full rounded-3xl px-4 py-3 pr-12',
                  'bg-zinc-100 dark:bg-zinc-800',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-500',
                  'border border-transparent focus:border-metallic-blue-500',
                  'resize-none outline-none',
                  'max-h-32 overflow-y-auto'
                )}
                rows={1}
              />
            </div>

            {/* Send/Voice button */}
            {textContent.trim() ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSendTextMessage}
                disabled={isSending}
                className={cn(
                  'h-12 w-12 flex-shrink-0 rounded-full',
                  'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
                  'flex items-center justify-center text-white',
                  'transition-shadow hover:shadow-lg',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isSending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send size={20} />
                )}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onMouseDown={handleStartVoiceRecording}
                onMouseUp={handleStopVoiceRecording}
                onTouchStart={handleStartVoiceRecording}
                onTouchEnd={handleStopVoiceRecording}
                className={cn(
                  'h-12 w-12 flex-shrink-0 rounded-full',
                  'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
                  'flex items-center justify-center text-white',
                  'transition-shadow hover:shadow-lg',
                  'active:scale-95'
                )}
              >
                <Mic size={20} />
              </motion.button>
            )}
          </div>
        ) : inputMode === 'voice' ? (
          <div className="space-y-3">
            {/* Recording UI */}
            <div className="flex items-center justify-between rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                  {formatTime(recordingTime)}
                </span>
              </div>

              <div className="flex gap-2">
                {/* Cancel */}
                <button
                  onClick={handleCancelRecording}
                  className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Cancel
                </button>

                {/* Stop & Send */}
                {isRecording ? (
                  <button
                    onClick={handleStopVoiceRecording}
                    className="rounded-full bg-metallic-blue-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    Stop
                  </button>
                ) : audioBlob ? (
                  <button
                    onClick={handleSendVoiceMessage}
                    disabled={isSending}
                    className="rounded-full bg-metallic-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Waveform */}
            {isRecording && <Waveform levels={audioLevels} isActive variant="recording" />}
          </div>
        ) : null}
      </div>

      {/* Instructions */}
      {inputMode === 'text' && !textContent && (
        <div className="px-4 pb-3 text-center text-xs text-zinc-500">
          Hold to record voice • Tap to type
        </div>
      )}
    </div>
  );
}
