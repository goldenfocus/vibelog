'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { CommentCardData } from '@/components/home/CommentCard';
import Navigation from '@/components/Navigation';
import { VibesFeedGrid } from '@/components/vibes/VibesFeedGrid';
import { VibesFilterBar } from '@/components/vibes/VibesFilterBar';
import type { CommentFilterType, CommentSortType } from '@/lib/comments';

/**
 * Public Vibes Feed Page
 * Displays all public comments with filtering and sorting capabilities
 */
export default function VibesPage() {
  const [filter, setFilter] = useState<CommentFilterType>('all');
  const [sort, setSort] = useState<CommentSortType>('recent');

  const { data, isLoading, error } = useQuery({
    queryKey: ['vibes-feed'],
    queryFn: async () => {
      const response = await fetch('/api/comments/recent?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch vibes');
      }
      const json = await response.json();
      return json.comments as CommentCardData[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Filter Bar */}
          <VibesFilterBar
            currentFilter={filter}
            currentSort={sort}
            onFilterChange={setFilter}
            onSortChange={setSort}
            totalCount={data?.length}
          />

          {/* Loading State */}
          {isLoading && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-electric" />
                <p className="text-sm text-muted-foreground">Loading vibes...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-lg font-semibold text-destructive">Failed to load vibes</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Something went wrong'}
                </p>
              </div>
            </div>
          )}

          {/* Feed Grid */}
          {data && !isLoading && (
            <VibesFeedGrid initialComments={data} filter={filter} sort={sort} />
          )}
        </div>
      </main>
    </div>
  );
}
