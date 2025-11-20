/**
 * Vibe Indicator Component
 * 
 * Animated visual indicator showing current vibe with color waves, aura pulses, and particles
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { VibeScores, PrimaryVibe } from '@/lib/vibe/types';

interface VibeIndicatorProps {
  scores: VibeScores;
  primaryVibe: PrimaryVibe;
  intensity?: number; // 0-100, defaults to calculated
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const vibeColors: Record<PrimaryVibe, { primary: string; secondary: string; glow: string }> = {
  excited: { primary: '#FF6B6B', secondary: '#FFE66D', glow: '#FF6B6B' },
  humorous: { primary: '#4ECDC4', secondary: '#FFE66D', glow: '#4ECDC4' },
  flirty: { primary: '#FF6B9D', secondary: '#FFB6C1', glow: '#FF6B9D' },
  calm: { primary: '#95E1D3', secondary: '#AAE3E0', glow: '#95E1D3' },
  stressed: { primary: '#FF8C94', secondary: '#FFB3BA', glow: '#FF8C94' },
  authentic: { primary: '#6C5CE7', secondary: '#A29BFE', glow: '#6C5CE7' },
  chaotic: { primary: '#FF7675', secondary: '#FFA8A7', glow: '#FF7675' },
  warm: { primary: '#FFB347', secondary: '#FFD700', glow: '#FFB347' },
  confident: { primary: '#00D2FF', secondary: '#3A7BD5', glow: '#00D2FF' },
  vulnerable: { primary: '#C7CEEA', secondary: '#E2E8F0', glow: '#C7CEEA' },
  neutral: { primary: '#95A5A6', secondary: '#BDC3C7', glow: '#95A5A6' },
  mixed: { primary: '#A8E6CF', secondary: '#D4F1F4', glow: '#A8E6CF' },
};

export function VibeIndicator({
  scores,
  primaryVibe,
  intensity,
  size = 'md',
  animated = true,
  className,
}: VibeIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
  }>>([]);

  const calculatedIntensity = intensity ?? Math.min(100, (scores.excitement + scores.chaos) / 2);
  const colors = vibeColors[primaryVibe] || vibeColors.neutral;
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  useEffect(() => {
    if (!animated || !canvasRef.current) {return;}

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.min(rect.width, rect.height) / 2;

    let animationFrame: number;
    let pulsePhase = 0;

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Pulse effect
      pulsePhase += 0.05;
      const pulseRadius = maxRadius * 0.6 + Math.sin(pulsePhase) * (maxRadius * 0.2 * (calculatedIntensity / 100));

      // Outer glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius * 1.5);
      gradient.addColorStop(0, colors.glow + '40');
      gradient.addColorStop(0.5, colors.secondary + '20');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Main circle
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      if (calculatedIntensity > 60) {
        particles.forEach((particle, i) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.02;

          if (particle.life > 0) {
            ctx.fillStyle = colors.secondary + Math.floor(particle.life * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Reset particle
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            particle.x = centerX;
            particle.y = centerY;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1;
          }
        });
      }

      animationFrame = requestAnimationFrame(animate);
    };

    // Initialize particles
    const initialParticles = Array.from({ length: Math.floor(calculatedIntensity / 10) }, () => ({
      x: centerX,
      y: centerY,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: Math.random(),
    }));
    setParticles(initialParticles);

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [animated, calculatedIntensity, colors, primaryVibe]);

  return (
    <div className={cn('relative inline-block', className)}>
      <canvas
        ref={canvasRef}
        className={cn('rounded-full', sizeClasses[size])}
        style={{
          background: `radial-gradient(circle, ${colors.primary}20, transparent)`,
        }}
      />
      {!animated && (
        <div
          className={cn('absolute inset-0 rounded-full', sizeClasses[size])}
          style={{
            backgroundColor: colors.primary,
            boxShadow: `0 0 ${calculatedIntensity / 2}px ${colors.glow}`,
          }}
        />
      )}
    </div>
  );
}

