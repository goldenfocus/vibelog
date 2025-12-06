/**
 * Theme Styles for Auto-Generated Channels
 *
 * Maps the 20 predefined topics to visual styling:
 * - Gradient colors for planet cards
 * - Lucide icons for topic identification
 * - Glow colors for hover effects
 */

import {
  Cpu,
  Briefcase,
  TrendingUp,
  Heart,
  Activity,
  Palette,
  GraduationCap,
  Tv,
  Plane,
  UtensilsCrossed,
  Users,
  Target,
  DollarSign,
  Baby,
  Trophy,
  Microscope,
  Vote,
  Globe,
  Sparkles,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react';

export interface ThemeStyle {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind gradient class (from-X to-Y) */
  gradient: string;
  /** Glow color for hover effects (hex or CSS color) */
  glowColor: string;
  /** Background color for subtle use (hex) */
  bgColor: string;
  /** Text color that contrasts with gradient */
  textColor: string;
  /** Emoji fallback for contexts without icons */
  emoji: string;
}

export const THEME_STYLES: Record<string, ThemeStyle> = {
  technology: {
    icon: Cpu,
    gradient: 'from-cyan-500 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    bgColor: '#0891b2',
    textColor: 'white',
    emoji: '💻',
  },
  business: {
    icon: Briefcase,
    gradient: 'from-slate-600 to-slate-800',
    glowColor: 'rgba(71, 85, 105, 0.4)',
    bgColor: '#475569',
    textColor: 'white',
    emoji: '💼',
  },
  'personal-growth': {
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    bgColor: '#10b981',
    textColor: 'white',
    emoji: '🌱',
  },
  lifestyle: {
    icon: Heart,
    gradient: 'from-pink-500 to-rose-500',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    bgColor: '#ec4899',
    textColor: 'white',
    emoji: '✨',
  },
  'health-wellness': {
    icon: Activity,
    gradient: 'from-green-500 to-emerald-600',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    bgColor: '#22c55e',
    textColor: 'white',
    emoji: '💪',
  },
  creativity: {
    icon: Palette,
    gradient: 'from-violet-500 to-purple-600',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    bgColor: '#8b5cf6',
    textColor: 'white',
    emoji: '🎨',
  },
  education: {
    icon: GraduationCap,
    gradient: 'from-blue-500 to-indigo-600',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    bgColor: '#3b82f6',
    textColor: 'white',
    emoji: '📚',
  },
  entertainment: {
    icon: Tv,
    gradient: 'from-fuchsia-500 to-pink-600',
    glowColor: 'rgba(217, 70, 239, 0.4)',
    bgColor: '#d946ef',
    textColor: 'white',
    emoji: '🎬',
  },
  travel: {
    icon: Plane,
    gradient: 'from-sky-500 to-blue-500',
    glowColor: 'rgba(14, 165, 233, 0.4)',
    bgColor: '#0ea5e9',
    textColor: 'white',
    emoji: '✈️',
  },
  'food-cooking': {
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-amber-500',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    bgColor: '#f97316',
    textColor: 'white',
    emoji: '🍳',
  },
  relationships: {
    icon: Users,
    gradient: 'from-rose-500 to-red-500',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    bgColor: '#f43f5e',
    textColor: 'white',
    emoji: '💕',
  },
  career: {
    icon: Target,
    gradient: 'from-amber-500 to-yellow-500',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    bgColor: '#f59e0b',
    textColor: 'white',
    emoji: '🎯',
  },
  finance: {
    icon: DollarSign,
    gradient: 'from-green-600 to-emerald-700',
    glowColor: 'rgba(22, 163, 74, 0.4)',
    bgColor: '#16a34a',
    textColor: 'white',
    emoji: '💰',
  },
  parenting: {
    icon: Baby,
    gradient: 'from-pink-400 to-rose-400',
    glowColor: 'rgba(251, 113, 133, 0.4)',
    bgColor: '#fb7185',
    textColor: 'white',
    emoji: '👶',
  },
  sports: {
    icon: Trophy,
    gradient: 'from-yellow-500 to-orange-500',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    bgColor: '#eab308',
    textColor: 'white',
    emoji: '🏆',
  },
  science: {
    icon: Microscope,
    gradient: 'from-indigo-500 to-violet-600',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    bgColor: '#6366f1',
    textColor: 'white',
    emoji: '🔬',
  },
  politics: {
    icon: Vote,
    gradient: 'from-red-600 to-blue-600',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    bgColor: '#dc2626',
    textColor: 'white',
    emoji: '🗳️',
  },
  culture: {
    icon: Globe,
    gradient: 'from-teal-500 to-cyan-600',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    bgColor: '#14b8a6',
    textColor: 'white',
    emoji: '🌍',
  },
  spirituality: {
    icon: Sparkles,
    gradient: 'from-purple-500 to-indigo-600',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    bgColor: '#a855f7',
    textColor: 'white',
    emoji: '🙏',
  },
  other: {
    icon: MoreHorizontal,
    gradient: 'from-gray-500 to-gray-600',
    glowColor: 'rgba(107, 114, 128, 0.4)',
    bgColor: '#6b7280',
    textColor: 'white',
    emoji: '📝',
  },
};

/**
 * Get theme style for a topic, with fallback to 'other'
 */
export function getThemeStyle(topic: string | null | undefined): ThemeStyle {
  if (!topic) {
    return THEME_STYLES.other;
  }
  return THEME_STYLES[topic] || THEME_STYLES.other;
}

/**
 * Get the icon component for a topic
 */
export function getTopicIcon(topic: string | null | undefined): LucideIcon {
  return getThemeStyle(topic).icon;
}

/**
 * Get the gradient classes for a topic
 */
export function getTopicGradient(topic: string | null | undefined): string {
  return getThemeStyle(topic).gradient;
}

/**
 * Get the glow color for a topic (for box-shadow)
 */
export function getTopicGlow(topic: string | null | undefined): string {
  return getThemeStyle(topic).glowColor;
}

/**
 * Get the emoji for a topic (fallback for non-icon contexts)
 */
export function getTopicEmoji(topic: string | null | undefined): string {
  return getThemeStyle(topic).emoji;
}
