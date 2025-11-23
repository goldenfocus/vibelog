'use client';

import { Flame, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CommentCard, type CommentCardData } from '@/components/home/CommentCard';
import { useI18n } from '@/components/providers/I18nProvider';
import { filterCommentsByType, isHotComment, sortComments } from '@/lib/comments';
import type { CommentFilterType, CommentSortType } from '@/lib/comments';
import { cn } from '@/lib/utils';

interface VibesFeedGridProps {
  initialComments: CommentCardData[];
  filter: CommentFilterType;
  sort: CommentSortType;
}

const COMMENTS_PER_PAGE = 24;

export function VibesFeedGrid({ initialComments, filter, sort }: VibesFeedGridProps) {
  const { t } = useI18n();
  const [displayedComments, setDisplayedComments] = useState<CommentCardData[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Filter and sort comments
  const processedComments = sortComments(filterCommentsByType(initialComments, filter), sort);

  // Reset pagination when filter/sort changes
  useEffect(() => {
    setPage(1);
    setDisplayedComments(processedComments.slice(0, COMMENTS_PER_PAGE));
  }, [filter, sort, processedComments]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore) {
          const nextPage = page + 1;
          const startIdx = page * COMMENTS_PER_PAGE;
          const endIdx = nextPage * COMMENTS_PER_PAGE;
          const hasMoreItems = startIdx < processedComments.length;

          if (!hasMoreItems) {
            return;
          }

          setIsLoadingMore(true);

          // Simulate loading delay for smooth UX
          setTimeout(() => {
            const newComments = processedComments.slice(0, endIdx);
            setDisplayedComments(newComments);
            setPage(nextPage);
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [isLoadingMore, page, processedComments]);

  const hasMore = displayedComments.length < processedComments.length;

  if (displayedComments.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/40 p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-electric/10">
          <Flame className="h-8 w-8 text-electric" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{t('pages.vibes.empty.title')}</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {filter !== 'all'
            ? t('pages.vibes.empty.specificFilter', { filter })
            : t('pages.vibes.empty.allFilter')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayedComments.map((comment, index) => (
          <div key={comment.id} className="relative">
            {/* Hot badge */}
            {isHotComment(comment) && (
              <div className="absolute -right-2 -top-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
                <Flame className="h-3 w-3" />
                {t('pages.vibes.hot')}
              </div>
            )}
            <CommentCard comment={comment} index={index} />
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {hasMore && (
        <div
          ref={observerRef}
          className={cn('flex items-center justify-center py-8', isLoadingMore && 'animate-pulse')}
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('pages.vibes.loading.more')}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('pages.vibes.loading.scroll')}</div>
          )}
        </div>
      )}

      {/* End of feed */}
      {!hasMore && displayedComments.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 text-4xl">✨</div>
          <p className="text-sm font-medium text-foreground">{t('pages.vibes.end.title')}</p>
          <p className="text-xs text-muted-foreground">
            {t('pages.vibes.end.count', { count: displayedComments.length })}
          </p>
        </div>
      )}
    </div>
  );
}
