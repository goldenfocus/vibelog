'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, X, Video, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import Waveform from '@/components/mic/Waveform';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useVideoCapture } from '@/hooks/useVideoCapture';
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

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

  // Video capture integration
  const {
    status: videoStatus,
    error: videoError,
    recordingTime: videoRecordingTime,
    videoBlob,
    facingMode,
    videoRef,
    startCameraPreview,
    stopCameraPreview,
    startRecording: startVideoRecording,
    stopRecording: stopVideoRecording,
    cancelRecording: cancelVideoRecording,
    toggleCamera,
    resetCapture: resetVideoCapture,
    formatTime: formatVideoTime,
  } = useVideoCapture({ maxDurationSeconds: 60 });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [textContent]);

  // Typing indicator - debounced to reduce database writes
  useEffect(() => {
    if (textContent.length > 0) {
      // Only send "typing" signal once at the start of typing
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping?.(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTyping?.(false);
        typingTimeoutRef.current = null;
      }, 3000);
    } else {
      // User cleared input - stop typing immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingRef.current = false;
      onTyping?.(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
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
      const sessionId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      formData.append('audio', audioBlob, `voice-message-${sessionId}.webm`);
      formData.append('sessionId', sessionId);

      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      const { url: audioUrl } = await uploadResponse.json();

      // Send message - duration from useAudioEngine is in seconds, convert to milliseconds
      await onSendMessage({
        audio_url: audioUrl,
        audio_duration: duration * 1000,
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

  // Start video recording mode
  const handleStartVideoMode = async () => {
    setInputMode('video');
    await startCameraPreview();
  };

  // Cancel video recording
  const handleCancelVideoRecording = () => {
    cancelVideoRecording();
    stopCameraPreview();
    resetVideoCapture();
    setInputMode('text');
  };

  // Send video message
  const handleSendVideoMessage = async () => {
    if (!videoBlob) {
      return;
    }

    try {
      setIsSending(true);

      // Upload video to Supabase Storage
      const formData = new FormData();
      const sessionId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      formData.append('video', videoBlob, `video-message-${sessionId}.webm`);
      formData.append('sessionId', sessionId);

      const uploadResponse = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video');
      }

      const { url: videoUrl } = await uploadResponse.json();

      // Send message
      await onSendMessage({
        video_url: videoUrl,
        reply_to_message_id: replyTo?.id,
      });

      // Reset
      resetVideoCapture();
      setInputMode('text');
      onClearReply?.();
    } catch (error) {
      console.error('Failed to send video message:', error);
    } finally {
      setIsSending(false);
    }
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

            {/* Premium Send/Voice/Video buttons */}
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
              <div className="flex gap-2">
                {/* Voice recording button */}
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

                {/* Video recording button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartVideoMode}
                  className={cn(
                    'group relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full',
                    'bg-gradient-to-br from-purple-500 to-purple-600',
                    'flex items-center justify-center text-white',
                    'shadow-lg shadow-purple-500/40 transition-all duration-300',
                    'hover:shadow-xl hover:shadow-purple-500/50'
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
                    <Video size={20} />
                  </motion.div>
                </motion.button>
              </div>
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
        ) : inputMode === 'video' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Video Recording UI */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-purple-200/50 bg-gradient-to-br from-white/90 to-purple-50/30 shadow-lg backdrop-blur-sm dark:border-purple-800/50 dark:from-zinc-800/90 dark:to-purple-950/30">
              {/* Camera Preview */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {videoStatus === 'preview' && videoBlob ? (
                  // Show recorded video preview
                  <video
                    src={URL.createObjectURL(videoBlob)}
                    className="h-full w-full object-cover"
                    controls
                    autoPlay
                    loop
                    muted
                  />
                ) : (
                  // Show live camera feed
                  <video
                    ref={videoRef}
                    className={cn(
                      'h-full w-full object-cover',
                      facingMode === 'user' && 'scale-x-[-1]'
                    )}
                    autoPlay
                    playsInline
                    muted
                  />
                )}

                {/* Recording indicator overlay */}
                {videoStatus === 'recording' && (
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="h-3 w-3 rounded-full bg-red-500"
                    />
                    <span className="font-mono text-sm font-semibold text-white">
                      {formatVideoTime(videoRecordingTime)}
                    </span>
                  </div>
                )}

                {/* Camera loading/error states */}
                {(videoStatus === 'idle' || videoStatus === 'requesting') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mx-auto h-8 w-8 rounded-full border-2 border-purple-400/30 border-t-purple-500"
                      />
                      <p className="mt-3 text-sm text-zinc-400">Starting camera...</p>
                    </div>
                  </div>
                )}

                {videoStatus === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="px-4 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                        <X size={24} className="text-red-500" />
                      </div>
                      <p className="text-sm text-red-400">{videoError || 'Camera error'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left side: Cancel button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancelVideoRecording}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition-all hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                  >
                    Cancel
                  </motion.button>

                  {/* Center: Record/Stop button */}
                  <div className="flex items-center gap-3">
                    {videoStatus === 'ready' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startVideoRecording}
                        className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/40 transition-all hover:shadow-xl hover:shadow-red-500/50"
                      >
                        <div className="h-5 w-5 rounded-full bg-white" />
                      </motion.button>
                    )}

                    {videoStatus === 'recording' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={stopVideoRecording}
                        className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/40 transition-all hover:shadow-xl hover:shadow-red-500/50"
                      >
                        <div className="h-5 w-5 rounded-sm bg-white" />
                      </motion.button>
                    )}

                    {videoStatus === 'preview' && videoBlob && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            resetVideoCapture();
                            startCameraPreview();
                          }}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition-all hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        >
                          <RotateCcw size={20} />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSendVideoMessage}
                          disabled={isSending}
                          className="group relative overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50"
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
                              <>
                                <Send size={16} />
                                Send
                              </>
                            )}
                          </span>
                        </motion.button>
                      </>
                    )}
                  </div>

                  {/* Right side: Flip camera button */}
                  {(videoStatus === 'ready' || videoStatus === 'recording') && (
                    <motion.button
                      whileHover={{ scale: 1.05, rotate: 180 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleCamera}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-700 transition-all hover:bg-zinc-300 dark:bg-zinc-700/80 dark:text-zinc-300 dark:hover:bg-zinc-600"
                    >
                      <RotateCcw size={18} />
                    </motion.button>
                  )}

                  {videoStatus === 'preview' && <div className="w-10" />}
                </div>
              </div>
            </div>
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
          <span className="text-zinc-400 dark:text-zinc-500">for voice,</span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600">
            <Video size={12} className="text-white" />
          </div>
          <span className="text-zinc-400 dark:text-zinc-500">for video, or type</span>
        </motion.div>
      )}
    </div>
  );
}
