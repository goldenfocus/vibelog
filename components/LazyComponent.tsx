'use client';

import { Suspense, lazy, ComponentType, useEffect, useState } from 'react';

interface LazyComponentProps {
  fallback?: React.ReactNode;
  [key: string]: unknown;
}

// Loading fallback component
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
    </div>
  );
}

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: T & LazyComponentProps) {
    return (
      <Suspense fallback={fallback || <DefaultFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Lazy load specific components
export const LazyBlogEditModal = withLazyLoading(
  () => import('@/components/BlogEditModal'),
  <div className="flex items-center justify-center p-4">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
  </div>
);

export const LazyUpgradePrompt = withLazyLoading(
  () => import('@/components/UpgradePrompt'),
  <div className="flex items-center justify-center p-4">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-electric border-t-transparent"></div>
  </div>
);

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}
