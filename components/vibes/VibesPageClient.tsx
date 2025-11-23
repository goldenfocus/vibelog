'use client';

import { useState } from 'react';

import type { CommentCardData } from '@/components/home/CommentCard';
import { useI18n } from '@/components/providers/I18nProvider';
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
  const { t } = useI18n();
  const [filter, setFilter] = useState<CommentFilterType>('all');
  const [sort, setSort] = useState<CommentSortType>('recent');

  return (
    <div className="space-y-8">
      {/* Hero Header Section */}
      <div className="mb-12 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="animate-fade-in mb-4 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            {t('pages.vibes.title')}
          </h1>
          <p
            className="animate-fade-in text-xl text-muted-foreground"
            style={{ animationDelay: '100ms' }}
          >
            {initialComments.length > 0
              ? t('pages.vibes.countWithSubtitle', {
                  count: initialComments.length.toLocaleString(),
                })
              : t('pages.vibes.subtitle')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <VibesFilterBar
        currentFilter={filter}
        currentSort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />

      {/* Feed Grid */}
      <VibesFeedGrid initialComments={initialComments} filter={filter} sort={sort} />
    </div>
  );
}
