'use client';

import { MessageCircle, Mic, Sparkles, TrendingUp, Video } from 'lucide-react';

import { useI18n } from '@/components/providers/I18nProvider';
import type { CommentFilterType, CommentSortType } from '@/lib/comments';
import { cn } from '@/lib/utils';

interface VibesFilterBarProps {
  currentFilter: CommentFilterType;
  currentSort: CommentSortType;
  onFilterChange: (filter: CommentFilterType) => void;
  onSortChange: (sort: CommentSortType) => void;
  totalCount?: number;
}

const FILTER_OPTIONS: Array<{
  value: CommentFilterType;
  labelKey: string;
  icon: React.ElementType;
  color: string;
}> = [
  { value: 'all', labelKey: 'pages.vibes.filters.all', icon: Sparkles, color: 'text-electric' },
  { value: 'voice', labelKey: 'pages.vibes.filters.voice', icon: Mic, color: 'text-blue-400' },
  { value: 'video', labelKey: 'pages.vibes.filters.video', icon: Video, color: 'text-purple-400' },
  { value: 'text', labelKey: 'pages.vibes.filters.text', icon: MessageCircle, color: 'text-green-400' },
];

const SORT_OPTIONS: Array<{
  value: CommentSortType;
  labelKey: string;
  icon: React.ElementType;
}> = [
  { value: 'recent', labelKey: 'pages.vibes.sort.recent', icon: Sparkles },
  { value: 'trending', labelKey: 'pages.vibes.sort.trending', icon: TrendingUp },
  { value: 'popular', labelKey: 'pages.vibes.sort.popular', icon: Sparkles },
];

export function VibesFilterBar({
  currentFilter,
  currentSort,
  onFilterChange,
  onSortChange,
  totalCount,
}: VibesFilterBarProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.vibes.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount !== undefined
              ? t('pages.vibes.countWithSubtitle', { count: totalCount.toLocaleString() })
              : t('pages.vibes.subtitle')}
          </p>
        </div>

        {/* Sort dropdown (desktop) */}
        <div className="hidden items-center gap-2 sm:flex">
          {SORT_OPTIONS.map(option => {
            const Icon = option.icon;
            const isActive = currentSort === option.value;

            return (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-electric/20 text-electric shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = currentFilter === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'border-electric/50 bg-electric/10 text-electric shadow-sm shadow-electric/20'
                  : 'border-border/40 bg-card/60 text-foreground/70 hover:border-electric/30 hover:bg-card hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? option.color : 'text-muted-foreground')} />
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Sort dropdown (mobile) */}
      <div className="flex items-center gap-2 sm:hidden">
        <span className="text-xs font-medium text-muted-foreground">{t('pages.vibes.sort.sortBy')}</span>
        {SORT_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = currentSort === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-electric/20 text-electric shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-3 w-3" />
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
