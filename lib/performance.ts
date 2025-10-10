/**
 * Performance optimization utilities for VibeLog
 */

// Debounce function for performance
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for performance
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoization for expensive calculations
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Request idle callback polyfill
export function requestIdleCallback(
  callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback for browsers that don't support requestIdleCallback
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 5, // Assume 5ms remaining
    });
  }, 1);
}

// Cancel idle callback polyfill
export function cancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

// Performance budget checker
export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  lcp: 2500, // 2.5s
  fid: 100, // 100ms
  cls: 0.1, // 0.1
  fcp: 1800, // 1.8s
  ttfb: 800, // 800ms
};

export function checkPerformanceBudget(metrics: Partial<PerformanceBudget>): boolean {
  return Object.entries(PERFORMANCE_BUDGET).every(([key, limit]) => {
    const value = metrics[key as keyof PerformanceBudget];
    return value === undefined || value <= limit;
  });
}

// Bundle size analyzer
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle Analysis:');
    console.log(
      '- Main bundle:',
      performance.getEntriesByType('navigation')[0]?.transferSize || 'N/A'
    );
    console.log(
      '- Scripts:',
      performance
        .getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
        .reduce((total, entry) => total + (entry.transferSize || 0), 0)
    );
    console.log(
      '- Stylesheets:',
      performance
        .getEntriesByType('resource')
        .filter(entry => entry.name.includes('.css'))
        .reduce((total, entry) => total + (entry.transferSize || 0), 0)
    );
  }
}

// Image optimization helper
export function getOptimizedImageUrl(
  src: string,
  width: number,
  _height?: number,
  _quality: number = 85
): string {
  // If it's already an optimized URL, return as is
  if (src.includes('w_') || src.includes('h_') || src.includes('q_')) {
    return src;
  }

  // For external images, you might want to use a service like Cloudinary or ImageKit
  // For now, return the original src
  return src;
}

// Preload critical resources
export function preloadCriticalResources(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const criticalResources = [
    { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2' },
    { href: '/og-image.png', as: 'image' },
  ];

  criticalResources.forEach(({ href, as, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) {
      link.type = type;
    }
    if (as === 'font') {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}
