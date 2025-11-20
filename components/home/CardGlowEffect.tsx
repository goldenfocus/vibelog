'use client';

interface CardGlowEffectProps {
  color?: string;
  isActive?: boolean;
  isHovered?: boolean;
}

/**
 * Animated glow effect that surrounds cards
 * Responds to hover and active states with color and intensity changes
 */
export function CardGlowEffect({
  color = 'rgb(96, 165, 250)',
  isActive = false,
  isHovered = false,
}: CardGlowEffectProps) {
  // Parse RGB color and create rgba with opacity
  const parseRGB = (rgb: string) => {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) {return 'rgba(96, 165, 250, 0.3)';}
    return `rgba(${match[0]}, ${match[1]}, ${match[2]}, 0.3)`;
  };

  const glowColor = parseRGB(color);

  return (
    <div
      className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] opacity-0 blur-2xl transition-all duration-500"
      style={{
        background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)`,
        opacity: isHovered ? 0.8 : isActive ? 0.6 : 0.3,
        transform: isHovered ? 'scale(1.15)' : isActive ? 'scale(1.08)' : 'scale(1)',
        filter: isHovered ? 'blur(40px)' : isActive ? 'blur(30px)' : 'blur(20px)',
      }}
    >
      {/* Additional animated glow layer for active state */}
      {isActive && (
        <div
          className="absolute inset-0 animate-glow-pulse rounded-[2.5rem]"
          style={{
            background: `radial-gradient(circle at center, ${glowColor}, transparent 60%)`,
          }}
        />
      )}
    </div>
  );
}
