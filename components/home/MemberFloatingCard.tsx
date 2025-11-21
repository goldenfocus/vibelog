'use client';

import { Play, User } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

import { useDominantColor } from '@/hooks/useDominantColor';
import { cn } from '@/lib/utils';

import { CardGlowEffect } from './CardGlowEffect';
import { GlassTextContainer } from './GlassTextContainer';

interface MemberVibelog {
  id: string;
  title: string;
  teaser?: string | null;
  slug?: string | null;
  public_slug?: string | null;
  audio_url?: string | null;
}

interface MemberFloatingCardProps {
  member: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio?: string | null;
    total_vibelogs?: number | null;
    latest_vibelog?: MemberVibelog | null;
  };
  index: number;
  isActive?: boolean;
}

function getVibelogHref(username: string, vibelog: MemberVibelog) {
  if (username === 'anonymous' && vibelog.public_slug) {
    return `/@anonymous/${vibelog.public_slug}`;
  }
  if (vibelog.slug) {
    return `/@${username}/${vibelog.slug}`;
  }
  if (vibelog.public_slug) {
    return `/@${username}/${vibelog.public_slug}`;
  }
  return `/vibelogs/${vibelog.id}`;
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
        'relative h-[380px] w-[280px] flex-shrink-0 snap-start',
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
        {/* Avatar background with blur */}
        <div className="absolute inset-0 overflow-hidden">
          {member.avatar_url ? (
            <>
              <img
                src={member.avatar_url}
                alt=""
                className="h-full w-full scale-110 object-cover blur-2xl"
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
        <div className="relative z-10 flex flex-1 items-center justify-center pt-6">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name}
              className={cn(
                'h-24 w-24 rounded-full border-2 object-cover',
                'shadow-xl transition-all duration-300',
                isHovered || isActive
                  ? 'scale-110 border-electric/50 shadow-electric/30'
                  : 'border-white/20 shadow-black/50'
              )}
            />
          ) : (
            <div
              className={cn(
                'flex h-24 w-24 items-center justify-center rounded-full border-2',
                'bg-gradient-to-br from-electric/20 to-purple-500/20',
                'shadow-xl transition-all duration-300',
                isHovered || isActive
                  ? 'scale-110 border-electric/50 shadow-electric/30'
                  : 'border-white/20 shadow-black/50'
              )}
            >
              <User className="h-10 w-10 text-white/70" />
            </div>
          )}
        </div>

        {/* Glassmorphic content container */}
        <GlassTextContainer dominantColor={dominantColor}>
          {/* Name and username */}
          <h3 className="text-center text-lg font-semibold leading-tight text-white transition-colors group-hover:text-electric-glow">
            {member.display_name}
          </h3>
          <p className="text-center text-sm text-white/60">@{member.username}</p>

          {/* Vibe count */}
          {member.total_vibelogs !== null && member.total_vibelogs !== undefined && (
            <p className="mt-1 text-center text-xs text-white/50">
              {member.total_vibelogs} vibe{member.total_vibelogs !== 1 ? 's' : ''}
            </p>
          )}

          {/* Bio or latest vibelog */}
          {member.latest_vibelog ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
              <p className="line-clamp-1 text-xs text-white/70">
                Latest: {member.latest_vibelog.title}
              </p>
            </div>
          ) : member.bio ? (
            <p className="mt-2 line-clamp-2 text-center text-xs text-white/60">{member.bio}</p>
          ) : (
            <p className="mt-2 text-center text-xs text-white/50">Just joined the vibe</p>
          )}
        </GlassTextContainer>

        {/* Play indicator for members with audio */}
        {hasAudio && member.latest_vibelog && (
          <div
            className={cn(
              'absolute right-3 top-3',
              'flex items-center gap-1.5 rounded-full',
              'border border-white/20 bg-black/50 px-2.5 py-1.5',
              'backdrop-blur-md backdrop-saturate-150',
              'transition-all duration-300',
              isHovered ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
            )}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = getVibelogHref(member.username, member.latest_vibelog!);
            }}
          >
            <Play className="h-3 w-3 fill-white text-white" />
            <span className="text-xs font-medium text-white/90">Listen</span>
          </div>
        )}
      </Link>
    </div>
  );
}
