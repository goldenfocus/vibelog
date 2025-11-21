'use client';

import {
  Palette,
  Plus,
  Trash2,
  GripVertical,
  Heart,
  Briefcase,
  Coffee,
  Sparkles,
  Laugh,
  BookOpen,
  Rocket,
  Star,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfigCard } from './ConfigCard';

interface Tone {
  id: string;
  name: string;
  modifier: string;
  icon?: string;
}

interface TonesConfig {
  default: string;
  available: Tone[];
}

interface Props {
  config: TonesConfig | null;
  onSave: (value: TonesConfig) => Promise<void>;
  lastUpdated?: string;
}

const TONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  briefcase: Briefcase,
  coffee: Coffee,
  sparkles: Sparkles,
  laugh: Laugh,
  book: BookOpen,
  rocket: Rocket,
  star: Star,
};

const ICON_OPTIONS = Object.keys(TONE_ICONS);

export function ToneDesigner({ config, onSave, lastUpdated }: Props) {
  const [tones, setTones] = useState<TonesConfig>(
    config || {
      default: 'friendly',
      available: [
        { id: 'friendly', name: 'Friendly', modifier: 'Be warm and approachable', icon: 'heart' },
        {
          id: 'professional',
          name: 'Professional',
          modifier: 'Be more formal and business-like',
          icon: 'briefcase',
        },
        { id: 'casual', name: 'Casual', modifier: 'Be relaxed and conversational', icon: 'coffee' },
      ],
    }
  );
  const [isDirty, setIsDirty] = useState(false);
  const [editingTone, setEditingTone] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setTones(config);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    await onSave(tones);
    setIsDirty(false);
  }, [tones, onSave]);

  const setDefault = (id: string) => {
    setTones(prev => ({ ...prev, default: id }));
    setIsDirty(true);
  };

  const updateTone = (id: string, updates: Partial<Tone>) => {
    setTones(prev => ({
      ...prev,
      available: prev.available.map(t => (t.id === id ? { ...t, ...updates } : t)),
    }));
    setIsDirty(true);
  };

  const addTone = () => {
    const newId = `tone_${Date.now()}`;
    setTones(prev => ({
      ...prev,
      available: [
        ...prev.available,
        { id: newId, name: 'New Tone', modifier: 'Describe the personality...', icon: 'star' },
      ],
    }));
    setEditingTone(newId);
    setIsDirty(true);
  };

  const deleteTone = (id: string) => {
    if (tones.available.length <= 1) {
      return;
    }
    setTones(prev => ({
      ...prev,
      available: prev.available.filter(t => t.id !== id),
      default: prev.default === id ? prev.available[0].id : prev.default,
    }));
    setIsDirty(true);
  };

  return (
    <ConfigCard
      title="Personality Tones"
      description="Define different personalities for Vibe Brain conversations"
      icon={<Palette className="h-5 w-5" />}
      onSave={handleSave}
      isDirty={isDirty}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-4">
        {/* Tone Cards Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tones.available.map(tone => {
            const IconComponent = TONE_ICONS[tone.icon || 'star'] || Star;
            const isDefault = tones.default === tone.id;
            const isEditing = editingTone === tone.id;

            return (
              <div
                key={tone.id}
                className={`group relative rounded-xl border-2 p-4 transition-all ${
                  isDefault
                    ? 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20'
                    : 'border-border hover:border-purple-300'
                }`}
              >
                {/* Drag Handle & Delete */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <GripVertical className="h-4 w-4" />
                  </button>
                  {tones.available.length > 1 && (
                    <button
                      onClick={() => deleteTone(tone.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Icon Selection */}
                {isEditing ? (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {ICON_OPTIONS.map(iconKey => {
                      const Icon = TONE_ICONS[iconKey];
                      return (
                        <button
                          key={iconKey}
                          onClick={() => updateTone(tone.id, { icon: iconKey })}
                          className={`rounded-lg p-2 transition-colors ${
                            tone.icon === iconKey
                              ? 'bg-purple-500 text-white'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`mb-3 inline-flex rounded-xl p-3 ${
                      isDefault
                        ? 'bg-purple-500/20 text-purple-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                )}

                {/* Name */}
                {isEditing ? (
                  <input
                    value={tone.name}
                    onChange={e => updateTone(tone.id, { name: e.target.value })}
                    className="mb-2 w-full rounded border border-border bg-background px-2 py-1 font-semibold focus:border-purple-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h4
                    className="mb-1 cursor-pointer font-semibold text-foreground"
                    onClick={() => setEditingTone(tone.id)}
                  >
                    {tone.name}
                  </h4>
                )}

                {/* Modifier */}
                {isEditing ? (
                  <textarea
                    value={tone.modifier}
                    onChange={e => updateTone(tone.id, { modifier: e.target.value })}
                    className="mb-3 w-full resize-none rounded border border-border bg-background px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                    rows={2}
                  />
                ) : (
                  <p
                    className="mb-3 cursor-pointer text-sm text-muted-foreground"
                    onClick={() => setEditingTone(tone.id)}
                  >
                    {tone.modifier}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => setEditingTone(null)}
                      className="text-sm text-purple-500 hover:text-purple-600"
                    >
                      Done
                    </button>
                  ) : (
                    <>
                      {isDefault ? (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-500">
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => setDefault(tone.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Set as default
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Tone Card */}
          <button
            onClick={addTone}
            className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-purple-300 hover:bg-purple-500/5 hover:text-purple-500"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Add Tone</span>
          </button>
        </div>
      </div>
    </ConfigCard>
  );
}
