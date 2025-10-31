# Monitoring & Observability

> Know what's happening, when it breaks, and why users leave

---

## 🎯 Monitoring Strategy

**Golden Signals**: Latency, Traffic, Errors, Saturation
**User Experience**: Core Web Vitals, conversion funnels, feature adoption
**Business Metrics**: MAU, retention, revenue per user, churn triggers

### Service Level Objectives (SLOs)

```typescript
const serviceLevel = {
  // Availability SLO
  availability: {
    target: '99.9%', // 43 minutes downtime/month
    measurement: 'uptime_checks',
    window: '30_days',
    consequences: 'credits_to_customers',
  },

  // Performance SLOs
  response_time: {
    target: 'p95 < 2s', // 95% requests under 2s
    measurement: 'api_response_time',
    window: '7_days',
    consequences: 'performance_review',
  },

  error_rate: {
    target: '< 0.1%', // Less than 1 error per 1000 requests
    measurement: 'http_5xx_errors',
    window: '24_hours',
    consequences: 'incident_response',
  },

  // User Experience SLOs
  core_web_vitals: {
    lcp_target: '< 2.5s', // Largest Contentful Paint
    fid_target: '< 100ms', // First Input Delay
    cls_target: '< 0.1', // Cumulative Layout Shift
    measurement: 'real_user_monitoring',
  },
};

// Service Level Indicators (SLIs)
const serviceIndicators = {
  // Infrastructure SLIs
  uptime: 'successful_health_checks / total_health_checks',
  latency: 'requests_under_2s / total_requests',
  throughput: 'successful_requests_per_second',

  // Application SLIs
  recording_success: 'successful_recordings / total_recording_attempts',
  transcription_accuracy: 'user_approved_transcripts / total_transcripts',
  publish_success: 'successful_publishes / total_publish_attempts',

  // Business SLIs
  user_satisfaction: 'nps_score_above_7 / total_nps_responses',
  feature_adoption: 'users_using_feature / total_active_users',
  conversion_rate: 'trial_to_paid_conversions / trial_signups',
};
```

---

## 📊 Error Tracking

### Sentry Configuration

```typescript
// sentry.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  beforeSend: event => {
    // Filter out noise
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null;
    }
    return event;
  },
  beforeBreadcrumb: breadcrumb => {
    // Don't log sensitive data
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }
    return breadcrumb;
  },
});
```

### Error Categorization

```typescript
const errorCategories = {
  // User-facing errors
  RECORDING_FAILED: { level: 'error', notify: true },
  TRANSCRIPTION_TIMEOUT: { level: 'warning', notify: false },
  PUBLISH_FAILED: { level: 'error', notify: true },

  // System errors
  DATABASE_CONNECTION: { level: 'critical', notify: true },
  AI_SERVICE_DOWN: { level: 'error', notify: true },
  RATE_LIMIT_EXCEEDED: { level: 'warning', notify: false },

  // Performance issues
  SLOW_QUERY: { level: 'warning', notify: false },
  HIGH_MEMORY_USAGE: { level: 'warning', notify: false },
};
```

### Custom Error Context

```typescript
// Add context to errors
Sentry.withScope(scope => {
  scope.setUser({ id: user.id, email: user.email });
  scope.setTag('feature', 'voice-recording');
  scope.setContext('vibelog', {
    id: vibelogId,
    duration: recordingDuration,
    fileSize: audioFileSize,
  });
  Sentry.captureException(error);
});
```

---

## 📈 Performance Monitoring

### Core Web Vitals

