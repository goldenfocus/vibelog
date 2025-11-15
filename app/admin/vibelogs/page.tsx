'use client';

import { FileText, Search, Edit, Trash2, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Vibelog {
  id: string;
  title: string;
  slug: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    email: string;
  };
}

export default function VibelogsPage() {
  const [vibelogs, setVibelogs] = useState<Vibelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVibelogs();
  }, []);

  const fetchVibelogs = async () => {
    try {
      // We'll need to create this endpoint or use the admin client
      // For now, let's use a direct query approach
      const response = await fetch('/api/vibelogs?admin=true');
      if (!response.ok) {
        throw new Error('Failed to fetch vibelogs');
      }
      const data = await response.json();
      setVibelogs(data.vibelogs || []);
    } catch (error) {
      console.error('Error fetching vibelogs:', error);
      toast.error('Failed to load vibelogs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vibelogId: string, title: string) => {
    if (
      // eslint-disable-next-line no-alert
      !confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)
    ) {
      return;
    }

    setDeletingId(vibelogId);
    try {
      const response = await fetch(`/api/admin/vibelogs/${vibelogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete vibelog');
      }

      toast.success('Vibelog deleted successfully');
      await fetchVibelogs(); // Refresh the list
    } catch (error) {
      console.error('Error deleting vibelog:', error);
      toast.error('Failed to delete vibelog');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVibelogs = vibelogs.filter(vibelog => {
    const query = searchQuery.toLowerCase();
    return (
      vibelog.title.toLowerCase().includes(query) ||
      vibelog.slug.toLowerCase().includes(query) ||
      vibelog.profiles?.display_name?.toLowerCase().includes(query) ||
      vibelog.profiles?.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Vibelogs</h1>
        <p className="text-muted-foreground">Manage all published vibelogs</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, slug, or author..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
          {filteredVibelogs.length} {filteredVibelogs.length === 1 ? 'vibelog' : 'vibelogs'}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Author
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Updated
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVibelogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No vibelogs found</p>
                  </td>
                </tr>
              ) : (
                filteredVibelogs.map(vibelog => (
                  <tr key={vibelog.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{vibelog.title}</div>
                      <div className="text-xs text-muted-foreground">/{vibelog.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {vibelog.profiles?.display_name || 'No name'}
                      </div>
                      <div className="text-xs text-muted-foreground">{vibelog.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(vibelog.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(vibelog.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/${vibelog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          title="View vibelog"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                        <a
                          href={`/${vibelog.slug}?edit=true`}
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          title="Edit vibelog"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </a>
                        <button
                          onClick={() => handleDelete(vibelog.id, vibelog.title)}
                          disabled={deletingId === vibelog.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-background px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                          title="Delete vibelog"
                        >
                          {deletingId === vibelog.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
