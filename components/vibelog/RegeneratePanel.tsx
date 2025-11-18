'use client';

/**
 * RegeneratePanel Component
 * Universal regeneration UI for all vibelog types (text, audio, video)
 * Shows side-by-side comparison of current vs. AI-suggested content
 */

import { Sparkles, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface RegeneratePanelProps {
  vibelogId: string;
  currentTitle: string;
  currentDescription: string;
  currentTeaser: string;
  currentSlug: string;
  onApply: (updates: {
    title?: string;
    content?: string;
    teaser?: string;
    slug?: string;
  }) => Promise<void>;
}

interface Suggestions {
  title?: string;
  description?: string;
  teaser?: string;
  slug?: string;
}

export function RegeneratePanel({
  vibelogId,
  currentTitle,
  currentDescription,
  currentTeaser,
  currentSlug,
  onApply,
}: RegeneratePanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [_useCustomSlug, _setUseCustomSlug] = useState(false); // TODO: implement custom slug UI
  const [_customSlugInput, _setCustomSlugInput] = useState(''); // TODO: implement custom slug UI
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<string>('authentic');

  const toneOptions = [
    { value: 'authentic', label: 'Authentic', desc: 'Natural voice' },
    { value: 'professional', label: 'Professional', desc: 'Formal & expert' },
    { value: 'casual', label: 'Casual', desc: 'Friendly & relaxed' },
    { value: 'humorous', label: 'Humorous', desc: 'Funny & lighthearted' },
    { value: 'inspiring', label: 'Inspiring', desc: 'Motivational' },
    { value: 'analytical', label: 'Analytical', desc: 'Data-driven' },
    { value: 'storytelling', label: 'Storytelling', desc: 'Narrative focus' },
    { value: 'dramatic', label: 'Dramatic', desc: 'Intense & emotional' },
    { value: 'poetic', label: 'Poetic', desc: 'Literary & artistic' },
  ];

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const fieldsToRegenerate = ['title', 'description', 'teaser', 'slug'];

      const response = await fetch('/api/vibelog/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibelogId,
          fields: fieldsToRegenerate,
          tone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);

      // Auto-select all fields that got suggestions
      const newSelected = new Set<string>();
      Object.keys(data.suggestions).forEach(field => newSelected.add(field));
      setSelectedFields(newSelected);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate';
      setError(errorMessage);
      console.error('Regeneration error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySelected = async () => {
    if (!suggestions || selectedFields.size === 0) {
      return;
    }

    const updates: Record<string, string> = {};

    if (selectedFields.has('title') && suggestions.title) {
      updates.title = suggestions.title;
    }

    if (selectedFields.has('description') && suggestions.description) {
      updates.content = `# ${suggestions.title || currentTitle}\n\n${suggestions.description}`;
    }

    if (selectedFields.has('teaser') && suggestions.teaser) {
      updates.teaser = suggestions.teaser;
    }

    if (selectedFields.has('slug') && suggestions.slug) {
      updates.slug = suggestions.slug;
    }

    await onApply(updates);

    // Reset state after applying
    setSuggestions(null);
    setSelectedFields(new Set());
  };

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  return (
    <div className="space-y-4 rounded-lg border-2 border-electric/20 bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-electric" />
          <h3 className="text-lg font-semibold">AI Regeneration</h3>
        </div>
        {!suggestions && (
          <select
            value={tone}
            onChange={e => setTone(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            {toneOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} - {opt.desc}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
          {error}
        </div>
      )}

      {/* No Suggestions State */}
      {!suggestions && !isGenerating && (
        <div className="py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Generate fresh AI suggestions for your vibelog title, description, and URL
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-lg bg-electric px-6 py-3 font-medium text-white hover:bg-electric/90"
          >
            <Sparkles className="h-4 w-4" />
            Get AI Suggestions
          </button>
        </div>
      )}

      {/* Generating State */}
      {isGenerating && (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-electric" />
          <p className="text-sm text-muted-foreground">Generating fresh content...</p>
        </div>
      )}

      {/* Suggestions - Side by Side Comparison */}
      {suggestions && !isGenerating && (
        <div className="space-y-4">
          {/* Title */}
          {suggestions.title && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="title-checkbox"
                  checked={selectedFields.has('title')}
                  onChange={() => toggleField('title')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="title-checkbox" className="text-sm font-medium">
                  Title
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Current</p>
                  <p className="text-sm">{currentTitle || '(No title)'}</p>
                </div>
                <div className="rounded-lg border-2 border-electric/40 bg-electric/5 p-3">
                  <p className="mb-1 text-xs text-electric">AI Suggested</p>
                  <p className="text-sm font-medium">{suggestions.title}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {suggestions.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="description-checkbox"
                  checked={selectedFields.has('description')}
                  onChange={() => toggleField('description')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="description-checkbox" className="text-sm font-medium">
                  Description
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Current</p>
                  <p className="line-clamp-4 text-sm">{currentDescription || '(No description)'}</p>
                </div>
                <div className="rounded-lg border-2 border-electric/40 bg-electric/5 p-3">
                  <p className="mb-1 text-xs text-electric">AI Suggested</p>
                  <p className="line-clamp-4 text-sm">{suggestions.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Teaser */}
          {suggestions.teaser && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="teaser-checkbox"
                  checked={selectedFields.has('teaser')}
                  onChange={() => toggleField('teaser')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="teaser-checkbox" className="text-sm font-medium">
                  Teaser
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Current</p>
                  <p className="line-clamp-3 text-sm">{currentTeaser || '(No teaser)'}</p>
                </div>
                <div className="rounded-lg border-2 border-electric/40 bg-electric/5 p-3">
                  <p className="mb-1 text-xs text-electric">AI Suggested</p>
                  <p className="line-clamp-3 text-sm">{suggestions.teaser}</p>
                </div>
              </div>
            </div>
          )}

          {/* Slug/URL */}
          {suggestions.slug && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="slug-checkbox"
                  checked={selectedFields.has('slug')}
                  onChange={() => toggleField('slug')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="slug-checkbox" className="text-sm font-medium">
                  URL Slug
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Current</p>
                  <p className="font-mono text-xs">{currentSlug}</p>
                </div>
                <div className="rounded-lg border-2 border-electric/40 bg-electric/5 p-3">
                  <p className="mb-1 text-xs text-electric">AI Suggested</p>
                  <p className="font-mono text-xs">{suggestions.slug}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleApplySelected}
              disabled={selectedFields.size === 0}
              className="flex items-center gap-2 rounded-lg bg-electric px-6 py-2.5 font-medium text-white hover:bg-electric/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Apply Selected ({selectedFields.size})
            </button>
            <button
              onClick={() => {
                setSuggestions(null);
                setSelectedFields(new Set());
              }}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-2.5 font-medium hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="ml-auto flex items-center gap-2 rounded-lg border border-electric bg-background px-4 py-2.5 text-sm font-medium text-electric hover:bg-electric/5"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Custom Slug Section (TODO: implement later if needed) */}
    </div>
  );
}
