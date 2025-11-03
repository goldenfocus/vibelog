'use client';

import { Settings, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useToneSettings, type WritingTone } from '@/hooks/useToneSettings';

const TONE_OPTIONS: Array<{ value: WritingTone; label: string; description: string }> = [
  { value: 'authentic', label: 'Authentic', description: 'Minimal editing, natural voice' },
  { value: 'professional', label: 'Professional', description: 'Formal and structured' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'humorous', label: 'Humorous', description: 'Funny and lighthearted' },
  { value: 'inspiring', label: 'Inspiring', description: 'Uplifting and motivational' },
  { value: 'analytical', label: 'Analytical', description: 'Data-driven and logical' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative with scenes' },
  { value: 'dramatic', label: 'Dramatic', description: 'Heightened emotions' },
  { value: 'poetic', label: 'Poetic', description: 'Literary and metaphorical' },
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

  const {
    tone,
    keepFillerWords,
    voiceCloningEnabled,
    setTone,
    setKeepFillerWords,
    setVoiceCloningEnabled,
    loading,
  } = useToneSettings();

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

  const handleKeepFillerWordsChange = async (checked: boolean) => {
    await setKeepFillerWords(checked);
  };

  const handleVoiceCloningChange = async (checked: boolean) => {
    await setVoiceCloningEnabled(checked);
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
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm sm:hidden" />

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
                <label htmlFor="tone-select" className="mb-2 block text-sm font-medium">
                  Writing Tone
                </label>
                <select
                  id="tone-select"
                  value={tone}
                  onChange={e => handleToneChange(e.target.value as WritingTone)}
                  disabled={loading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {TONE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  How AI will polish your vibelog
                </p>
              </div>

              {/* Voice Cloning Toggle */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="voice-cloning"
                  checked={voiceCloningEnabled}
                  onChange={e => handleVoiceCloningChange(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex-1">
                  <label
                    htmlFor="voice-cloning"
                    className="block cursor-pointer text-sm font-medium"
                  >
                    Clone my voice
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Generate audio using your cloned voice
                  </p>
                </div>
              </div>

              {/* Keep Filler Words Toggle */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="keep-filler-words"
                  checked={keepFillerWords}
                  onChange={e => handleKeepFillerWordsChange(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex-1">
                  <label
                    htmlFor="keep-filler-words"
                    className="block cursor-pointer text-sm font-medium"
                  >
                    Keep filler words
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Preserve &quot;ums&quot; and &quot;ahs&quot; for authentic feel
                  </p>
                </div>
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
