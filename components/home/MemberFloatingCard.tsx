'use client';

import { User } from 'lucide-react';
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
 * Legendary avatar-centric member card
 * The avatar IS the card - no borders, no boxes, just pure visual impact
 */
export function MemberFloatingCard({
  member,
  index,
  isActive: _isActive = false,
}: MemberFloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection observer for reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, index * 50);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  const handleMouseEnter = () => {
    if (window.innerWidth >= 768) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const profileUrl = `/@${member.username}`;

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative flex-shrink-0 snap-start',
        'transform-gpu',
        isVisible ? 'animate-reveal-card' : 'opacity-0'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={profileUrl} className="group flex flex-col items-center gap-2">
        {/* Avatar - THE card. Large, circular, with glow */}
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
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-electric/30 to-purple-600/30">
              <User className="h-8 w-8 text-white/60 md:h-10 md:w-10" />
            </div>
          )}
        </div>

        {/* Name - minimal, clean */}
        <div className="flex flex-col items-center">
          <p
            className={cn(
              'max-w-[100px] truncate text-xs font-medium',
              'transition-colors duration-300',
              isHovered ? 'text-electric' : 'text-white/80'
            )}
          >
            {member.display_name}
          </p>
          <p className="text-[10px] text-white/40">
            {member.total_vibelogs ?? 0} vibe{member.total_vibelogs !== 1 ? 's' : ''}
          </p>
        </div>
      </Link>
    </div>
  );
}
