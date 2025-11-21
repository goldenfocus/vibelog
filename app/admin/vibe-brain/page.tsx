'use client';

import {
  Brain,
  Settings2,
  MessageSquare,
  Sparkles,
  BarChart3,
  RefreshCw,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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

  // Config editing
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleSaveConfig = async (key: string) => {
    setSaving(true);
    try {
      const parsed = JSON.parse(editValue);
      const res = await fetch('/api/admin/vibe-brain/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: parsed }),
      });

      if (res.ok) {
        await fetchConfigs();
        setEditingConfig(null);
      } else {
        setError('Failed to save configuration');
      }
    } catch {
      setError('Invalid JSON format');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-3">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vibe Brain Admin</h1>
            <p className="text-sm text-muted-foreground">
              Manage AI configuration, memories, and conversations
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/80"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Conversations', value: stats.overview.conversations },
                { label: 'Messages', value: stats.overview.messages },
                { label: 'Memories', value: stats.overview.memories },
                { label: 'Embeddings', value: stats.overview.embeddings },
                { label: 'Unique Users', value: stats.overview.uniqueUsers },
                { label: 'Total Cost', value: `$${stats.overview.totalCost.toFixed(3)}` },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Messages by Day */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">Messages (Last 7 Days)</h3>
                <div className="flex h-32 items-end gap-1">
                  {Object.entries(stats.messagesByDay)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([day, count]) => {
                      const max = Math.max(...Object.values(stats.messagesByDay));
                      const height = max > 0 ? (count / max) * 100 : 0;
                      return (
                        <div key={day} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-purple-500"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-muted-foreground">{day.slice(5)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Memory Categories */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">Memory Categories</h3>
                <div className="space-y-2">
                  {Object.entries(stats.memoryCategoryCounts).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-muted-foreground">{category}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            {configs.map(config => (
              <div key={config.id} className="rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between border-b border-border p-4">
                  <div>
                    <h3 className="font-semibold capitalize text-foreground">
                      {config.key.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated: {new Date(config.updated_at).toLocaleString()}
                    </p>
                  </div>
                  {editingConfig === config.key ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveConfig(config.key)}
                        disabled={saving}
                        className="flex items-center gap-1 rounded bg-purple-500 px-3 py-1.5 text-sm text-white hover:bg-purple-600"
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingConfig(null)}
                        className="rounded bg-muted px-3 py-1.5 text-sm hover:bg-muted/80"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingConfig(config.key);
                        setEditValue(JSON.stringify(config.value, null, 2));
                      }}
                      className="rounded bg-muted px-3 py-1.5 text-sm hover:bg-muted/80"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {editingConfig === config.key ? (
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="h-64 w-full rounded-lg border border-border bg-background p-3 font-mono text-sm"
                    />
                  ) : (
                    <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-sm">
                      {JSON.stringify(config.value, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Memories Tab */}
        {activeTab === 'memories' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border">
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
                    <tr key={memory.id} className="hover:bg-muted/30">
                      <td className="max-w-md truncate px-4 py-3 text-sm text-foreground">
                        {memory.fact}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs capitalize text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {memory.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {memory.importance.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteMemory(memory.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {memories.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">No memories found</div>
              )}
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="space-y-2">
            {conversations.map(conv => (
              <div key={conv.id} className="rounded-lg border border-border bg-card">
                <button
                  onClick={() => handleExpandConversation(conv.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    {expandedConversation === conv.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        @{conv.user?.username || 'unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">{conv.message_count} messages</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleString()}
                  </span>
                </button>
                {expandedConversation === conv.id && (
                  <div className="border-t border-border p-4">
                    <div className="max-h-96 space-y-3 overflow-auto">
                      {conversationMessages.map((msg: Record<string, unknown>) => (
                        <div
                          key={String(msg.id || msg.created_at)}
                          className={`rounded-lg p-3 ${
                            msg.role === 'user' ? 'bg-muted' : 'bg-purple-50 dark:bg-purple-900/20'
                          }`}
                        >
                          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                            {String(msg.role)}
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
              <div className="p-8 text-center text-muted-foreground">No conversations found</div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
