'use client';

import { ArrowDown, ArrowUp, Flame, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CommentCard, type CommentCardData } from '@/components/home/CommentCard';
import { useI18n } from '@/components/providers/I18nProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSafeArea } from '@/hooks/useSafeArea';
import { filterCommentsByType, isHotComment, sortComments } from '@/lib/comments';
import type { CommentFilterType, CommentSortType } from '@/lib/comments';
import { triggerHaptic } from '@/lib/mobile/haptics';
import { cn } from '@/lib/utils';

interface VibesFeedGridProps {
  initialComments: CommentCardData[];
  filter: CommentFilterType;
  sort: CommentSortType;
}

const COMMENTS_PER_PAGE = 24;

// Skeleton loading card
function SkeletonCard() {
  return (
    <div className="h-[280px] w-full animate-pulse rounded-2xl border border-border/40 bg-card/40 p-4">
      <div className="mb-3 h-4 w-3/4 rounded bg-muted" />
      <div className="mb-2 h-3 w-full rounded bg-muted" />
      <div className="mb-2 h-3 w-5/6 rounded bg-muted" />
      <div className="mt-4 h-20 w-full rounded bg-muted" />
      <div className="mt-auto flex items-center gap-2 pt-4">
        <div className="h-8 w-8 rounded-full bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

export function VibesFeedGrid({ initialComments, filter, sort }: VibesFeedGridProps) {
  const { t } = useI18n();
  const { bottom } = useSafeArea();
  const [displayedComments, setDisplayedComments] = useState<CommentCardData[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Pull to refresh
  const { isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh: async () => {
      triggerHaptic('MEDIUM');
      // Reset to first page
      setPage(1);
      setDisplayedComments(processedComments.slice(0, COMMENTS_PER_PAGE));
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 500));
    },
  });

  // Filter and sort comments
  const processedComments = sortComments(filterCommentsByType(initialComments, filter), sort);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset pagination when filter/sort changes
  useEffect(() => {
    setIsFilterChanging(true);
    const timer = setTimeout(() => {
      setPage(1);
      setDisplayedComments(processedComments.slice(0, COMMENTS_PER_PAGE));
      setIsFilterChanging(false);
    }, 200);

    return () => clearTimeout(timer);
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
    <div className="space-y-8" style={{ paddingBottom: `calc(1rem + ${bottom}px)` }}>
      {/* Pull to refresh indicator */}
      {(isRefreshing || pullDistance > 0) && (
        <div
          className="fixed left-0 right-0 top-16 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all"
          style={{
            height: isRefreshing ? '60px' : `${pullDistance}px`,
            opacity: isRefreshing ? 1 : progress,
            pointerEvents: pullDistance > 20 || isRefreshing ? 'auto' : 'none',
          }}
        >
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-sm font-medium text-electric">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('pages.vibes.refreshing')}
            </div>
          ) : (
            <ArrowDown
              className="h-5 w-5 text-electric transition-transform"
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
          )}
        </div>
      )}

      {/* Grid */}
      <div
        key={`${filter}-${sort}`}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {isFilterChanging
          ? Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={`skeleton-${index}`} />)
          : displayedComments.map((comment, index) => (
              <div
                key={comment.id}
                className="animate-fade-in relative"
                style={{
                  animationDelay: `${(index % COMMENTS_PER_PAGE) * 30}ms`,
                  animationFillMode: 'backwards',
                }}
              >
                {/* Hot badge */}
                {isHotComment(comment) && (
                  <div className="absolute -right-2 -top-2 z-10 flex animate-pulse items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
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

      {/* Scroll to top FAB */}
      {showScrollTop && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            triggerHaptic('LIGHT');
          }}
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-electric shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 sm:bottom-8"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}
