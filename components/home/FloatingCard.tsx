'use client';

import { Clock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

import { useDominantColor } from '@/hooks/useDominantColor';
import { cn } from '@/lib/utils';
import { useAudioPlayerStore } from '@/state/audio-player-store';

import { CardGlowEffect } from './CardGlowEffect';
import { GlassTextContainer } from './GlassTextContainer';
import type { HomeFeedVibelog } from './HomeCommunityShowcase';
import { InteractionLayer } from './InteractionLayer';
import { MediaBackground } from './MediaBackground';

interface FloatingCardProps {
  vibelog: HomeFeedVibelog;
  index: number;
  isActive?: boolean;
  onCardClick?: (id: string) => void;
}

/**
 * Futuristic floating card with 3D tilt, glassmorphism, and smooth animations
 * Features hover effects, gesture support, and media playback
 */
export function FloatingCard({ vibelog, index, isActive = false, onCardClick }: FloatingCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Extract dominant color from cover image
  const dominantColor = useDominantColor(vibelog.cover_image_url);

  // Audio player integration
  const { setTrack, currentTrack, play } = useAudioPlayerStore();

  // Intersection observer for reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger animation based on index
          setTimeout(() => {
            setIsVisible(true);
          }, index * 100);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  // Simplified hover effect (desktop only, no 3D tilt)
  const handleMouseEnter = () => {
    if (window.innerWidth >= 768) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(vibelog.id);
      return;
    }

    // Navigate to vibelog page
    const slug = vibelog.slug || vibelog.public_slug;
    if (slug) {
      router.push(`/@${vibelog.author.username}/${slug}`);
    }
  };

  const handlePlayClick = () => {
    // No e.stopPropagation() needed - InteractionLayer handles it

    // If has audio, play it in the audio player
    if (vibelog.audio_url) {
      setTrack({
        id: vibelog.id,
        title: vibelog.title,
        url: vibelog.audio_url,
        author: vibelog.author.display_name,
        type: 'url' as const,
      });
      play();
    }
    // If has video but no audio, play video in card
    else if (vibelog.video_url) {
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  // Smart text truncation
  const truncateTitle = (text: string, maxLength = 48) => {
    if (text.length <= maxLength) {
      return text;
    }
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
  };

  const truncateTeaser = (text: string | null | undefined, maxLength = 120) => {
    if (!text) {
      return '';
    }
    if (text.length <= maxLength) {
      return text;
    }
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
  };

  const isPlaying = currentTrack?.id === vibelog.id;

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative h-[480px] w-80 flex-shrink-0 snap-start',
        'transform-gpu',
        isVisible ? 'animate-reveal-card' : 'opacity-0'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow effect layer */}
      <CardGlowEffect
        color={dominantColor}
        isActive={isActive || isPlaying}
        isHovered={isHovered}
      />

      {/* Main card container */}
      <div
        className={cn(
          'group relative h-full cursor-pointer overflow-hidden',
          'rounded-3xl border',
          'shadow-2xl transition-all duration-300',
          'transform-gpu',
          isHovered || isActive
            ? 'scale-[1.02] border-white/20 shadow-electric/20'
            : 'border-white/10 shadow-black/50'
        )}
        onClick={handleCardClick}
      >
        {/* Media background with parallax */}
        <MediaBackground
          coverImage={vibelog.cover_image_url}
          videoUrl={vibelog.video_url}
          vibelogId={vibelog.id}
          title={vibelog.title}
          isActive={isActive || isHovered}
          isPlaying={isVideoPlaying}
        />

        {/* Gradient overlays for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* Glassmorphic content container */}
        <GlassTextContainer dominantColor={dominantColor}>
          {/* Title */}
          <h3 className="text-lg font-semibold leading-tight text-white transition-colors group-hover:text-electric-glow">
            {truncateTitle(vibelog.title)}
          </h3>

          {/* Teaser */}
          {vibelog.teaser && (
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              {truncateTeaser(vibelog.teaser)}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-3 flex items-center gap-4 text-xs text-white/60">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{vibelog.author.display_name}</span>
            </div>

            {/* Read time */}
            {vibelog.read_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{vibelog.read_time} min read</span>
              </div>
            )}
          </div>
        </GlassTextContainer>

        {/* Interaction layer */}
        <InteractionLayer
          vibelogId={vibelog.id}
          hasAudio={!!vibelog.audio_url}
          hasVideo={!!vibelog.video_url}
          isHovered={isHovered}
          isPlaying={isVideoPlaying || isPlaying}
          onPlayClick={handlePlayClick}
        />

        {/* Active playing indicator */}
        {isPlaying && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-electric/30 bg-black/60 px-3 py-1.5 backdrop-blur-md">
            <div className="h-2 w-2 animate-pulse rounded-full bg-electric" />
            <span className="text-xs font-medium text-electric">Playing</span>
          </div>
        )}
      </div>
    </div>
  );
}
