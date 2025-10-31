# Analytics System

Complete analytics tracking system for VibeLog using PostHog.

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Get your PostHog key from: [posthog.com](https://posthog.com) (Settings > Project API Key)

### 2. Provider Setup

Already configured in `app/layout.tsx`. The `AnalyticsProvider` wraps the entire app.

## Usage

### Basic Event Tracking

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
import { EVENTS } from '@/lib/analytics';

function MyComponent() {
  const { track } = useAnalytics();

  const handleClick = () => {
    track(EVENTS.RECORDING_STARTED, {
      isAnonymous: false,
      remixMode: true,
    });
  };

  return <button onClick={handleClick}>Start Recording</button>;
}
```

### User Identification

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function AuthComponent() {
  const { identify, reset } = useAnalytics();

  const handleLogin = async user => {
    // Identify user after login
    identify({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.subscription_tier,
    });
  };

  const handleLogout = () => {
    // Reset analytics on logout
    reset();
  };
}
```

### Timing Events

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function ProcessingComponent() {
  const { startTiming } = useAnalytics();

  const processFile = async () => {
    const timer = startTiming('file_processing');

    try {
      await processLargeFile();
      timer.end({ success: true, fileSize: 12345 });
    } catch (error) {
      timer.end({ success: false, error: error.message });
    }
  };
}
```

### Page View Tracking

Page views are automatically tracked by the `AnalyticsProvider`. For manual tracking:

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function CustomPageView() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView('/special-page', {
      referrer: document.referrer,
      customProperty: 'value',
    });
  }, []);
}
```

## Available Events

All events are defined in `/lib/analytics.ts`:

### Recording Events

- `RECORDING_STARTED`
- `RECORDING_STOPPED`
- `RECORDING_FAILED`

### Transcription Events

- `TRANSCRIPTION_STARTED`
- `TRANSCRIPTION_COMPLETED`
- `TRANSCRIPTION_FAILED`
- `TRANSCRIPT_EDITED`

### Content Generation

- `VIBELOG_GENERATION_STARTED`
- `VIBELOG_GENERATED`
- `VIBELOG_GENERATION_FAILED`

### User Actions

- `VIBELOG_SAVED`
- `VIBELOG_EDITED`
- `VIBELOG_COPIED`
- `VIBELOG_SHARED`
- `VIBELOG_EXPORTED`

### Publishing

- `PUBLISH_STARTED`
- `PUBLISH_COMPLETED`
- `PUBLISH_FAILED`

### User Auth

- `USER_SIGNED_UP`
- `USER_SIGNED_IN`
- `USER_SIGNED_OUT`

### Monetization

- `UPGRADE_PROMPT_SHOWN`
- `UPGRADE_CLICKED`
- `SUBSCRIPTION_STARTED`

See `/lib/analytics.ts` for the complete list and their property types.

## Event Properties

All events are type-safe. Example:

```typescript
// ✅ Type-safe - TypeScript will validate the properties
track(EVENTS.RECORDING_STARTED, {
  isAnonymous: false,
  remixMode: true,
});

// ❌ TypeScript error - missing required properties
track(EVENTS.RECORDING_STARTED, {
  // isAnonymous is required
});
```

## Adding New Events

1. Add event name to `EVENTS` object in `/lib/analytics.ts`
2. Create interface for event properties (if needed)
3. Add to `EventProperties` union type
4. Use in your component with full type safety

Example:

```typescript
// 1. Add to EVENTS
export const EVENTS = {
  // ... existing events
  MY_NEW_EVENT: 'my_new_event',
} as const;

// 2. Create property interface
export interface MyNewEventProps {
  userId: string;
  actionType: 'click' | 'hover';
  metadata?: Record<string, unknown>;
}

// 3. Add to union type
export type EventProperties =
  | MyNewEventProps // ... other property types
  | Record<string, unknown>;

// 4. Use it
track(EVENTS.MY_NEW_EVENT, {
  userId: '123',
  actionType: 'click',
});
```

## Best Practices

### 1. Track User Journey

Track the complete flow:

```typescript
// Start of flow
track(EVENTS.RECORDING_STARTED, { isAnonymous: false });

// Progress
track(EVENTS.TRANSCRIPTION_COMPLETED, {
  audioDuration: 60,
  transcriptionLength: 500,
  processingTime: 2500,
});

// End of flow
track(EVENTS.VIBELOG_SAVED, {
  vibelogId: 'abc123',
  isAnonymous: false,
  saveTime: 350,
});
```

### 2. Include Context

Always include relevant context:

```typescript
track(EVENTS.VIBELOG_GENERATION_FAILED, {
  error: error.message,
  transcriptionLength: text.length,
  retryCount: 3,
  errorCode: 'RATE_LIMIT',
});
```

### 3. Track Both Success and Failure

```typescript
try {
  const result = await generateVibelog();
  track(EVENTS.VIBELOG_GENERATED, {
    wordCount: result.wordCount,
    processingTime: Date.now() - startTime,
  });
} catch (error) {
  track(EVENTS.VIBELOG_GENERATION_FAILED, {
    error: error.message,
    transcriptionLength: text.length,
  });
}
```

### 4. Don't Track PII

Never track personally identifiable information in event properties:

```typescript
// ❌ BAD - Don't track PII in events
track(EVENTS.USER_SIGNED_UP, {
  email: 'user@example.com', // DON'T DO THIS
  phone: '+1234567890', // DON'T DO THIS
});

// ✅ GOOD - Use user identification instead
identify({
  id: userId,
  email: 'user@example.com', // This is OK in identify()
});
track(EVENTS.USER_SIGNED_UP, {
  signupMethod: 'google',
  referralSource: 'twitter',
});
```

## Testing

Analytics respects the `analytics` feature flag in `lib/config.ts`:

```typescript
// Analytics only runs in production by default
features: {
  analytics: isProd,  // true only in production
}
```

To test analytics in development:

1. Temporarily set `analytics: true` in config
2. Check browser console for PostHog debug logs
3. Verify events in PostHog dashboard

## Performance

- Events are tracked asynchronously and won't block the UI
- Failed tracking won't crash the app
- Analytics errors are logged only in debug mode

## Integration Examples

Integration examples are included throughout this guide. See the "Usage" sections above for step-by-step examples.

## PostHog Features

Beyond event tracking, PostHog provides:

- **Session Recordings**: Visual playback of user sessions
- **Feature Flags**: A/B testing and gradual rollouts
- **Funnels**: Conversion analysis
- **Retention**: User cohort analysis
- **Dashboards**: Custom visualizations

Access these at [app.posthog.com](https://app.posthog.com)
