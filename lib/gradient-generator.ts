/**
 * Deterministic Gradient Generator
 *
 * Generates unique, beautiful gradients based on vibelog ID.
 * Each vibelog gets a consistent but unique color palette.
 *
 * This provides instant visual variety as a fallback while AI covers generate.
 */

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate HSL color from hash with good saturation and lightness
 */
function generateColor(hash: number, offset: number = 0): string {
  const hue = ((hash + offset) * 137.508) % 360; // Golden angle for good distribution
  const saturation = 60 + ((hash + offset) % 20); // 60-80% saturation
  const lightness = 45 + ((hash + offset) % 15); // 45-60% lightness
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Gradient patterns with Tailwind-compatible direction classes
 */
const GRADIENT_PATTERNS = [
  'bg-gradient-to-br', // bottom-right (most common)
  'bg-gradient-to-tr', // top-right
  'bg-gradient-to-bl', // bottom-left
  'bg-gradient-to-tl', // top-left
  'bg-gradient-to-r', // right
  'bg-gradient-to-b', // bottom
] as const;

export interface GradientConfig {
  /** Tailwind gradient direction class */
  direction: string;
  /** CSS custom properties for colors */
  colors: {
    from: string;
    via?: string;
    to: string;
  };
  /** Inline style object for direct use */
  style: React.CSSProperties;
  /** Full Tailwind classes (if using Tailwind's default colors) */
  tailwindClass?: string;
}

/**
 * Generate a deterministic gradient based on vibelog ID
 *
 * @param vibelogId - The vibelog UUID
 * @returns Gradient configuration with Tailwind classes and inline styles
 *
 * @example
 * ```tsx
 * const gradient = generateVibelogGradient(vibelog.id);
 * <div className={gradient.direction} style={gradient.style} />
 * ```
 */
export function generateVibelogGradient(vibelogId: string): GradientConfig {
  const hash = hashString(vibelogId);

  // Select gradient pattern based on hash
  const patternIndex = hash % GRADIENT_PATTERNS.length;
  const direction = GRADIENT_PATTERNS[patternIndex];

  // Generate 2-3 colors for the gradient
  const useVia = hash % 3 === 0; // 33% chance of 3-color gradient

  const fromColor = generateColor(hash, 0);
  const viaColor = useVia ? generateColor(hash, 100) : undefined;
  const toColor = generateColor(hash, 200);

  return {
    direction,
    colors: {
      from: fromColor,
      via: viaColor,
      to: toColor,
    },
    style: {
      backgroundImage: useVia
        ? `linear-gradient(to ${direction.replace('bg-gradient-to-', '')}, ${fromColor}, ${viaColor}, ${toColor})`
        : `linear-gradient(to ${direction.replace('bg-gradient-to-', '')}, ${fromColor}, ${toColor})`,
    },
  };
}

/**
 * Get inline gradient style for use in style prop
 *
 * @param vibelogId - The vibelog UUID
 * @returns CSS background-image value
 *
 * @example
 * ```tsx
 * <div style={{ backgroundImage: getGradientStyle(vibelog.id) }} />
 * ```
 */
export function getGradientStyle(vibelogId: string): string {
  const hash = hashString(vibelogId);
  const useVia = hash % 3 === 0;

  const fromColor = generateColor(hash, 0);
  const viaColor = useVia ? generateColor(hash, 100) : undefined;
  const toColor = generateColor(hash, 200);

  // Map Tailwind direction to CSS gradient direction
  const patternIndex = hash % GRADIENT_PATTERNS.length;
  const directionMap: Record<string, string> = {
    'bg-gradient-to-br': 'to bottom right',
    'bg-gradient-to-tr': 'to top right',
    'bg-gradient-to-bl': 'to bottom left',
    'bg-gradient-to-tl': 'to top left',
    'bg-gradient-to-r': 'to right',
    'bg-gradient-to-b': 'to bottom',
  };
  const direction = directionMap[GRADIENT_PATTERNS[patternIndex]];

  return useVia
    ? `linear-gradient(${direction}, ${fromColor}, ${viaColor}, ${toColor})`
    : `linear-gradient(${direction}, ${fromColor}, ${toColor})`;
}
