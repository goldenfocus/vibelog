'use client';

import { useEffect } from 'react';

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Import web-vitals dynamically to avoid bundle bloat
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const metrics: PerformanceMetrics = {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
      };

      const sendToAnalytics = (metric: Record<string, unknown>) => {
        metrics[metric.name.toLowerCase() as keyof PerformanceMetrics] = metric.value;

        // Send to analytics service (PostHog, Google Analytics, etc.)
        if (typeof window !== 'undefined' && (window as Record<string, unknown>).gtag) {
          (window as Record<string, unknown>).gtag('event', metric.name, {
            event_category: 'Web Vitals',
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            event_label: metric.id,
            non_interaction: true,
          });
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${metric.name}:`, metric.value);
        }
      };

      // Measure Core Web Vitals
      getCLS(sendToAnalytics);
      getFID(sendToAnalytics);
      getFCP(sendToAnalytics);
      getLCP(sendToAnalytics);
      getTTFB(sendToAnalytics);

      // Send batch metrics after 5 seconds
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as Record<string, unknown>).posthog) {
          (window as Record<string, unknown>).posthog.capture('performance_metrics', {
            ...metrics,
            user_agent: navigator.userAgent,
            connection_type:
              (navigator as Record<string, unknown>).connection?.effectiveType || 'unknown',
            device_memory: (navigator as Record<string, unknown>).deviceMemory || 'unknown',
          });
        }
      }, 5000);
    });
  }, []);

  return null;
}

// Performance budget checker
export function checkPerformanceBudget(metrics: PerformanceMetrics): boolean {
  const budget = {
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    fcp: 1800, // 1.8s
    ttfb: 800, // 800ms
  };

  return Object.entries(budget).every(([key, limit]) => {
    const value = metrics[key as keyof PerformanceMetrics];
    return value <= limit;
  });
}
