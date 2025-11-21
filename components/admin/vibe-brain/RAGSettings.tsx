'use client';

import { Search, FileText, MessageSquare, Users, Database, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Slider } from '@/components/ui/slider';

import { ConfigCard } from './ConfigCard';

interface RAGConfig {
  max_results: number;
  content_types: string[];
  similarity_threshold: number;
  context_history_limit: number;
}

interface Props {
  config: RAGConfig | null;
  onSave: (value: RAGConfig) => Promise<void>;
  lastUpdated?: string;
  onTestSearch?: (query: string) => Promise<{ title: string; type: string; score: number }[]>;
}

const CONTENT_TYPES = [
  { id: 'vibelog', label: 'Vibelogs', icon: FileText, desc: 'Published vibelogs' },
  { id: 'comment', label: 'Comments', icon: MessageSquare, desc: 'Vibelog comments' },
  { id: 'profile', label: 'Profiles', icon: Users, desc: 'Creator profiles' },
];

export function RAGSettings({ config, onSave, lastUpdated, onTestSearch }: Props) {
  const [settings, setSettings] = useState<RAGConfig>(
    config || {
      max_results: 5,
      content_types: ['vibelog', 'comment', 'profile'],
      similarity_threshold: 0.6,
      context_history_limit: 10,
    }
  );
  const [isDirty, setIsDirty] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<{ title: string; type: string; score: number }[]>(
    []
  );
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (config) {
      setSettings(config);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    await onSave(settings);
    setIsDirty(false);
  }, [settings, onSave]);

  const toggleContentType = (type: string) => {
    setSettings(prev => ({
      ...prev,
      content_types: prev.content_types.includes(type)
        ? prev.content_types.filter(t => t !== type)
        : [...prev.content_types, type],
    }));
    setIsDirty(true);
  };

  const updateSetting = <K extends keyof RAGConfig>(key: K, value: RAGConfig[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const runTestSearch = async () => {
    if (!onTestSearch || !testQuery.trim()) {
      return;
    }
    setTesting(true);
    try {
      const results = await onTestSearch(testQuery);
      setTestResults(results);
    } finally {
      setTesting(false);
    }
  };

  // Calculate rough index stats
  const activeTypesCount = settings.content_types.length;

  return (
    <ConfigCard
      title="RAG Settings"
      description="Configure retrieval-augmented generation for contextual responses"
      icon={<Search className="h-5 w-5" />}
      onSave={handleSave}
      isDirty={isDirty}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-6">
        {/* Content Types */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Searchable Content Types</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {CONTENT_TYPES.map(type => {
              const isActive = settings.content_types.includes(type.id);
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => toggleContentType(type.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isActive
                      ? 'border-purple-500 bg-purple-500/5'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  <div
                    className={`rounded-lg p-2 ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.desc}</div>
                  </div>
                  <div
                    className={`ml-auto h-4 w-4 rounded-full border-2 ${
                      isActive ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground'
                    }`}
                  >
                    {isActive && (
                      <svg className="h-full w-full text-white" viewBox="0 0 16 16">
                        <path fill="currentColor" d="M6.5 12.5L3 9l1-1 2.5 2.5L11 6l1 1-5.5 5.5z" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Max Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="h-4 w-4 text-blue-500" />
              Max Results per Search
            </label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {settings.max_results}
            </span>
          </div>
          <Slider
            value={[settings.max_results]}
            onValueChange={([v]) => updateSetting('max_results', v)}
            min={1}
            max={20}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Minimal (1)</span>
            <span>Comprehensive (20)</span>
          </div>
        </div>

        {/* Similarity Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Zap className="h-4 w-4 text-amber-500" />
              Similarity Threshold
            </label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {settings.similarity_threshold.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.similarity_threshold]}
            onValueChange={([v]) => updateSetting('similarity_threshold', v)}
            min={0.1}
            max={0.95}
            step={0.05}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Broad matches (0.1)</span>
            <span>Exact matches (0.95)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Lower threshold = more results but less relevant. Higher = fewer but more precise.
          </p>
        </div>

        {/* Context History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="h-4 w-4 text-green-500" />
              Conversation History Limit
            </label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {settings.context_history_limit} messages
            </span>
          </div>
          <Slider
            value={[settings.context_history_limit]}
            onValueChange={([v]) => updateSetting('context_history_limit', v)}
            min={1}
            max={30}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            How many previous messages to include for context. More = better memory, higher cost.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="rounded-lg border border-border bg-gradient-to-r from-purple-500/5 to-blue-500/5 p-4">
          <h4 className="mb-2 font-medium text-foreground">Configuration Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Active content types:</span>
              <span className="ml-2 font-medium text-foreground">{activeTypesCount} / 3</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max context tokens:</span>
              <span className="ml-2 font-medium text-foreground">
                ~{settings.max_results * 500 + settings.context_history_limit * 100}
              </span>
            </div>
          </div>
        </div>

        {/* Test Search */}
        {onTestSearch && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Search className="h-4 w-4 text-purple-500" />
              Test Vector Search
            </div>
            <div className="flex gap-2">
              <input
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="Search vibelogs about AI..."
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && runTestSearch()}
              />
              <button
                onClick={runTestSearch}
                disabled={testing}
                className="rounded bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {testing ? 'Searching...' : 'Search'}
              </button>
            </div>
            {testResults.length > 0 && (
              <div className="mt-3 space-y-1">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-background p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          result.type === 'vibelog'
                            ? 'bg-blue-500/10 text-blue-500'
                            : result.type === 'comment'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-purple-500/10 text-purple-500'
                        }`}
                      >
                        {result.type}
                      </span>
                      <span className="text-foreground">{result.title}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ConfigCard>
  );
}
