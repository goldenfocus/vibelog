'use client';

import { Play, User } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';

interface MemberFloatingCardProps {
  member: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
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
 * Legendary member card - avatar-centric design
 * The face IS the card. No borders. Pure visual impact.
 */
export function MemberFloatingCard({
  member,
  index,
  isActive: _isActive = false,
}: MemberFloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 50);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  const profileUrl = `/@${member.username}`;
  const hasAudio = member.latest_vibelog?.audio_url;

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative flex-shrink-0 snap-start',
        'transform-gpu transition-all duration-500',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={profileUrl} className="group relative block">
        {/* The Avatar IS the Card */}
        <div
          className={cn(
            'relative overflow-hidden rounded-full',
            'h-20 w-20 md:h-24 md:w-24',
            'transition-all duration-500 ease-out',
            'ring-2 ring-white/10',
            isHovered
              ? 'scale-110 shadow-[0_0_30px_rgba(99,144,255,0.5)] ring-electric/60'
              : 'shadow-xl shadow-black/50'
          )}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name}
              className={cn(
                'h-full w-full object-cover',
                'transition-transform duration-700 ease-out',
                isHovered ? 'scale-110' : 'scale-100'
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-electric/30 via-purple-500/20 to-black">
              <User className="h-8 w-8 text-white/60 md:h-10 md:w-10" />
            </div>
          )}

          {/* Subtle gradient overlay on hover */}
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
              'transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          />

          {/* Audio indicator - appears on hover */}
          {hasAudio && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'transition-all duration-300',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div className="rounded-full bg-black/60 p-2 backdrop-blur-sm">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Name - appears below, minimal and clean */}
        <div className="mt-2 text-center">
          <p
            className={cn(
              'truncate text-xs font-medium transition-colors duration-300',
              'max-w-20 md:max-w-24',
              isHovered ? 'text-electric' : 'text-white/80'
            )}
          >
            {member.display_name}
          </p>
          <p className="text-[10px] text-white/40">{member.total_vibelogs ?? 0} vibes</p>
        </div>
      </Link>
    </div>
  );
}
