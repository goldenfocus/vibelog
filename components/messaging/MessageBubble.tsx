'use client';

import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

import { cn } from '@/lib/utils';
import { MessageWithDetails } from '@/types/messaging';
import { formatMessageTime } from '@/types/messaging';

import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface MessageBubbleProps {
  message: MessageWithDetails;
  isCurrentUser: boolean;
  onReply?: (message: MessageWithDetails) => void;
  onReact?: (message: MessageWithDetails, emoji: string) => void;
  onLongPress?: (message: MessageWithDetails) => void;
}

export function MessageBubble({
  message,
  isCurrentUser,
  onReply,
  onReact,
  onLongPress,
}: MessageBubbleProps) {
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, [0, 60], [0, 1]);
  const replyIconScale = useTransform(x, [0, 60], [0.5, 1]);

  // Swipe-to-reply gesture
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 60) {
      onReply?.(message);
    }
    x.set(0);
  };

  // Double-tap to like
  const handleDoubleTap = () => {
    onReact?.(message, '❤️');
  };

  // Long press for options menu
  let pressTimer: NodeJS.Timeout;
  const handlePressStart = () => {
    pressTimer = setTimeout(() => {
      onLongPress?.(message);
    }, 500);
  };
  const handlePressEnd = () => {
    clearTimeout(pressTimer);
  };

  return (
    <div
      className={cn('relative mb-3 flex', isCurrentUser ? 'justify-end' : 'justify-start')}
      onDoubleClick={handleDoubleTap}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
    >
      {/* Swipe-to-reply icon (left side for right-aligned, right side for left-aligned) */}
      {onReply && (
        <motion.div
          className={cn('absolute top-1/2 -translate-y-1/2', isCurrentUser ? 'left-0' : 'right-0')}
          style={{
            opacity: replyIconOpacity,
            scale: replyIconScale,
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-metallic-blue-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-metallic-blue-500"
            >
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Message bubble with swipe gesture */}
      <motion.div
        drag={onReply ? 'x' : false}
        dragConstraints={{ left: 0, right: isCurrentUser ? 0 : 100, top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          'max-w-[80%] rounded-3xl px-4 py-2.5 shadow-sm',
          'transition-all duration-200',
          isCurrentUser
            ? 'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600 text-white'
            : 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white'
        )}
      >
        {/* Reply indicator */}
        {message.reply_to && (
          <div
            className={cn(
              'mb-2 border-l-2 pb-2 pl-2 text-xs opacity-70',
              isCurrentUser ? 'border-white/30' : 'border-metallic-blue-500/30'
            )}
          >
            <div className="font-medium">{message.reply_to.sender?.display_name || 'Unknown'}</div>
            <div className="truncate">{message.reply_to.content || '🎤 Voice message'}</div>
          </div>
        )}

        {/* Sender name (for group chats, non-current user) */}
        {!isCurrentUser && (
          <div className="mb-1 text-xs font-medium text-metallic-blue-600 dark:text-metallic-blue-400">
            {message.sender?.display_name || 'Unknown'}
          </div>
        )}

        {/* Voice message */}
        {message.audio_url && (
          <VoiceMessagePlayer
            audioUrl={message.audio_url}
            duration={message.audio_duration || 0}
            transcript={message.transcript}
            isCurrentUser={isCurrentUser}
          />
        )}

        {/* Video message */}
        {message.video_url && (
          <div className="mb-2">
            <video
              src={message.video_url}
              controls
              className="h-auto max-w-full rounded-2xl"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map(attachment => (
              <div key={attachment.url} className="overflow-hidden rounded-xl">
                {attachment.type === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="h-auto max-w-full rounded-xl"
                  />
                )}
                {attachment.type === 'file' && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-black/10 p-2 dark:bg-white/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="truncate text-sm">{attachment.name}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp and read receipts */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[11px]',
            isCurrentUser ? 'justify-end text-white/70' : 'justify-start text-zinc-500'
          )}
        >
          <span>{formatMessageTime(message.created_at)}</span>

          {/* Read receipts (WhatsApp-style checkmarks) */}
          {isCurrentUser && (
            <div className="flex items-center">
              {message.read_by_count > 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-electric-accent"
                >
                  <polyline points="20 6 9 17 4 12" />
                  <polyline points="20 6 9 17 4 12" transform="translate(4, 0)" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Edited indicator */}
        {message.edited_at && <div className="mt-0.5 text-[10px] opacity-50">edited</div>}
      </motion.div>
    </div>
  );
}
