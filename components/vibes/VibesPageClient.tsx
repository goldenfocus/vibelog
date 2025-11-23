'use client';

import { useState } from 'react';

import type { CommentCardData } from '@/components/home/CommentCard';
import { VibesFeedGrid } from '@/components/vibes/VibesFeedGrid';
import { VibesFilterBar } from '@/components/vibes/VibesFilterBar';
import type { CommentFilterType, CommentSortType } from '@/lib/comments';

interface VibesPageClientProps {
  initialComments: CommentCardData[];
}

/**
 * Client-side wrapper for Vibes page with filtering and sorting state
 */
export function VibesPageClient({ initialComments }: VibesPageClientProps) {
  const [filter, setFilter] = useState<CommentFilterType>('all');
  const [sort, setSort] = useState<CommentSortType>('recent');

  return (
    <>
      <VibesFilterBar
        currentFilter={filter}
        currentSort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
        totalCount={initialComments.length}
      />

      <VibesFeedGrid initialComments={initialComments} filter={filter} sort={sort} />
    </>
  );
}
