'use client';

import {
  Settings,
  X,
  Heart,
  Briefcase,
  Coffee,
  Laugh,
  Sparkles,
  BarChart3,
  BookOpen,
  Theater,
  Feather,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useToneSettings, type WritingTone } from '@/hooks/useToneSettings';

const TONE_OPTIONS: Array<{
  value: WritingTone;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 'authentic',
    label: 'Authentic',
    description: 'Minimal editing, natural voice',
    icon: Heart,
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal and structured',
    icon: Briefcase,
  },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational', icon: Coffee },
  { value: 'humorous', label: 'Humorous', description: 'Funny and lighthearted', icon: Laugh },
  {
    value: 'inspiring',
    label: 'Inspiring',
    description: 'Uplifting and motivational',
    icon: Sparkles,
  },
  {
    value: 'analytical',
    label: 'Analytical',
    description: 'Data-driven and logical',
    icon: BarChart3,
  },
  {
    value: 'storytelling',
    label: 'Storytelling',
    description: 'Narrative with scenes',
    icon: BookOpen,
  },
  { value: 'dramatic', label: 'Dramatic', description: 'Heightened emotions', icon: Theater },
  {
    value: 'poetic',
    label: 'Poetic',
    description: 'Contemplative literary prose, serious and reflective',
    icon: Feather,
  },
];

interface ToneSettingsProps {
  disabled?: boolean;
}

/**
 * Tone settings panel with gear icon trigger
 * Provides tone selection, filler words toggle, and voice cloning toggle
 * Opens as floating overlay on desktop, full screen modal on mobile
 */
export default function ToneSettings({ disabled = false }: ToneSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { tone, setTone, loading } = useToneSettings();

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Add small delay to prevent immediate close on open
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleToneChange = async (newTone: WritingTone) => {
    await setTone(newTone);
  };

  return (
    <div className="relative">
      {/* Gear Icon Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Tone settings"
        title="Content settings"
      >
        <Settings className="h-5 w-5 transition-transform group-hover:rotate-45" />
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 bg-background/90 backdrop-blur-xl sm:hidden" />

          {/* Panel */}
          <div
            ref={panelRef}
            className={[
              // Mobile: Full screen modal
              'fixed inset-4 z-50 rounded-lg bg-card shadow-2xl sm:absolute sm:inset-auto',
              // Desktop: Floating panel positioned above/left of button
              'sm:bottom-full sm:right-0 sm:mb-2 sm:w-80',
              // Animation
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2',
              // Border
              'border border-border',
            ].join(' ')}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-lg font-semibold">Content Settings</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-secondary"
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-4">
              {/* Tone Selector */}
              <div>
                <label className="mb-3 block text-sm font-medium">Writing Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {TONE_OPTIONS.map(option => {
                    const Icon = option.icon;
                    const isSelected = tone === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleToneChange(option.value)}
                        disabled={loading}
                        className={[
                          'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-foreground',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                        ].join(' ')}
                        title={option.description}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  How AI will polish your vibelog
                </p>
              </div>
            </div>

            {/* Footer note */}
            <div className="border-t border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              These settings apply to this vibelog. Change defaults in settings.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
