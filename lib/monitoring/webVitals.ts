import posthog from 'posthog-js';
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';

import { config } from '@/lib/config';

type VitalMetric = Metric & { rating?: string };

function sendMetric(metric: VitalMetric) {
  if (!config.features.analytics || !config.features.monitoring) {
    return;
  }

  posthog.capture('web_vital', {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    rating: (metric as any).rating,
    delta: (metric as any).delta,
  });
}

export function startWebVitalsCollection() {
  if (typeof window === 'undefined') {
    return;
  }

  getCLS(sendMetric);
  getFID(sendMetric);
  getFCP(sendMetric);
  getLCP(sendMetric);
  getTTFB(sendMetric);
}