```typescript
// web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric: any) => {
  // Send to multiple services
  gtag('event', metric.name, {
    event_category: 'Web Vitals',
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_label: metric.id,
    non_interaction: true,
  });

  // Also send to PostHog for analysis
  posthog.capture('web_vital', {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Performance Budget

```typescript
const performanceBudgets = {
  // Page load
  firstContentfulPaint: 1800, // ms
  largestContentfulPaint: 2500,
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100,

  // API responses
  voiceTranscription: 3000,
  contentGeneration: 5000,
  imageGeneration: 8000,

  // Bundle sizes
  mainBundle: 200, // KB
  chunkSize: 50,
  totalJavaScript: 400,
};
```

### Real User Monitoring

```typescript
// RUM data collection
const trackPerformance = () => {
  // Navigation timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  posthog.capture('page_performance', {
    dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
    connection_time: navigation.connectEnd - navigation.connectStart,
    request_time: navigation.responseStart - navigation.requestStart,
    download_time: navigation.responseEnd - navigation.responseStart,
    dom_processing: navigation.domContentLoadedEventStart - navigation.responseEnd,
    load_complete: navigation.loadEventEnd - navigation.loadEventStart,
  });

  // Resource timing
  const resources = performance.getEntriesByType('resource');
  resources.forEach(resource => {
    if (resource.duration > 1000) {
      // Slow resources
      posthog.capture('slow_resource', {
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize,
      });
    }
  });
};
```

---

## 📊 Business Metrics & Analytics

### User Journey Tracking

```typescript
// Key conversion funnels
const funnels = {
  onboarding: [
    'landing_page_view',
    'signup_started',
    'signup_completed',
    'first_recording_started',
    'first_vibelog_created',
    'first_vibelog_published',
  ],

  retention: [
    'day_1_return',
    'day_7_return',
    'day_30_return',
    'second_vibelog_created',
    'became_power_user', // 10+ vibelogs
  ],

  monetization: [
    'free_limit_reached',
    'upgrade_prompt_shown',
    'upgrade_started',
    'payment_completed',
    'became_paying_user',
  ],
};
```

### Feature Adoption

```typescript
const featureTracking = {
  // Core features
  voice_recording: ['started', 'completed', 'failed'],
  ai_generation: ['requested', 'completed', 'edited'],
  publishing: ['shared_link', 'exported_markdown', 'posted_social'],

  // Advanced features
  custom_prompts: ['created', 'used', 'shared'],
  batch_processing: ['started', 'completed'],
  team_collaboration: ['invited_member', 'shared_vibelog'],
};
```

### Cohort Analysis

```typescript
// Track user behavior by cohort
const cohortMetrics = {
  retention: {
    day_1: 0.6, // 60% return next day
    day_7: 0.3, // 30% return after week
    day_30: 0.15, // 15% return after month
  },

  usage: {
    vibelogs_per_week: 2.5,
    avg_session_duration: 480, // seconds
    features_discovered: 3.2,
  },

  conversion: {
    free_to_trial: 0.08, // 8% start trial
    trial_to_paid: 0.25, // 25% convert to paid
    annual_upgrade: 0.4, // 40% upgrade to annual
  },
};
```

---

## 🚨 Alerting & Incident Response

### Alert Configuration

```typescript
const alerts = {
  // Critical - Page immediately
  critical: {
    error_rate: { threshold: '5%', window: '5m' },
    response_time_p95: { threshold: '5s', window: '5m' },
    database_down: { threshold: '1 failure', window: '1m' },
    payment_failures: { threshold: '10%', window: '10m' },
  },

  // High - Notify within 15 minutes
  high: {
    error_rate: { threshold: '2%', window: '15m' },
    ai_service_errors: { threshold: '10%', window: '10m' },
    signup_drop: { threshold: '50% below avg', window: '1h' },
  },

  // Medium - Daily digest
  medium: {
    performance_degradation: { threshold: '20% slower', window: '1h' },
    feature_adoption_drop: { threshold: '30% below avg', window: '1d' },
    churn_increase: { threshold: '2x normal', window: '1d' },
  },
};
```

### Incident Runbooks

```yaml
# incidents/recording-failures.yml
name: 'High Recording Failure Rate'
trigger: 'Recording success rate < 95% for 10 minutes'
priority: 'high'
steps:
  - name: 'Check browser support'
    action: 'Review MediaRecorder compatibility logs'
  - name: 'Verify microphone permissions'
    action: 'Check permission denial rates by browser'
  - name: 'Inspect audio processing'
    action: 'Review WebAudio API error logs'
  - name: 'Escalate if unresolved'
    action: 'Page on-call engineer after 30 minutes'
