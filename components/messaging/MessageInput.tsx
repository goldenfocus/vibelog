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
    <div className="border-t border-metallic-blue-200/30 bg-gradient-to-b from-white/95 to-white backdrop-blur-xl dark:border-metallic-blue-800/30 dark:from-zinc-900/95 dark:to-zinc-900">
      {/* Premium Reply indicator */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="dark:from-metallic-blue-950/30 relative overflow-hidden border-b border-metallic-blue-200/30 bg-gradient-to-r from-metallic-blue-50/50 to-transparent px-4 py-3 dark:border-metallic-blue-800/30"
          >
            {/* Accent bar */}
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-metallic-blue-500 to-metallic-blue-600" />

            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pl-3">
                <div className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-metallic-blue-600 dark:text-metallic-blue-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  <span>Replying to {replyTo.sender}</span>
                </div>
                <div className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {replyTo.content}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClearReply}
                className="rounded-full p-2 transition-colors hover:bg-metallic-blue-100 dark:hover:bg-metallic-blue-900/50"
              >
                <X size={16} className="text-metallic-blue-600 dark:text-metallic-blue-400" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4">
        {inputMode === 'text' ? (
          <div className="flex items-end gap-3">
            {/* Premium Text input with glass effect */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className={cn(
                  'w-full rounded-3xl border-2 px-5 py-3.5 pr-12',
                  'bg-white/80 backdrop-blur-sm dark:bg-zinc-800/80',
                  'text-zinc-900 dark:text-white',
                  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                  'border-zinc-200/50 focus:border-metallic-blue-500 dark:border-zinc-700/50 dark:focus:border-metallic-blue-400',
                  'shadow-sm focus:shadow-md focus:shadow-metallic-blue-500/20',
                  'resize-none outline-none transition-all duration-200',
                  'max-h-32 overflow-y-auto'
                )}
                rows={1}
              />
            </div>

            {/* Premium Send/Voice button */}
            {textContent.trim() ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendTextMessage}
                disabled={isSending}
                className={cn(
                  'group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full',
                  'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
                  'flex items-center justify-center text-white',
                  'shadow-lg shadow-metallic-blue-500/40 transition-all duration-300',
                  'hover:shadow-xl hover:shadow-metallic-blue-500/50',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {isSending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="relative h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <motion.div
                    whileHover={{ x: 2, y: -2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="relative"
                  >
                    <Send size={20} />
                  </motion.div>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseDown={handleStartVoiceRecording}
                onMouseUp={handleStopVoiceRecording}
                onTouchStart={handleStartVoiceRecording}
                onTouchEnd={handleStopVoiceRecording}
                className={cn(
                  'group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full',
                  'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
                  'flex items-center justify-center text-white',
                  'shadow-lg shadow-metallic-blue-500/40 transition-all duration-300',
                  'hover:shadow-xl hover:shadow-metallic-blue-500/50'
                )}
              >
                {/* Pulse effect on hover */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-100"
                />

                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  className="relative"
                >
                  <Mic size={20} />
                </motion.div>
              </motion.button>
            )}
          </div>
        ) : inputMode === 'voice' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Premium Recording UI */}
            <div className="dark:to-metallic-blue-950/30 relative overflow-hidden rounded-3xl border-2 border-metallic-blue-200/50 bg-gradient-to-br from-white/90 to-metallic-blue-50/30 p-4 shadow-lg backdrop-blur-sm dark:border-metallic-blue-800/50 dark:from-zinc-800/90">
              {/* Animated gradient background */}
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(45deg, rgba(30, 116, 255, 0.1) 0%, transparent 100%)',
                    'linear-gradient(225deg, rgba(30, 116, 255, 0.1) 0%, transparent 100%)',
                    'linear-gradient(45deg, rgba(30, 116, 255, 0.1) 0%, transparent 100%)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0"
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Pulsing red dot */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="relative flex h-4 w-4 items-center justify-center"
                  >
                    <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 blur-sm" />
                    <div className="relative h-3 w-3 rounded-full bg-red-500" />
                  </motion.div>

                  {/* Timer with gradient */}
                  <span className="bg-gradient-to-r from-metallic-blue-600 to-metallic-blue-500 bg-clip-text font-mono text-lg font-bold text-transparent dark:from-metallic-blue-400 dark:to-metallic-blue-300">
                    {formatTime(recordingTime)}
                  </span>
                </div>

                <div className="flex gap-2">
                  {/* Cancel button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancelRecording}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-all hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                  >
                    Cancel
                  </motion.button>

                  {/* Stop & Send buttons */}
                  {isRecording ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStopVoiceRecording}
                      className="group relative overflow-hidden rounded-full bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-metallic-blue-500/40 transition-all hover:shadow-lg hover:shadow-metallic-blue-500/50"
                    >
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative">Stop</span>
                    </motion.button>
                  ) : audioBlob ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendVoiceMessage}
                      disabled={isSending}
                      className="group relative overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50"
                    >
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative flex items-center gap-2">
                        {isSending ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white"
                            />
                            Sending...
                          </>
                        ) : (
                          'Send'
                        )}
                      </span>
                    </motion.button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Premium Waveform with glass container */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-3xl border border-metallic-blue-200/30 bg-white/50 p-4 backdrop-blur-sm dark:border-metallic-blue-800/30 dark:bg-zinc-900/50"
              >
                <Waveform levels={audioLevels} isActive variant="recording" />
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* Premium Instructions */}
      {inputMode === 'text' && !textContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 px-4 pb-3 text-xs font-medium"
        >
          <span className="text-zinc-400 dark:text-zinc-500">Hold</span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600">
            <Mic size={12} className="text-white" />
          </div>
          <span className="text-zinc-400 dark:text-zinc-500">
            to record voice or type a message
          </span>
        </motion.div>
      )}
    </div>
  );
}
