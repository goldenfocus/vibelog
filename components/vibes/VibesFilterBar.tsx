'use client';

import { MessageCircle, Mic, Sparkles, TrendingUp, Video } from 'lucide-react';

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
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  { value: 'all', label: 'All Vibes', icon: Sparkles, color: 'text-electric' },
  { value: 'voice', label: 'Voice', icon: Mic, color: 'text-blue-400' },
  { value: 'video', label: 'Video', icon: Video, color: 'text-purple-400' },
  { value: 'text', label: 'Text', icon: MessageCircle, color: 'text-green-400' },
];

const SORT_OPTIONS: Array<{
  value: CommentSortType;
  label: string;
  icon: React.ElementType;
}> = [
  { value: 'recent', label: 'Recent', icon: Sparkles },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'popular', label: 'Popular', icon: Sparkles },
];

export function VibesFilterBar({
  currentFilter,
  currentSort,
  onFilterChange,
  onSortChange,
  totalCount,
}: VibesFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recent Vibes</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount !== undefined && `${totalCount.toLocaleString()} vibes • `}
            Join the conversation
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
                {option.label}
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
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Sort dropdown (mobile) */}
      <div className="flex items-center gap-2 sm:hidden">
        <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
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
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
