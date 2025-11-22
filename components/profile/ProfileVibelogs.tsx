'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VibelogCard from '@/components/VibelogCard';

interface Vibelog {
  id: string;
  title: string;
  slug: string;
  content: string;
  teaser?: string;
  audio_url?: string;
  audio_duration?: number;
  cover_image_url?: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  comment_count: number;
  read_time: number;
  word_count: number;
  tags?: string[];
}

type SortOption = 'recent' | 'popular' | 'longest' | 'shortest';

export function ProfileVibelogs({
  vibelogs,
  username,
  displayName,
  avatarUrl,
}: {
  vibelogs: Vibelog[];
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Add author info to each vibelog for the card
  const vibelogsWithAuthor = vibelogs.map(vibelog => ({
    ...vibelog,
    teaser: vibelog.teaser || vibelog.content,
    cover_image_url: vibelog.cover_image_url ?? null,
    comment_count: vibelog.comment_count ?? 0,
    author: {
      username,
      display_name: displayName,
      avatar_url: avatarUrl || null,
    },
  }));

  // Filter and sort vibelogs
  const filteredVibelogs = useMemo(() => {
    let filtered = vibelogsWithAuthor;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        v =>
          v.title.toLowerCase().includes(query) ||
          v.content.toLowerCase().includes(query) ||
          (v.teaser && v.teaser.toLowerCase().includes(query)) ||
          v.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'recent':
        sorted.sort(
          (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        break;
      case 'popular':
        sorted.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'longest':
        sorted.sort((a, b) => b.word_count - a.word_count);
        break;
      case 'shortest':
        sorted.sort((a, b) => a.word_count - b.word_count);
        break;
    }

    return sorted;
  }, [vibelogsWithAuthor, searchQuery, sortBy]);

  if (vibelogsWithAuthor.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 text-xl font-semibold">No vibelogs yet</h3>
        <p className="text-muted-foreground">
          {displayName} hasn&apos;t published any vibelogs yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">
          Vibelogs <span className="text-muted-foreground">({vibelogsWithAuthor.length})</span>
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search bar */}
          <div className="relative flex-1 sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('placeholders.searchVibelogs')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Sort
          </Button>
        </div>
      </div>

      {/* Sort options (collapsible on mobile) */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4 animate-in fade-in-50 slide-in-from-top-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Sort by</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'recent', label: 'Most Recent' },
                { value: 'popular', label: 'Most Popular' },
                { value: 'longest', label: 'Longest' },
                { value: 'shortest', label: 'Shortest' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as SortOption)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    sortBy === option.value
                      ? 'bg-electric text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results info */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          {filteredVibelogs.length === 0 ? (
            <p>No vibelogs found matching &quot;{searchQuery}&quot;</p>
          ) : (
            <p>
              Found {filteredVibelogs.length} vibelog{filteredVibelogs.length !== 1 ? 's' : ''}{' '}
              matching &quot;
              {searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      {/* Vibelogs grid */}
      {filteredVibelogs.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVibelogs.map((vibelog, index) => (
            <div
              key={vibelog.id}
              className="animate-in fade-in-50 slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
            >
              <VibelogCard vibelog={vibelog} />
            </div>
          ))}
        </div>
      ) : (
        searchQuery && (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No vibelogs match your search. Try different keywords.
            </p>
            <Button onClick={() => setSearchQuery('')} variant="outline" className="mt-4">
              Clear search
            </Button>
          </div>
        )
      )}
    </div>
  );
}
