'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import Link from 'next/link';

import { useSafeArea } from '@/hooks/useSafeArea';
import { Z_INDEX } from '@/lib/mobile/constants';
import { triggerHaptic } from '@/lib/mobile/haptics';
import { cn } from '@/lib/utils';

export interface ImmersiveHeaderProps {
  /**
   * Callback when back button is pressed
   */
  onBack: () => void;

  /**
   * Avatar URL for the header
   */
  avatar?: string | null;

  /**
   * Primary title (e.g., user name)
   */
  title: string;

  /**
   * Subtitle (e.g., "typing...", "online", etc.)
   */
  subtitle?: string;

  /**
   * Whether the subtitle indicates typing
   */
  isTyping?: boolean;

  /**
   * URL to navigate to when avatar/title is clicked (e.g., user profile)
   */
  profileUrl?: string;

  /**
   * Callback for options/menu button
   */
  onOptionsClick?: () => void;

  /**
   * Additional className
   */
  className?: string;
}

/**
 * Compact header for immersive views (conversation, vibelog reader, etc.)
 * 56px height, back arrow + avatar + title/subtitle + options
 */
export function ImmersiveHeader({
  onBack,
  avatar,
  title,
  subtitle,
  isTyping = false,
  profileUrl,
  onOptionsClick,
  className,
}: ImmersiveHeaderProps) {
  const { top } = useSafeArea();

  const handleBack = () => {
    triggerHaptic('LIGHT');
    onBack();
  };

  const handleOptions = () => {
    if (onOptionsClick) {
      triggerHaptic('LIGHT');
      onOptionsClick();
    }
  };

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0',
        'bg-background/95 backdrop-blur-xl',
        'border-b border-border/30',
        className
      )}
      style={{ paddingTop: top, zIndex: Z_INDEX.HEADER }}
    >
      <div className="flex h-14 items-center gap-2 px-2">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        {/* Avatar + Title area - clickable to view profile */}
        {profileUrl ? (
          <Link
            href={profileUrl}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 transition-colors hover:bg-muted/50 active:scale-[0.98]"
          >
            {/* Avatar */}
            {avatar ? (
              <img
                src={avatar}
                alt={title}
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-border/50"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-border/50">
                <span className="text-sm font-semibold text-primary">
                  {title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Title and subtitle */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <div className="flex items-center gap-1">
                  {isTyping && (
                    <div className="flex gap-0.5">
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                  )}
                  <span
                    className={cn(
                      'truncate text-xs',
                      isTyping ? 'font-medium italic text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {subtitle}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ) : (
          <>
            {/* Avatar */}
            {avatar ? (
              <img
                src={avatar}
                alt={title}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-border/50"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-border/50">
                <span className="text-sm font-semibold text-primary">
                  {title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Title and subtitle */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <div className="flex items-center gap-1">
                  {isTyping && (
                    <div className="flex gap-0.5">
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                  )}
                  <span
                    className={cn(
                      'truncate text-xs',
                      isTyping ? 'font-medium italic text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {subtitle}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Options button */}
        {onOptionsClick && (
          <button
            onClick={handleOptions}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-95"
            aria-label="Options"
          >
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>
    </header>
  );
}
