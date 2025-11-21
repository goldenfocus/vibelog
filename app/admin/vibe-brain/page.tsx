'use client';

import {
  Brain,
  Settings2,
  MessageSquare,
  Sparkles,
  BarChart3,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  Database,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { MemorySettings } from '@/components/admin/vibe-brain/MemorySettings';
import { ModelSettingsCard } from '@/components/admin/vibe-brain/ModelSettingsCard';
import { RAGSettings } from '@/components/admin/vibe-brain/RAGSettings';
import { SystemPromptEditor } from '@/components/admin/vibe-brain/SystemPromptEditor';
import { ToneDesigner } from '@/components/admin/vibe-brain/ToneDesigner';

interface Config {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
}

interface Memory {
  id: string;
  user_id: string;
  fact: string;
  category: string;
  importance: number;
  created_at: string;
  user?: { username: string; display_name: string };
}

interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  message_count: number;
  updated_at: string;
  user?: { username: string; display_name: string };
}

interface Stats {
  overview: {
    conversations: number;
    messages: number;
    memories: number;
    embeddings: number;
    uniqueUsers: number;
    totalCost: number;
  };
  messagesByDay: Record<string, number>;
  memoryCategoryCounts: Record<string, number>;
  embeddingTypeCounts: Record<string, number>;
}

type Tab = 'overview' | 'config' | 'memories' | 'conversations';

