import posthog from 'posthog-js';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

import { config } from '@/lib/config';

function sendMetric(metric: Metric) {
  if (!config.features.analytics || !config.features.monitoring) {
    return;
  }

  posthog.capture('web_vital', {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
  });
}

export function startWebVitalsCollection() {
  if (typeof window === 'undefined') {
    return;
  }

  // Web Vitals v5 API - INP replaced FID
  onCLS(sendMetric);
  onINP(sendMetric);
  onFCP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);
}
