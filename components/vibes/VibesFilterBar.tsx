'use client';

import { MessageCircle, Mic, Sparkles, TrendingUp, Video } from 'lucide-react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useSafeArea } from '@/hooks/useSafeArea';
import type { CommentFilterType, CommentSortType } from '@/lib/comments';
import { triggerHaptic } from '@/lib/mobile/haptics';
import { cn } from '@/lib/utils';

interface VibesFilterBarProps {
  currentFilter: CommentFilterType;
  currentSort: CommentSortType;
  onFilterChange: (filter: CommentFilterType) => void;
  onSortChange: (sort: CommentSortType) => void;
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
  {
    value: 'text',
    labelKey: 'pages.vibes.filters.text',
    icon: MessageCircle,
    color: 'text-green-400',
  },
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
}: VibesFilterBarProps) {
  const { t } = useI18n();
  const { bottom } = useSafeArea();

  return (
    <div className="space-y-6">
      {/* Sort controls (desktop) - centered */}
      <div className="hidden items-center justify-center gap-2 sm:flex">
        {SORT_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = currentSort === option.value;

          return (
            <button
              key={option.value}
              onClick={() => {
                triggerHaptic('LIGHT');
                onSortChange(option.value);
              }}
              className={cn(
                'flex min-h-[56px] touch-manipulation items-center gap-2 rounded-lg px-5 py-3 text-base font-medium transition-all duration-300',
                'active:scale-[0.98]',
                isActive
                  ? 'bg-electric/20 text-electric shadow-sm hover:scale-105'
                  : 'text-muted-foreground hover:scale-105 hover:bg-accent hover:text-foreground active:bg-accent/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Filter chips - centered */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {FILTER_OPTIONS.map(option => {
          const Icon = option.icon;
          const isActive = currentFilter === option.value;

          return (
            <button
              key={option.value}
              onClick={() => {
                triggerHaptic('LIGHT');
                onFilterChange(option.value);
              }}
              className={cn(
                'flex min-h-[56px] touch-manipulation items-center gap-2 rounded-full border px-5 py-3 text-base font-medium transition-all duration-300',
                'active:scale-[0.98]',
                isActive
                  ? 'border-electric/50 bg-electric/10 text-electric shadow-sm shadow-electric/20 hover:scale-105'
                  : 'border-border/40 bg-card/60 text-foreground/70 hover:scale-105 hover:border-electric/30 hover:bg-card hover:text-foreground active:bg-card/80'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? option.color : 'text-muted-foreground')} />
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Sort controls (mobile) - centered */}
      <div
        className="flex flex-col items-center gap-3 sm:hidden"
        style={{ paddingBottom: `calc(0.5rem + ${bottom}px)` }}
      >
        <span className="text-sm font-medium text-muted-foreground">
          {t('pages.vibes.sort.sortBy')}
        </span>
        <div className="flex items-center gap-2">
          {SORT_OPTIONS.map(option => {
            const Icon = option.icon;
            const isActive = currentSort === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  triggerHaptic('LIGHT');
                  onSortChange(option.value);
                }}
                className={cn(
                  'flex min-h-[56px] touch-manipulation items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300',
                  'active:scale-[0.98]',
                  isActive
                    ? 'bg-electric/20 text-electric shadow-sm hover:scale-105'
                    : 'text-muted-foreground hover:scale-105 hover:bg-accent hover:text-foreground active:bg-accent/80'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
