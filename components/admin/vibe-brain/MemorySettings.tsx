'use client';

import { Brain, Lightbulb, Target, User, Heart, TestTube, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Slider } from '@/components/ui/slider';

import { ConfigCard } from './ConfigCard';

interface MemoryPattern {
  regex: string;
  category: string;
  importance: number;
}

interface MemoryConfig {
  enabled: boolean;
  patterns: MemoryPattern[];
  auto_expire_days: number | null;
}

interface Props {
  config: MemoryConfig | null;
  onSave: (value: MemoryConfig) => Promise<void>;
  lastUpdated?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  preferences: Heart,
  goals: Target,
  personal: User,
  interests: Lightbulb,
};

const CATEGORY_COLORS: Record<string, string> = {
  preferences: 'text-pink-500 bg-pink-500/10',
  goals: 'text-amber-500 bg-amber-500/10',
  personal: 'text-blue-500 bg-blue-500/10',
  interests: 'text-green-500 bg-green-500/10',
};

export function MemorySettings({ config, onSave, lastUpdated }: Props) {
  const [settings, setSettings] = useState<MemoryConfig>(
    config || {
      enabled: true,
      patterns: [],
      auto_expire_days: null,
    }
  );
  const [isDirty, setIsDirty] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResults, setTestResults] = useState<{ pattern: string; match: string | null }[]>([]);

  useEffect(() => {
    if (config) {
      setSettings(config);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    await onSave(settings);
    setIsDirty(false);
  }, [settings, onSave]);

  const toggleEnabled = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
    setIsDirty(true);
  };

  const updatePattern = (index: number, updates: Partial<MemoryPattern>) => {
    setSettings(prev => ({
      ...prev,
      patterns: prev.patterns.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    }));
    setIsDirty(true);
  };

  const addPattern = () => {
    setSettings(prev => ({
      ...prev,
      patterns: [...prev.patterns, { regex: '', category: 'preferences', importance: 0.5 }],
    }));
    setIsDirty(true);
  };

  const deletePattern = (index: number) => {
    setSettings(prev => ({
      ...prev,
      patterns: prev.patterns.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  const setExpireDays = (days: number | null) => {
    setSettings(prev => ({ ...prev, auto_expire_days: days }));
    setIsDirty(true);
  };

  // Test patterns against input
  const runTest = () => {
    const results = settings.patterns.map(pattern => {
      try {
        const regex = new RegExp(pattern.regex, 'i');
        const match = testInput.match(regex);
        return { pattern: pattern.regex, match: match ? match[0] : null };
      } catch {
        return { pattern: pattern.regex, match: null };
      }
    });
    setTestResults(results);
  };

  return (
    <ConfigCard
      title="Memory Extraction"
      description="Configure how Vibe Brain learns and remembers user information"
      icon={<Brain className="h-5 w-5" />}
      onSave={handleSave}
      isDirty={isDirty}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <h4 className="font-medium text-foreground">Enable Memory Extraction</h4>
            <p className="text-sm text-muted-foreground">
              Automatically learn facts about users from conversations
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.enabled ? 'bg-purple-500' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {/* Auto-Expire Setting */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Memory Retention</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Forever', value: null },
              { label: '30 days', value: 30 },
              { label: '90 days', value: 90 },
              { label: '1 year', value: 365 },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setExpireDays(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  settings.auto_expire_days === opt.value
                    ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                    : 'border-border text-muted-foreground hover:border-purple-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(CATEGORY_ICONS).map(([cat, Icon]) => {
            const count = settings.patterns.filter(p => p.category === cat).length;
            return (
              <div
                key={cat}
                className={`rounded-lg p-3 ${CATEGORY_COLORS[cat]} flex items-center gap-2`}
              >
                <Icon className="h-4 w-4" />
                <div>
                  <div className="text-sm font-medium capitalize">{cat}</div>
                  <div className="text-xs opacity-70">{count} patterns</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Patterns List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Extraction Patterns</label>
            <button
              onClick={addPattern}
              className="flex items-center gap-1 rounded-lg bg-purple-500 px-3 py-1.5 text-sm text-white hover:bg-purple-600"
            >
              <Plus className="h-4 w-4" />
              Add Pattern
            </button>
          </div>

          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {settings.patterns.map((pattern, idx) => {
              const CategoryIcon = CATEGORY_ICONS[pattern.category] || Lightbulb;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-card p-3 hover:border-purple-300"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <input
                      value={pattern.regex}
                      onChange={e => updatePattern(idx, { regex: e.target.value })}
                      placeholder="Regular expression pattern..."
                      className="flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-sm focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => deletePattern(idx)}
                      className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={pattern.category}
                      onChange={e => updatePattern(idx, { category: e.target.value })}
                      className="rounded border border-border bg-background px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                    >
                      {Object.keys(CATEGORY_ICONS).map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-xs text-muted-foreground">Importance:</span>
                      <Slider
                        value={[pattern.importance]}
                        onValueChange={([v]) => updatePattern(idx, { importance: v })}
                        min={0}
                        max={1}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="w-8 text-right font-mono text-xs">
                        {pattern.importance.toFixed(1)}
                      </span>
                    </div>
                    <div className={`rounded p-1 ${CATEGORY_COLORS[pattern.category]}`}>
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
            {settings.patterns.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No patterns configured. Add patterns to extract memories from conversations.
              </div>
            )}
          </div>
        </div>

        {/* Pattern Tester */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <TestTube className="h-4 w-4 text-purple-500" />
            Pattern Tester
          </div>
          <div className="flex gap-2">
            <input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="I love building AI products..."
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={runTest}
              className="rounded bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Test
            </button>
          </div>
          {testResults.length > 0 && (
            <div className="mt-3 space-y-1">
              {testResults.map((result, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${result.match ? 'bg-green-500' : 'bg-muted'}`}
                  />
                  <code className="text-xs text-muted-foreground">{result.pattern}</code>
                  {result.match && (
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-500">
                      {result.match}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ConfigCard>
  );
}
