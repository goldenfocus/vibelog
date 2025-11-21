'use client';

import { Cpu, Zap, Scale, Gauge } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import { ConfigCard } from './ConfigCard';

interface ModelSettings {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface Props {
  config: ModelSettings | null;
  onSave: (value: ModelSettings) => Promise<void>;
  lastUpdated?: string;
}

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Most capable, best quality', cost: '$$$' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Fast & affordable', cost: '$' },
];

const PRESETS = [
  { name: 'Creative', temperature: 1.2, top_p: 0.95, desc: 'More varied, imaginative' },
  { name: 'Balanced', temperature: 0.7, top_p: 1.0, desc: 'Default, good all-around' },
  { name: 'Precise', temperature: 0.3, top_p: 0.8, desc: 'Focused, deterministic' },
];

export function ModelSettingsCard({ config, onSave, lastUpdated }: Props) {
  const [settings, setSettings] = useState<ModelSettings>(
    config || {
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    }
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setSettings(config);
    }
  }, [config]);

  const updateSetting = <K extends keyof ModelSettings>(key: K, value: ModelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setSettings(prev => ({
      ...prev,
      temperature: preset.temperature,
      top_p: preset.top_p,
    }));
    setIsDirty(true);
  };

  const handleSave = useCallback(async () => {
    await onSave(settings);
    setIsDirty(false);
  }, [settings, onSave]);

  // Estimate cost per 1K tokens
  const costPer1K = settings.model === 'gpt-4o' ? 0.005 : 0.00015;
  const estimatedCost = ((settings.max_tokens / 1000) * costPer1K).toFixed(4);

  return (
    <ConfigCard
      title="Model Settings"
      description="Configure the AI model parameters for responses"
      icon={<Cpu className="h-5 w-5" />}
      onSave={handleSave}
      isDirty={isDirty}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Model</label>
          <Select value={settings.model} onValueChange={v => updateSetting('model', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">({model.cost})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {MODELS.find(m => m.id === settings.model)?.desc}
          </p>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Quick Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(preset => {
              const isActive =
                settings.temperature === preset.temperature && settings.top_p === preset.top_p;
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    isActive
                      ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                      : 'border-border hover:border-purple-300 hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium text-foreground">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Zap className="h-4 w-4 text-amber-500" />
              Temperature
            </label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {settings.temperature.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[settings.temperature]}
            onValueChange={([v]) => updateSetting('temperature', v)}
            min={0}
            max={2}
            step={0.1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Focused</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max Tokens Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Gauge className="h-4 w-4 text-blue-500" />
              Max Tokens
            </label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {settings.max_tokens}
            </span>
          </div>
          <Slider
            value={[settings.max_tokens]}
            onValueChange={([v]) => updateSetting('max_tokens', v)}
            min={100}
            max={4000}
            step={100}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Short (100)</span>
            <span>Long (4000)</span>
          </div>
        </div>

        {/* Top P Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Scale className="h-4 w-4 text-green-500" />
              Top P (Nucleus Sampling)
            </label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {settings.top_p.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.top_p]}
            onValueChange={([v]) => updateSetting('top_p', v)}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        {/* Cost Estimate */}
        <div className="rounded-lg border border-border/50 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Est. cost per response</span>
            <span className="font-mono text-lg font-semibold text-purple-500">
              ~${estimatedCost}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on {settings.max_tokens} max tokens with {settings.model}
          </p>
        </div>
      </div>
    </ConfigCard>
  );
}