```

### On-Call Rotation

```typescript
const onCallSchedule = {
  primary: 'engineer-1',
  secondary: 'engineer-2',
  escalation: 'tech-lead',

  rotation: 'weekly', // Sunday to Sunday
  handoff_time: '09:00 UTC',

  responsibilities: [
    'Respond to critical alerts within 15 minutes',
    'Resolve P0 incidents within 2 hours',
    'Update status page during outages',
    'Post incident retrospectives within 48 hours',
  ],
};
```

---

## 📱 User Experience Monitoring

### Session Recording

```typescript
// LogRocket/FullStory configuration
const sessionRecording = {
  // Only record opted-in users
  shouldRecord: (user: User) => {
    return user.analyticsConsent && !user.isInternal;
  },

  // Mask sensitive data
  maskInputs: ['password', 'email', 'phone'],
  maskElements: ['.sensitive', '[data-private]'],

  // Capture errors and rage clicks
  captureErrors: true,
  captureRageClicks: true,
  captureDeadClicks: true,
};
```

### User Feedback Integration

```typescript
// Integrate feedback with monitoring
const feedbackTracking = {
  // NPS/CSAT scores
  satisfaction: {
    trigger: 'after_vibelog_creation',
    frequency: 'monthly',
    followup: 'if_score_below_7',
  },

  // Feature requests
  feature_requests: {
    source: ['intercom', 'typeform', 'github_issues'],
    categorization: 'auto_tag_with_ai',
    prioritization: 'impact_effort_matrix',
  },

  // Bug reports
  bug_reports: {
    auto_attach: ['console_logs', 'network_logs', 'user_session'],
    severity: 'user_reported_impact',
    routing: 'based_on_component_tags',
  },
};
```

---

## 🔍 Log Management

### Structured Logging

```typescript
// logger.ts
interface LogContext {
  requestId: string;
  userId?: string;
  vibelogId?: string;
  feature?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...context,
      })
    );
  },

  error: (message: string, error: Error, context?: LogContext) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...context,
      })
    );
  },
};
```

### Log Aggregation

```typescript
const logConfig = {
  // Ship logs to multiple destinations
  destinations: [
    'vercel_logs', // Built-in for Next.js
    'datadog', // APM and log analysis
    'sentry', // Error aggregation
    'posthog', // User behavior
  ],

  // Log levels by environment
  levels: {
    development: 'debug',
    staging: 'info',
    production: 'warn',
  },

  // Retention policies
  retention: {
    error_logs: '90d',
    performance_logs: '30d',
    user_behavior: '365d',
  },
};
```

---

## 📊 Dashboards & Visualization

### Executive Dashboard

```typescript
const executiveDashboard = {
  // Top-line metrics
  kpis: [
    'monthly_active_users',
    'monthly_recurring_revenue',
    'customer_acquisition_cost',
    'lifetime_value',
    'churn_rate',
  ],

  // Health indicators
  health: ['system_uptime', 'error_rate', 'customer_satisfaction', 'support_ticket_volume'],

  // Trends
  trends: ['user_growth_rate', 'feature_adoption', 'revenue_growth', 'market_expansion'],
};
```

### Engineering Dashboard

```typescript
const engineeringDashboard = {
  // System health
  infrastructure: [
    'response_times',
    'error_rates_by_endpoint',
    'database_performance',
    'queue_depths',
    'cache_hit_rates',
  ],

  // Application metrics
  application: ['feature_usage', 'conversion_funnels', 'user_journeys', 'a_b_test_results'],

  // Developer productivity
  engineering: [
    'deployment_frequency',
    'lead_time_for_changes',
    'mean_time_to_recovery',
    'change_failure_rate',
  ],
};
```

---

## 🔧 Implementation Checklist

### Monitoring Setup

- [ ] Sentry error tracking configured
- [ ] Performance monitoring active
- [ ] User analytics implemented
- [ ] Alerting rules defined
- [ ] Dashboards created
- [ ] Log aggregation working
- [ ] On-call rotation scheduled

### Data Privacy

- [ ] GDPR compliance for analytics
- [ ] User consent mechanisms
- [ ] Data retention policies
- [ ] PII masking in logs
- [ ] Right to deletion implemented

### Testing

- [ ] Monitoring alerts tested
- [ ] Dashboard accuracy verified
- [ ] Log parsing validated
- [ ] Performance budgets enforced
- [ ] Error tracking coverage confirmed

---

**See also**: `api.md` for API-specific monitoring patterns, `engineering.md` for testing integration, `deployment.md` for incident response, `pivot.md` for success metrics alignment
