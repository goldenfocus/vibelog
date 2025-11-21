'use client';

import { Play, User } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { useDominantColor } from '@/hooks/useDominantColor';
import { cn } from '@/lib/utils';

import { CardGlowEffect } from './CardGlowEffect';
import { GlassTextContainer } from './GlassTextContainer';

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
 * Futuristic floating card for member profiles
 * Features glassmorphism, glow effects, and smooth animations
 */
export function MemberFloatingCard({ member, index, isActive = false }: MemberFloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Extract dominant color from avatar
  const dominantColor = useDominantColor(member.avatar_url);

  // Intersection observer for reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, index * 80);
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
  const hasAudio = member.latest_vibelog?.audio_url;

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative h-[200px] w-[160px] flex-shrink-0 snap-start',
        'transform-gpu',
        isVisible ? 'animate-reveal-card' : 'opacity-0'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow effect layer */}
      <CardGlowEffect color={dominantColor} isActive={isActive} isHovered={isHovered} />

      {/* Main card container */}
      <Link
        href={profileUrl}
        className={cn(
          'group relative flex h-full cursor-pointer flex-col overflow-hidden',
          'rounded-3xl border',
          'shadow-2xl transition-all duration-300',
          'transform-gpu',
          isHovered || isActive
            ? 'scale-[1.02] border-white/20 shadow-electric/20'
            : 'border-white/10 shadow-black/50'
        )}
      >
        {/* Background - blurred avatar or gradient */}
        <div className="absolute inset-0 overflow-hidden">
          {member.avatar_url ? (
            <>
              <img
                src={member.avatar_url}
                alt=""
                className="h-full w-full scale-110 object-cover blur-xl"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-black/60" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-electric/20 via-purple-900/30 to-black" />
          )}
        </div>

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

        {/* Avatar centered */}
        <div className="relative z-10 flex flex-1 items-center justify-center pt-3">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name}
              className={cn(
                'h-14 w-14 rounded-full border object-cover',
                'shadow-lg transition-all duration-300',
                isHovered || isActive
                  ? 'scale-110 border-electric/50 shadow-electric/30'
                  : 'border-white/20 shadow-black/50'
              )}
            />
          ) : (
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full border',
                'bg-gradient-to-br from-electric/20 to-purple-500/20',
                'shadow-lg transition-all duration-300',
                isHovered || isActive
                  ? 'scale-110 border-electric/50 shadow-electric/30'
                  : 'border-white/20 shadow-black/50'
              )}
            >
              <User className="h-6 w-6 text-white/70" />
            </div>
          )}
        </div>

        {/* Glassmorphic content container */}
        <GlassTextContainer dominantColor={dominantColor}>
          {/* Name */}
          <h3 className="truncate text-center text-sm font-semibold leading-tight text-white transition-colors group-hover:text-electric-glow">
            {member.display_name}
          </h3>
          {/* Vibe count */}
          <p className="text-center text-[10px] text-white/50">
            {member.total_vibelogs ?? 0} vibe{member.total_vibelogs !== 1 ? 's' : ''}
          </p>
        </GlassTextContainer>

        {/* Audio indicator */}
        {hasAudio && (
          <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1 backdrop-blur-sm">
            <Play className="h-2.5 w-2.5 fill-white text-white" />
          </div>
        )}
      </Link>
    </div>
  );
}
