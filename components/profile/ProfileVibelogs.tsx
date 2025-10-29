'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

import VibelogCard from '@/components/VibelogCard';

interface VibelogWithoutAuthor {
  id: string;
  title: string;
  slug?: string | null;
  content: string;
  teaser?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  cover_image_url?: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  word_count: number;
  tags?: string[] | null;
}

interface ProfileVibelogsProps {
  vibelogs: VibelogWithoutAuthor[];
  username: string;
  displayName: string;
}

type SortOption = 'recent' | 'popular' | 'longest' | 'shortest';

export function ProfileVibelogs({ vibelogs, username, displayName }: ProfileVibelogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort vibelogs
  const filteredVibelogs = useMemo(() => {
    let filtered = vibelogs;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        vibelog =>
          vibelog.title.toLowerCase().includes(query) ||
          vibelog.content.toLowerCase().includes(query) ||
          vibelog.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
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
        sorted.sort((a, b) => b.read_time - a.read_time);
        break;
      case 'shortest':
        sorted.sort((a, b) => a.read_time - b.read_time);
        break;
    }

    return sorted;
  }, [vibelogs, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Vibelogs</h2>
          <p className="mt-1 text-muted-foreground">
            {filteredVibelogs.length === vibelogs.length
              ? `${vibelogs.length} ${vibelogs.length === 1 ? 'vibelog' : 'vibelogs'}`
              : `${filteredVibelogs.length} of ${vibelogs.length} vibelogs`}
          </p>
        </div>

        {/* Filter toggle button - mobile */}
        {vibelogs.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-surface/50 flex items-center gap-2 rounded-xl border border-border/50 px-4 py-2 text-sm text-muted-foreground transition-all hover:border-electric/30 hover:text-foreground sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {vibelogs.length > 0 && (
        <div
          className={`${
            showFilters ? 'flex' : 'hidden sm:flex'
          } animate-fadeInUp flex-col gap-4 sm:flex-row`}
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vibelogs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-surface/50 w-full rounded-xl border border-border/50 py-3 pl-12 pr-4 text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground focus:border-electric/50 focus:outline-none focus:ring-2 focus:ring-electric/30"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="bg-surface/50 min-w-[160px] cursor-pointer appearance-none rounded-xl border border-border/50 px-4 py-3 text-foreground backdrop-blur-sm transition-all focus:border-electric/50 focus:outline-none focus:ring-2 focus:ring-electric/30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
            }}
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="longest">Longest Read</option>
            <option value="shortest">Shortest Read</option>
          </select>
        </div>
      )}

      {/* Vibelogs Grid */}
      {filteredVibelogs.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredVibelogs.map((vibelog, index) => (
            <div
              key={vibelog.id}
              className="animate-fadeInUp"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <VibelogCard
                vibelog={{
                  ...vibelog,
                  teaser: vibelog.teaser || vibelog.content.substring(0, 200),
                  cover_image_url: vibelog.cover_image_url ?? null,
                  author: {
                    username,
                    display_name: displayName,
                    avatar_url: '', // Avatar already shown in profile header
                  },
                }}
              />
            </div>
          ))}
        </div>
      ) : vibelogs.length === 0 ? (
        <div className="py-16 text-center">
          <div className="bg-surface/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No vibelogs yet</h3>
          <p className="mx-auto max-w-md text-muted-foreground">
            {displayName} hasn&apos;t published any vibelogs yet. Check back later!
          </p>
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="bg-surface/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No results found</h3>
          <p className="mx-auto max-w-md text-muted-foreground">
            Try adjusting your search query or filters
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSortBy('recent');
            }}
            className="mt-4 rounded-lg border border-electric/30 bg-electric/10 px-4 py-2 text-electric transition-all hover:bg-electric/20"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
