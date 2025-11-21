'use client';

import {
  Brain,
  RefreshCw,
  Info,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Trash2,
  ExternalLink,
  Settings,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { Slider } from '@/components/ui/slider';

// Info tooltip component with external link
function InfoTip({ text, link }: { text: string; link?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-purple-500/20 hover:text-purple-500"
      >
        <Info className="h-3 w-3" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 text-sm shadow-lg">
          <p className="text-foreground">{text}</p>
          {link && (
            <Link
              href={link}
              target="_blank"
              className="mt-2 flex items-center gap-1 text-xs text-purple-500 hover:underline"
            >
              Learn more <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </span>
  );
}

interface Config {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

interface Stats {
  overview: {
    conversations: number;
    messages: number;
    memories: number;
    totalCost: number;
  };
}

interface Memory {
  id: string;
  fact: string;
  category: string;
  importance: number;
  created_at: string;
}

export default function VibeBrainAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simple state for main settings
  const [personality, setPersonality] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [creativity, setCreativity] = useState(0.7);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, configRes, memoriesRes] = await Promise.all([
        fetch('/api/admin/vibe-brain/stats'),
        fetch('/api/admin/vibe-brain/config'),
        fetch('/api/admin/vibe-brain/memories?limit=20'),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.configs || []);

        // Extract simple values
        const promptConfig = data.configs?.find((c: Config) => c.key === 'system_prompt');
        const modelConfig = data.configs?.find((c: Config) => c.key === 'model_settings');

        if (promptConfig?.value?.content) {
          setPersonality(promptConfig.value.content as string);
        }
        if (modelConfig?.value) {
          setModel((modelConfig.value.model as string) || 'gpt-4o');
          setCreativity((modelConfig.value.temperature as number) || 0.7);
        }
      }
      if (memoriesRes.ok) {
        const data = await memoriesRes.json();
        setMemories(data.memories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveConfig = useCallback(async (key: string, value: unknown) => {
    setSaving(true);
    try {
      await fetch('/api/admin/vibe-brain/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const handlePersonalitySave = () => {
    const current = configs.find(c => c.key === 'system_prompt')?.value || {};
    saveConfig('system_prompt', { ...current, content: personality });
  };

  const handleModelSave = () => {
    const current = configs.find(c => c.key === 'model_settings')?.value || {};
    saveConfig('model_settings', { ...current, model, temperature: creativity });
  };

  const deleteMemory = async (id: string) => {
    await fetch(`/api/admin/vibe-brain/memories?id=${id}`, { method: 'DELETE' });
    setMemories(memories.filter(m => m.id !== id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-3">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vibe Brain</h1>
            <p className="text-sm text-muted-foreground">Make your AI assistant awesome</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="rounded-lg bg-muted px-4 py-2 text-sm hover:bg-muted/80"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
            <MessageSquare className="mb-2 h-5 w-5 text-blue-500" />
            <p className="text-2xl font-bold">{stats.overview.conversations}</p>
            <p className="text-xs text-muted-foreground">Chats</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 p-4">
            <Zap className="mb-2 h-5 w-5 text-green-500" />
            <p className="text-2xl font-bold">{stats.overview.messages}</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4">
            <Sparkles className="mb-2 h-5 w-5 text-purple-500" />
            <p className="text-2xl font-bold">{stats.overview.memories}</p>
            <p className="text-xs text-muted-foreground">Memories</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4">
            <span className="mb-2 block text-lg">$</span>
            <p className="text-2xl font-bold">{stats.overview.totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Cost</p>
          </div>
        </div>
      )}

      {/* Main Settings - Super Simple */}
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Personality</h2>

        {/* Personality/System Prompt */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium">
            How should Vibe Brain talk?
            <InfoTip
              text="This is the 'system prompt' - instructions that tell the AI how to behave and respond. Write it like you're describing a person's personality."
              link="https://platform.openai.com/docs/guides/prompt-engineering"
            />
          </label>
          <textarea
            value={personality}
            onChange={e => setPersonality(e.target.value)}
            placeholder="You are a friendly, helpful AI assistant..."
            className="h-48 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{personality.length} characters</span>
            <button
              onClick={handlePersonalitySave}
              disabled={saving}
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Model & Creativity */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center text-sm font-medium">
              AI Model
              <InfoTip
                text="GPT-4o is smarter but costs more. GPT-4o-mini is faster and cheaper but less capable."
                link="https://platform.openai.com/docs/models"
              />
            </label>
            <div className="flex gap-2">
              {['gpt-4o', 'gpt-4o-mini'].map(m => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    model === m
                      ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  {m === 'gpt-4o' ? 'Smart' : 'Fast'}
                  <span className="mt-1 block text-xs opacity-60">
                    {m === 'gpt-4o' ? '$$$' : '$'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center text-sm font-medium">
              Creativity: {creativity.toFixed(1)}
              <InfoTip
                text="Low = focused and consistent answers. High = more creative and varied responses. 0.7 is a good balance."
                link="https://platform.openai.com/docs/api-reference/chat/create#temperature"
              />
            </label>
            <Slider
              value={[creativity]}
              onValueChange={([v]) => setCreativity(v)}
              min={0}
              max={1.5}
              step={0.1}
              className="mt-4"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Focused</span>
              <span>Creative</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleModelSave}
          disabled={saving}
          className="w-full rounded-lg bg-purple-500 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Model Settings'}
        </button>
      </div>

      {/* Memories - What Vibe Brain Remembers */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center text-lg font-semibold">
          <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
          What Vibe Brain Remembers
          <InfoTip
            text="Vibe Brain learns facts about users from conversations. These memories help personalize responses."
            link="https://en.wikipedia.org/wiki/Memory_(artificial_intelligence)"
          />
        </h2>

        {memories.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No memories yet. Start chatting with Vibe Brain!
          </p>
        ) : (
          <div className="space-y-2">
            {memories.slice(0, 10).map(memory => (
              <div
                key={memory.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <div className="flex-1">
                  <p className="text-sm">{memory.fact}</p>
                  <span className="mt-1 inline-block rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-500">
                    {memory.category}
                  </span>
                </div>
                <button
                  onClick={() => deleteMemory(memory.id)}
                  className="ml-2 rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Settings - Expandable */}
      <div className="rounded-2xl border border-border bg-card">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Advanced Settings</span>
            <InfoTip text="Technical settings for power users. Only change these if you know what you're doing!" />
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>

        {showAdvanced && (
          <div className="space-y-4 border-t border-border p-6">
            {configs.map(config => (
              <div key={config.key} className="rounded-lg bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium capitalize">
                    {config.key.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {new Date(config.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <pre className="max-h-48 overflow-auto rounded bg-background p-3 text-xs">
                  {JSON.stringify(config.value, null, 2)}
                </pre>
              </div>
            ))}

            <p className="text-center text-xs text-muted-foreground">
              Need to edit these?{' '}
              <Link
                href="https://supabase.com/dashboard"
                target="_blank"
                className="text-purple-500 hover:underline"
              >
                Edit in Supabase
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
