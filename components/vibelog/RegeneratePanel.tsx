'use client';

/**
 * RegeneratePanel Component
 * Universal regeneration UI for all vibelog types (text, audio, video)
 * Mobile-first design with full-width content display
 */

import { Sparkles, Check, X, Loader2, ChevronDown } from 'lucide-react';
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
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);

  const toneOptions = [
    { value: 'authentic', label: 'Authentic', emoji: '✨', desc: 'Natural voice' },
    { value: 'professional', label: 'Professional', emoji: '💼', desc: 'Formal & expert' },
    { value: 'casual', label: 'Casual', emoji: '☕', desc: 'Friendly & relaxed' },
    { value: 'humorous', label: 'Humorous', emoji: '😄', desc: 'Funny & lighthearted' },
    { value: 'inspiring', label: 'Inspiring', emoji: '🚀', desc: 'Motivational' },
    { value: 'analytical', label: 'Analytical', emoji: '📊', desc: 'Data-driven' },
    { value: 'storytelling', label: 'Storytelling', emoji: '📖', desc: 'Narrative focus' },
    { value: 'dramatic', label: 'Dramatic', emoji: '🎭', desc: 'Intense & emotional' },
    { value: 'poetic', label: 'Poetic', emoji: '🌸', desc: 'Literary & artistic' },
  ];

  const selectedTone = toneOptions.find(opt => opt.value === tone) || toneOptions[0];

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
    <div className="space-y-4 rounded-lg border-2 border-electric/20 bg-card p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 flex-shrink-0 text-electric" />
        <h3 className="text-base font-semibold sm:text-lg">AI Regeneration</h3>
      </div>

      {/* Generate Button - ALWAYS ON TOP */}
      {!isGenerating && (
        <div className="space-y-3">
          {/* Tone Selector - Mobile Friendly */}
          {!suggestions && (
            <div className="relative">
              <button
                onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
                className="flex w-full items-center justify-between rounded-lg border-2 border-border bg-background px-4 py-3 text-left transition-colors hover:border-electric/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedTone.emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{selectedTone.label}</p>
                    <p className="text-xs text-muted-foreground">{selectedTone.desc}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${isToneDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {isToneDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-80 overflow-y-auto rounded-lg border-2 border-border bg-card shadow-xl">
                  {toneOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTone(opt.value);
                        setIsToneDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted ${
                        tone === opt.value ? 'bg-electric/10' : ''
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      {tone === opt.value && <Check className="h-4 w-4 text-electric" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-electric px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-electric/20 transition-all hover:bg-electric/90 active:scale-95 sm:text-lg"
          >
            <Sparkles className="h-5 w-5" />
            {suggestions ? 'Regenerate with AI' : 'Get AI Suggestions'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
          {error}
        </div>
      )}

      {/* Generating State */}
      {isGenerating && (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-electric" />
          <p className="text-sm text-muted-foreground">Generating fresh content...</p>
        </div>
      )}

      {/* Suggestions - Mobile-First Full Width Display */}
      {suggestions && !isGenerating && (
        <div className="space-y-4">
          {/* Title */}
          {suggestions.title && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="title-checkbox"
                  checked={selectedFields.has('title')}
                  onChange={() => toggleField('title')}
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="title-checkbox" className="text-sm font-semibold sm:text-base">
                  Title
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  {currentTitle || '(No title)'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-electric">
                  ✨ AI Suggested
                </div>
                <div className="rounded-md border-2 border-electric/40 bg-electric/5 p-3 text-sm font-medium">
                  {suggestions.title}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {suggestions.description && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="description-checkbox"
                  checked={selectedFields.has('description')}
                  onChange={() => toggleField('description')}
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label
                  htmlFor="description-checkbox"
                  className="text-sm font-semibold sm:text-base"
                >
                  Description
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current
                </div>
                <div className="max-h-32 overflow-y-auto rounded-md bg-muted/50 p-3 text-sm">
                  {currentDescription || '(No description)'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-electric">
                  ✨ AI Suggested
                </div>
                <div className="max-h-32 overflow-y-auto rounded-md border-2 border-electric/40 bg-electric/5 p-3 text-sm">
                  {suggestions.description}
                </div>
              </div>
            </div>
          )}

          {/* Teaser */}
          {suggestions.teaser && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="teaser-checkbox"
                  checked={selectedFields.has('teaser')}
                  onChange={() => toggleField('teaser')}
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="teaser-checkbox" className="text-sm font-semibold sm:text-base">
                  Teaser
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current
                </div>
                <div className="max-h-24 overflow-y-auto rounded-md bg-muted/50 p-3 text-sm">
                  {currentTeaser || '(No teaser)'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-electric">
                  ✨ AI Suggested
                </div>
                <div className="max-h-24 overflow-y-auto rounded-md border-2 border-electric/40 bg-electric/5 p-3 text-sm">
                  {suggestions.teaser}
                </div>
              </div>
            </div>
          )}

          {/* Slug/URL */}
          {suggestions.slug && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="slug-checkbox"
                  checked={selectedFields.has('slug')}
                  onChange={() => toggleField('slug')}
                  className="h-5 w-5 rounded border-gray-300"
                />
                <label htmlFor="slug-checkbox" className="text-sm font-semibold sm:text-base">
                  URL Slug
                </label>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current
                </div>
                <div className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {currentSlug}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-electric">
                  ✨ AI Suggested
                </div>
                <div className="overflow-x-auto rounded-md border-2 border-electric/40 bg-electric/5 p-3 font-mono text-xs">
                  {suggestions.slug}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              onClick={handleApplySelected}
              disabled={selectedFields.size === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-electric px-6 py-3 text-base font-semibold text-white shadow-lg shadow-electric/20 transition-all hover:bg-electric/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              Apply Selected ({selectedFields.size})
            </button>
            <button
              onClick={() => {
                setSuggestions(null);
                setSelectedFields(new Set());
              }}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-muted active:scale-95 sm:flex-initial"
            >
              <X className="h-5 w-5" />
              <span className="sm:hidden">Cancel</span>
              <span className="hidden sm:inline">Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Slug Section (TODO: implement later if needed) */}
    </div>
  );
}