export default function VibeBrainAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Expanded sections
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Record<string, unknown>[]>([]);

  const fetchStats = async () => {
    const res = await fetch('/api/admin/vibe-brain/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const fetchConfigs = async () => {
    const res = await fetch('/api/admin/vibe-brain/config');
    if (res.ok) {
      const data = await res.json();
      setConfigs(data.configs || []);
    }
  };

  const fetchMemories = async () => {
    const res = await fetch('/api/admin/vibe-brain/memories?limit=100');
    if (res.ok) {
      const data = await res.json();
      setMemories(data.memories || []);
    }
  };

  const fetchConversations = async () => {
    const res = await fetch('/api/admin/vibe-brain/conversations?limit=50');
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchConfigs(), fetchMemories(), fetchConversations()]);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get config by key
  const getConfig = (key: string) => configs.find(c => c.key === key);

  // Save config handler
  const saveConfig = useCallback(async (key: string, value: unknown) => {
    const res = await fetch('/api/admin/vibe-brain/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });

    if (res.ok) {
      await fetchConfigs();
    } else {
      throw new Error('Failed to save configuration');
    }
  }, []);

  const handleDeleteMemory = async (id: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this memory?')) {
      return;
    }

    const res = await fetch(`/api/admin/vibe-brain/memories?id=${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setMemories(memories.filter(m => m.id !== id));
    }
  };

  const handleExpandConversation = async (id: string) => {
    if (expandedConversation === id) {
      setExpandedConversation(null);
      return;
    }

    const res = await fetch(`/api/admin/vibe-brain/conversations?conversationId=${id}`);
    if (res.ok) {
      const data = await res.json();
      setConversationMessages(data.messages || []);
      setExpandedConversation(id);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'config', label: 'Configuration', icon: Settings2 },
    { id: 'memories', label: 'Memories', icon: Sparkles },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  ];

  const categoryColors: Record<string, string> = {
    preferences: 'bg-pink-500/10 text-pink-500',
    goals: 'bg-amber-500/10 text-amber-500',
    personal: 'bg-blue-500/10 text-blue-500',
    interests: 'bg-green-500/10 text-green-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 shadow-lg shadow-purple-500/25">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vibe Brain Admin</h1>
            <p className="text-muted-foreground">
              Configure AI personality, memory, and knowledge retrieval
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-muted px-5 py-2.5 font-medium transition-all hover:bg-muted/80 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  label: 'Conversations',
                  value: stats.overview.conversations,
                  icon: MessageSquare,
                  color: 'text-blue-500 bg-blue-500/10',
                },
                {
                  label: 'Messages',
                  value: stats.overview.messages,
                  icon: TrendingUp,
                  color: 'text-green-500 bg-green-500/10',
                },
                {
                  label: 'Memories',
                  value: stats.overview.memories,
                  icon: Sparkles,
                  color: 'text-purple-500 bg-purple-500/10',
                },
                {
                  label: 'Embeddings',
                  value: stats.overview.embeddings,
                  icon: Database,
                  color: 'text-amber-500 bg-amber-500/10',
                },
                {
                  label: 'Unique Users',
                  value: stats.overview.uniqueUsers,
                  icon: Users,
                  color: 'text-pink-500 bg-pink-500/10',
                },
                {
                  label: 'Total Cost',
                  value: `$${stats.overview.totalCost.toFixed(2)}`,
                  icon: DollarSign,
                  color: 'text-emerald-500 bg-emerald-500/10',
                },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div className={`mb-3 inline-flex rounded-xl p-2 ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Messages by Day */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-semibold text-foreground">Messages (Last 7 Days)</h3>
                <div className="flex h-40 items-end gap-2">
                  {Object.entries(stats.messagesByDay)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([day, count]) => {
                      const max = Math.max(...Object.values(stats.messagesByDay), 1);
                      const height = (count / max) * 100;
                      return (
                        <div key={day} className="flex flex-1 flex-col items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{count}</span>
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-purple-500 to-pink-500 transition-all hover:opacity-80"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <span className="text-xs text-muted-foreground">{day.slice(5)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Memory Categories */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-semibold text-foreground">Memory Categories</h3>
                <div className="space-y-3">
                  {Object.entries(stats.memoryCategoryCounts).map(([category, count]) => {
                    const total = Object.values(stats.memoryCategoryCounts).reduce(
                      (a, b) => a + b,
                      1
                    );
                    const percentage = (count / total) * 100;
                    return (
                      <div key={category}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm capitalize text-foreground">{category}</span>
                          <span className="text-sm font-medium text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Prompt - Full Width */}
            <div className="lg:col-span-2">
              <SystemPromptEditor
                config={
                  getConfig('system_prompt')?.value as { content: string; version: number } | null
                }
                onSave={async value => saveConfig('system_prompt', value)}
                lastUpdated={getConfig('system_prompt')?.updated_at}
              />
            </div>

            {/* Model Settings */}
            <ModelSettingsCard
              config={
                getConfig('model_settings')?.value as {
                  model: string;
                  temperature: number;
                  max_tokens: number;
                  top_p: number;
                  frequency_penalty: number;
                  presence_penalty: number;
                } | null
              }
              onSave={async value => saveConfig('model_settings', value)}
              lastUpdated={getConfig('model_settings')?.updated_at}
            />

            {/* RAG Settings */}
            <RAGSettings
              config={
                getConfig('rag_settings')?.value as {
                  max_results: number;
                  content_types: string[];
                  similarity_threshold: number;
                  context_history_limit: number;
                } | null
              }
              onSave={async value => saveConfig('rag_settings', value)}
              lastUpdated={getConfig('rag_settings')?.updated_at}
            />

            {/* Tone Designer - Full Width */}
            <div className="lg:col-span-2">
              <ToneDesigner
                config={
                  getConfig('tones')?.value as {
                    default: string;
                    available: { id: string; name: string; modifier: string; icon?: string }[];
                  } | null
                }
                onSave={async value => saveConfig('tones', value)}
                lastUpdated={getConfig('tones')?.updated_at}
              />
            </div>

            {/* Memory Settings - Full Width */}
            <div className="lg:col-span-2">
              <MemorySettings
                config={
                  getConfig('memory_extraction')?.value as {
                    enabled: boolean;
                    patterns: { regex: string; category: string; importance: number }[];
                    auto_expire_days: number | null;
                  } | null
                }
                onSave={async value => saveConfig('memory_extraction', value)}
                lastUpdated={getConfig('memory_extraction')?.updated_at}
              />
            </div>
          </div>
        )}

        {/* Memories Tab */}
        {activeTab === 'memories' && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Fact
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Importance
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {memories.map(memory => (
                    <tr key={memory.id} className="transition-colors hover:bg-muted/30">
                      <td className="max-w-md px-4 py-3 text-sm text-foreground">
                        <div className="line-clamp-2">{memory.fact}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${categoryColors[memory.category] || 'bg-muted text-muted-foreground'}`}
                        >
                          {memory.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-purple-500"
                              style={{ width: `${memory.importance * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {memory.importance.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {memories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Sparkles className="mb-2 h-8 w-8" />
                  <p>No memories found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="space-y-3">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <button
                  onClick={() => handleExpandConversation(conv.id)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-lg p-2 transition-colors ${expandedConversation === conv.id ? 'bg-purple-500/20 text-purple-500' : 'bg-muted text-muted-foreground'}`}
                    >
                      {expandedConversation === conv.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        @{conv.user?.username || 'unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conv.message_count} messages
                        {conv.title && ` • "${conv.title}"`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleString()}
                  </span>
                </button>
                {expandedConversation === conv.id && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="max-h-96 space-y-3 overflow-auto">
                      {conversationMessages.map((msg: Record<string, unknown>) => (
                        <div
                          key={String(msg.id || msg.created_at)}
                          className={`rounded-xl p-4 ${
                            msg.role === 'user'
                              ? 'ml-8 bg-muted'
                              : 'mr-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10'
                          }`}
                        >
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {msg.role === 'user' ? 'User' : 'Vibe Brain'}
                          </p>
                          <p className="text-sm text-foreground">{String(msg.content)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="mb-2 h-8 w-8" />
                <p>No conversations found</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}
      </div>
    </div>
  );
}
