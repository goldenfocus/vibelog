'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import type { WritingTone } from '@/hooks/useToneSettings';

const TONE_OPTIONS: Array<{ value: WritingTone; label: string; emoji: string }> = [
  { value: 'authentic', label: 'Authentic', emoji: '🎯' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'casual', label: 'Casual', emoji: '😊' },
  { value: 'humorous', label: 'Humorous', emoji: '😄' },
  { value: 'inspiring', label: 'Inspiring', emoji: '✨' },
  { value: 'analytical', label: 'Analytical', emoji: '📊' },
  { value: 'storytelling', label: 'Storytelling', emoji: '📖' },
  { value: 'dramatic', label: 'Dramatic', emoji: '🎭' },
  { value: 'poetic', label: 'Poetic', emoji: '🌸' },
];

interface RegenerateButtonProps {
  transcription: string;
  currentTone?: WritingTone;
  onRegenerate: (content: { teaser: string; full: string }, tone: WritingTone) => void;
  className?: string;
}

/**
 * Button to regenerate vibelog content with a different tone
 * Shows dropdown of all available tones
 * Highlights currently active tone
 */
export default function RegenerateButton({
  transcription,
  currentTone = 'authentic',
  onRegenerate,
  className = '',
}: RegenerateButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState<WritingTone>(currentTone);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (!transcription) {
      setError('No transcription available');
      return;
    }

    if (selectedTone === currentTone) {
      // No need to regenerate if tone hasn't changed
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/regenerate-vibelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription,
          tone: selectedTone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Regeneration failed' }));
        throw new Error(errorData.error || 'Failed to regenerate');
      }

      const data = await response.json();

      if (data.success) {
        onRegenerate(
          {
            teaser: data.vibelogTeaser,
            full: data.vibelogContent,
          },
          selectedTone
        );
      } else {
        throw new Error('Regeneration failed');
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={selectedTone}
        onChange={e => setSelectedTone(e.target.value as WritingTone)}
        disabled={isRegenerating}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Select tone"
      >
        {TONE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.emoji} {option.label}
            {option.value === currentTone ? ' (current)' : ''}
          </option>
        ))}
      </select>

      <button
        onClick={handleRegenerate}
        disabled={isRegenerating || selectedTone === currentTone}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Regenerate vibelog"
      >
        <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
