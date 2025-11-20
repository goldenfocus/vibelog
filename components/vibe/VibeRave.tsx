/**
 * VibeRave Mode Component
 * 
 * Visual celebration when user's vibe is high
 */

'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { getHumorModule } from '@/lib/vibe/humor';
import type { VibeScores, PrimaryVibe } from '@/lib/vibe/types';

interface VibeRaveProps {
  scores: VibeScores;
  primaryVibe: PrimaryVibe;
  onClose?: () => void;
  className?: string;
}

export function VibeRave({ scores, primaryVibe, onClose, className }: VibeRaveProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }>>([]);

  const humorModule = getHumorModule();
  const cheerleaderMessage = humorModule.getCheerleaderMessage({
    scores,
    primaryVibe,
    confidence: 0.9,
    microVibes: {},
    hiddenVibes: {},
    detectedAt: new Date().toISOString(),
    modelVersion: '1.0.0',
    processingTime: 0,
    textLength: 0,
  });

  useEffect(() => {
    // Create particles
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF6B9D', '#95E1D3', '#6C5CE7'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
    }));
    setParticles(newParticles);

    // Animate particles
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        const newX = p.x + p.vx;
        const newY = p.y + p.vy;
        return {
          ...p,
          x: newX < 0 || newX > window.innerWidth ? (newX < 0 ? window.innerWidth : 0) : newX,
          y: newY < 0 || newY > window.innerHeight ? (newY < 0 ? window.innerHeight : 0) : newY,
        };
      }));
    }, 16);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
        className
      )}
      style={{
        animation: 'vibeRave 2s infinite',
      }}
    >
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        <div className="mb-8 text-6xl animate-bounce">🎉</div>
        <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg">
          VIBE RAVE MODE!
        </h2>
        {cheerleaderMessage && (
          <p className="mb-8 text-xl text-white drop-shadow-md">
            {cheerleaderMessage}
          </p>
        )}
        <div className="flex gap-4 text-4xl">
          {humorModule.getVibeEmojis({
            scores,
            primaryVibe,
            confidence: 0.9,
            microVibes: {},
            hiddenVibes: {},
            detectedAt: new Date().toISOString(),
            modelVersion: '1.0.0',
            processingTime: 0,
            textLength: 0,
          }).map((emoji, i) => (
            <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
              {emoji}
            </span>
          ))}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-8 rounded-full bg-white px-6 py-3 font-semibold text-purple-600 shadow-lg hover:bg-gray-100"
          >
            Continue Vibing ✨
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes vibeRave {
          0%, 100% {
            filter: hue-rotate(0deg);
          }
          50% {
            filter: hue-rotate(180deg);
          }
        }
      `}</style>
    </div>
  );
}

