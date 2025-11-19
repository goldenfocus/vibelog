'use client';

import { Sparkles, TrendingUp, Zap, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MiniCard {
  id: string;
  icon: 'sparkles' | 'trending' | 'zap' | 'heart';
  title: string;
  value: string;
  color: string;
}

const MINI_CARDS: MiniCard[] = [
  {
    id: '1',
    icon: 'sparkles',
    title: 'Live Creators',
    value: '1.2K+',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: '2',
    icon: 'trending',
    title: 'Vibes Shared',
    value: '15K+',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: '3',
    icon: 'zap',
    title: 'Minutes Saved',
    value: '50K+',
    color: 'from-orange-500 to-yellow-500',
  },
  {
    id: '4',
    icon: 'heart',
    title: 'Happy Users',
    value: '3K+',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: '5',
    icon: 'sparkles',
    title: 'AI Magic',
    value: '∞',
    color: 'from-violet-500 to-purple-500',
  },
];

const ICON_MAP = {
  sparkles: Sparkles,
  trending: TrendingUp,
  zap: Zap,
  heart: Heart,
};

export default function FloatingMiniCardsRow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Auto-scroll effect (disabled if reduced motion)
  useEffect(() => {
    if (prefersReducedMotion || isPaused) {
      return;
    }

    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }

    let animationFrameId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame

    const animate = () => {
      scrollPosition += scrollSpeed;

      // Reset scroll when we've scrolled past one set of cards
      if (scrollPosition >= scrollElement.scrollWidth / 2) {
        scrollPosition = 0;
      }

      scrollElement.scrollLeft = scrollPosition;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPaused, prefersReducedMotion]);

  // Duplicate cards for infinite scroll effect
  const duplicatedCards = [...MINI_CARDS, ...MINI_CARDS];

  return (
    <div className="relative -mx-4 mb-16 overflow-hidden sm:-mx-6 lg:-mx-8">
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8"
        style={{
          scrollBehavior: prefersReducedMotion ? 'auto' : 'smooth',
          cursor: 'grab',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {duplicatedCards.map((card, index) => {
          const Icon = ICON_MAP[card.icon];
          return (
            <div
              key={`${card.id}-${index}`}
              className="group relative flex min-w-[200px] flex-shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-electric/40 hover:shadow-lg hover:shadow-electric/10"
              style={{
                transform: prefersReducedMotion
                  ? 'none'
                  : `translateY(${Math.sin(index * 0.5) * 8}px)`,
                animation: prefersReducedMotion
                  ? 'none'
                  : `float ${3 + (index % 3)}s ease-in-out infinite`,
                animationDelay: `${index * 0.2}s`,
                willChange: prefersReducedMotion ? 'auto' : 'transform',
              }}
            >
              {/* Glow effect on hover */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.color} opacity-0 transition-opacity duration-300 group-hover:opacity-20`}
              />

              {/* Icon */}
              <div
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}
              >
                <Icon className="h-6 w-6 text-white" strokeWidth={2} />
              </div>

              {/* Value */}
              <div className="relative text-2xl font-bold text-foreground transition-colors group-hover:text-electric">
                {card.value}
              </div>

              {/* Title */}
              <div className="relative text-center text-xs font-medium text-muted-foreground">
                {card.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add custom float keyframes */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
