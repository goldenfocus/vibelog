'use client';

import { User, Mic } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';

interface MemberFloatingCardProps {
  member: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    header_image?: string | null;
    bio?: string | null;
    total_vibelogs?: number | null;
    latest_vibelog?: {
      audio_url?: string | null;
    } | null;
  };
  index: number;
  isActive?: boolean;
}

/**
 * Redesigned Member Card - "Pro" Design
 * Features banner image, overlaid avatar, and clean typography.
 * Matches the aesthetic of VibelogCard.
 */
export function MemberFloatingCard({
  member,
  index,
  isActive: _isActive = false,
}: MemberFloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Reveal animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const profileUrl = `/@${member.username}`;

  // Safe fallbacks
  const displayName = member.display_name || member.username || 'Vibelogger';
  const username = member.username;
  const bio = member.bio || `Check out ${displayName}'s vibes`;
  const vibeCount = member.total_vibelogs ?? 0;
  const hasHeader = !!member.header_image;

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative flex-shrink-0 snap-start',
        'transform-gpu transition-all duration-500',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={profileUrl} className="group block h-full w-72">
        <div
          className={cn(
            'relative h-full overflow-hidden rounded-3xl',
            'border border-white/5 bg-black/40 backdrop-blur-md',
            'transition-all duration-300 ease-out',
            isHovered
              ? 'translate-y-[-4px] border-electric/30 shadow-lg shadow-electric/10'
              : 'shadow-md shadow-black/20'
          )}
        >
          {/* Banner Image Section */}
          <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-electric/20 to-purple-900/20">
            {hasHeader ? (
              <img
                src={member.header_image!}
                alt={`${displayName}'s banner`}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-700',
                  isHovered ? 'scale-110' : 'scale-100'
                )}
              />
            ) : (
              // Fallback pattern/gradient if no header
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>

          {/* Avatar - Overlapping Banner */}
          <div className="relative px-5">
            <div className="absolute -top-10 left-5">
              <div
                className={cn(
                  'h-20 w-20 overflow-hidden rounded-full border-4 border-[#121212] bg-black shadow-xl', // Matches card bg color approx
                  'transition-transform duration-300',
                  isHovered ? 'scale-105 ring-2 ring-electric' : ''
                )}
              >
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-electric/20 text-electric">
                    <User className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>

            {/* Top right action/indicator */}
            <div className="flex justify-end pt-3">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full bg-white/5 p-2 transition-colors',
                  isHovered ? 'bg-electric/20 text-electric' : 'text-white/40'
                )}
              >
                {member.latest_vibelog ? <Mic size={16} /> : <User size={16} />}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="mt-8 flex flex-col gap-3 px-5 pb-6">
            {/* Identity */}
            <div>
              <h3
                className={cn(
                  'truncate text-lg font-bold leading-tight text-white transition-colors',
                  isHovered ? 'text-electric' : ''
                )}
              >
                {displayName}
              </h3>
              <p className="truncate text-sm font-medium text-white/50">@{username}</p>
            </div>

            {/* Bio/Status */}
            <p className="line-clamp-2 text-sm text-white/70">{bio}</p>

            {/* Stats / Footer */}
            <div className="mt-auto flex items-center gap-4 pt-2 text-xs font-medium text-white/40">
              <div className="flex items-center gap-1.5">
                <span className={cn('text-white/90', isHovered && 'text-electric')}>
                  {vibeCount}
                </span>
                <span>vibes</span>
              </div>
              {member.latest_vibelog && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  <span className="text-green-400/80">Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
