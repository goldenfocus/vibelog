# Structured Logging Migration Guide

## Overview

This guide shows how to migrate from `console.log()` calls to structured logging with our new logging infrastructure.

**Benefits:**

- ✅ Structured, searchable logs
- ✅ Automatic context injection (user ID, request ID, environment)
- ✅ Production-ready JSON format
- ✅ Client-side error tracking
- ✅ Performance metrics
- ✅ Log levels for filtering

---

## Installation

The logging infrastructure is already set up. No additional dependencies needed!

**Files:**

- `lib/logger.ts` - Server-side logger
- `lib/client-logger.ts` - Client-side logger (React components)
- `app/api/logs/route.ts` - Client log collection endpoint

---

## Usage Examples

### Server-Side Logging (API Routes, Server Components)

```typescript
import { logger, createApiLogger } from '@/lib/logger';

// Basic logging
logger.info('User profile updated', { userId: '123', field: 'avatar' });
logger.warn('Rate limit approaching', { remaining: 5 });
logger.error('Database connection failed', { error: dbError });

// API route with request context
export async function POST(request: NextRequest) {
  const apiLogger = createApiLogger(
    request.headers.get('x-request-id') || undefined,
    userId
  );

  apiLogger.info('Processing request', { endpoint: '/api/generate-vibelog' });

  try {
    // ... your code
    apiLogger.info('Request completed', { duration: '1.2s' });
  } catch (error) {
    apiLogger.error('Request failed', { error });
  }
}

// Performance tracking
await logger.time('AI generation', async () => {
  return await openai.chat.completions.create(...);
});
// Outputs: "AI generation completed" with duration
```

### Client-Side Logging (React Components)

```typescript
'use client';

import { useLogger } from '@/lib/client-logger';

function MyComponent() {
  const log = useLogger('MyComponent');

  const handleSubmit = async () => {
    log.info('Form submitted', { formType: 'contact' });

    try {
      const result = await submitForm();
      log.info('Form submission successful', { resultId: result.id });
    } catch (error) {
      log.error('Form submission failed', error, { formType: 'contact' });
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Non-React Client Code

```typescript
import { createClientLogger } from '@/lib/client-logger';

const log = createClientLogger('AudioEngine');

export class AudioEngine {
  start() {
    log.info('Audio engine started', { sampleRate: 48000 });
  }

  stop() {
    log.info('Audio engine stopped');
  }

  onError(error: Error) {
    log.error('Audio engine error', error);
  }
}
```

---

## Migration Patterns

### Pattern 1: Simple console.log → logger.info

**Before:**

```typescript
console.log('Generating vibelog from transcription:', transcription.substring(0, 100) + '...');
console.log('Target language:', languageName, `(${targetLanguage})`);
console.log('Selected tone:', selectedTone);
```

**After:**

```typescript
import { logger } from '@/lib/logger';

logger.info('Generating vibelog from transcription', {
  transcriptionPreview: transcription.substring(0, 100),
  targetLanguage,
  languageName,
  selectedTone,
});
```

**Benefits:**

- Structured data (easily searchable)
- Single log entry instead of three
- Consistent format

### Pattern 2: Debug Logging

**Before:**

```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log('Debug info:', someVariable);
}
```

**After:**

```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug info', { someVariable });
// Automatically filtered out in production if log level is INFO or higher
```

### Pattern 3: Error Logging

**Before:**

```typescript
console.error('Profile fetch error:', fetchError);
console.warn('Profile fetch error:', fetchError);
console.log('No profile found (normal for new users)');
```

**After:**

```typescript
import { logger } from '@/lib/logger';

if (fetchError.code === 'PGRST116') {
  logger.info('No profile found for new user', { userId, code: fetchError.code });
} else if (fetchError.code === '42501' || fetchError.code === 'PGRST204') {
  logger.warn('Profile restricted by RLS', { userId, code: fetchError.code });
} else {
  logger.error('Profile fetch error', { userId, error: fetchError });
}
```

### Pattern 4: Mock/Development Logging

**Before:**

```typescript
console.log('🧪 Using mock vibelog generation for development/testing');
```

**After:**

```typescript
import { logger } from '@/lib/logger';

logger.debug('Using mock vibelog generation', { reason: 'no API key' });
```

### Pattern 5: API Route Logging

**Before:**

```typescript
export async function POST(request: NextRequest) {
  console.log('Generating vibelog from transcription:', ...);

  try {
    const result = await openai.create(...);
    console.log('Generation complete');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Vibelog generation error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**After:**

```typescript
import { createApiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const apiLogger = createApiLogger();

  apiLogger.info('Starting vibelog generation', {
    transcriptionLength: transcription.length,
    targetLanguage,
    selectedTone
  });

  try {
    const result = await apiLogger.time('OpenAI generation', async () => {
      return await openai.create(...);
    });

    apiLogger.info('Generation complete', {
      contentLength: result.content.length
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error('Vibelog generation failed', { error });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Pattern 6: React Component Logging

**Before:**

```typescript
function MicRecorder() {
  const handleStart = () => {
    console.log('Recording started');
  };

  const handleError = (error: Error) => {
    console.error('Recording error:', error);
  };
}
```

**After:**

```typescript
import { useLogger } from '@/lib/client-logger';

function MicRecorder() {
  const log = useLogger('MicRecorder');

  const handleStart = () => {
    log.info('Recording started', { timestamp: Date.now() });
  };

  const handleError = (error: Error) => {
    log.error('Recording error', error);
    // Automatically sent to backend for tracking
  };
}
```

---

## Log Levels Guide

Choose the appropriate log level:

| Level     | When to Use                          | Production         |
| --------- | ------------------------------------ | ------------------ |
| **TRACE** | Extremely detailed debugging         | ❌ Never shown     |
| **DEBUG** | Development debugging, verbose info  | ❌ Filtered out    |
| **INFO**  | Important state changes, milestones  | ✅ Shown           |
| **WARN**  | Recoverable errors, deprecated usage | ✅ Shown           |
| **ERROR** | Errors that need attention           | ✅ Shown + Tracked |
| **FATAL** | System-critical errors               | ✅ Shown + Alerted |

**Examples:**

```typescript
logger.trace('Function called', { args }); // Too verbose for most cases
logger.debug('Cache miss', { key }); // Development only
logger.info('User logged in', { userId }); // Important event
logger.warn('API rate limit at 80%', { remaining: 200 }); // Potential issue
logger.error('Payment processing failed', { error, orderId }); // Needs investigation
logger.fatal('Database connection lost', { error }); // Critical system failure
```

---

## Migration Checklist

Use this checklist to migrate a file:

### For API Routes

- [ ] Import logger: `import { createApiLogger } from '@/lib/logger';`
- [ ] Create API logger instance with request context
- [ ] Replace all `console.log` with `logger.info` or `logger.debug`
- [ ] Replace all `console.warn` with `logger.warn`
- [ ] Replace all `console.error` with `logger.error`
- [ ] Add structured context to all log calls
- [ ] Use `logger.time()` for performance-critical operations
- [ ] Test that logs appear correctly
- [ ] Verify JSON format in production build

### For React Components

- [ ] Import hook: `import { useLogger } from '@/lib/client-logger';`
- [ ] Create logger: `const log = useLogger('ComponentName');`
- [ ] Replace all `console.log` calls with `log.info` or `log.debug`
- [ ] Replace all `console.error` calls with `log.error`
- [ ] Add structured context to all log calls
- [ ] Test that errors are sent to backend
- [ ] Verify logs don't cause re-renders

### For Utility/Library Code

- [ ] Import logger: `import { logger } from '@/lib/logger';`
- [ ] Replace all console calls with logger methods
- [ ] Consider creating a child logger with module context:
  ```typescript
  const log = logger.child({ module: 'AudioEngine' });
  ```
- [ ] Add structured context to all log calls

---

## Example Migrations

### Example 1: generate-vibelog API Route

**File:** `app/api/generate-vibelog/route.ts`

**Before (lines 128-136):**

```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log('Generating vibelog from transcription:', transcription.substring(0, 100) + '...');
  console.log('Target language:', languageName, `(${targetLanguage})`);
  console.log('Selected tone:', selectedTone);
  console.log('Keep filler words:', keepFillerWords);
}
```

**After:**

```typescript
import { createApiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const apiLogger = createApiLogger();

  // Replace all console.log calls
  apiLogger.debug('Generating vibelog from transcription', {
    transcriptionPreview: transcription.substring(0, 100),
    transcriptionLength: transcription.length,
    targetLanguage,
    languageName,
    selectedTone,
    keepFillerWords,
  });

  // ... rest of code
}
```

### Example 2: useProfile Hook

**File:** `hooks/useProfile.ts`

**Before (lines 44-52):**

```typescript
if (fetchError.code === 'PGRST116') {
  console.log('No profile found (normal for new users)');
} else if (fetchError.code === '42501' || fetchError.code === 'PGRST204') {
  console.log('Profile restricted by RLS');
} else {
  console.warn('Profile fetch error:', fetchError);
  setError(fetchError.message);
}
```

**After:**

```typescript
import { logger } from '@/lib/logger';

// In fetchProfile function
if (fetchError) {
  const logContext = { userId, code: fetchError.code };

  if (fetchError.code === 'PGRST116') {
    logger.info('No profile found (normal for new users)', logContext);
  } else if (fetchError.code === '42501' || fetchError.code === 'PGRST204') {
    logger.warn('Profile restricted by RLS', logContext);
  } else {
    logger.error('Profile fetch error', { ...logContext, error: fetchError });
    setError(fetchError.message);
  }
  setProfile(null);
}
```

### Example 3: Conversation Engine

**File:** `lib/conversation-engine.ts`

**Before:**

```typescript
// No logging currently (should add)
```

**After:**

```typescript
import { logger } from '@/lib/logger';

export class ConversationEngine {
  private log = logger.child({ module: 'ConversationEngine' });

  async processInput(input: string): Promise<string> {
    this.log.debug('Processing user input', { input, currentState: this.store.state });

    const command = this.parseCommand(input);

    this.log.info('Command parsed', {
      type: command.type,
      confidence: command.confidence,
    });

    if (command.confidence < 0.7) {
      this.log.warn('Low confidence command', { input, confidence: command.confidence });
      return this.handleUnknownCommand(input);
    }

    return await this.executeCommand(command);
  }

  private async handleGenerate(command: ParsedCommand): Promise<string> {
    this.log.info('Starting generation', { intent: command.intent });

    await this.log.time('Content generation', async () => {
      // Mock: In real implementation, this would call OpenAI API
      // ...
    });

    return response;
  }
}
```

---

## Testing Logs

### Development

Start the dev server and check logs:

```bash
npm run dev
```

Logs will be pretty-printed with colors:

```
INFO [12:34:56] User logged in
  Context: {
    "userId": "123",
    "method": "google"
  }
```

### Production

Build and check JSON format:

```bash
npm run build
npm start
```

Logs will be JSON:

```json
{
  "level": 20,
  "message": "User logged in",
  "timestamp": "2025-11-04T12:34:56.789Z",
  "context": { "userId": "123", "method": "google" },
  "environment": "production"
}
```

### Testing Client Logs

Open browser console and trigger an error:

```javascript
// In your component
log.error('Test error', new Error('This is a test'));
```

Check:

1. Browser console shows the error
2. Network tab shows POST to `/api/logs`
3. Server logs show `[CLIENT] Test error`

---

## Performance Considerations

### Log Sampling

For high-frequency logs, use sampling:

```typescript
// Only log 10% of cache hits
if (Math.random() < 0.1) {
  logger.debug('Cache hit', { key });
}
```

### Avoid Logging Large Objects

**Bad:**

```typescript
logger.info('Request received', { request }); // Entire request object
```

**Good:**

```typescript
logger.info('Request received', {
  method: request.method,
  url: request.url,
  headers: request.headers.get('content-type'),
});
```

### Use Appropriate Log Levels

Don't use `logger.info()` for everything:

```typescript
// ❌ Too much noise in production
logger.info('Function called', { args });

// ✅ Better
logger.debug('Function called', { args });
```

---

## Integration with External Services

### Sentry Integration (Future)

```typescript
// lib/logger.ts - Add to sendToErrorTracking method
import * as Sentry from '@sentry/nextjs';

private sendToErrorTracking(entry: LogEntry): void {
  if (entry.level >= LogLevel.ERROR) {
    Sentry.captureException(entry.error, {
      level: entry.level >= LogLevel.FATAL ? 'fatal' : 'error',
      extra: entry.context,
    });
  }
}
```

### Datadog Integration (Future)

```typescript
// lib/logger.ts
import { datadogLogs } from '@datadog/browser-logs';

private jsonPrint(entry: LogEntry): void {
  console.log(JSON.stringify(entry));

  // Send to Datadog
  datadogLogs.logger.log(
    entry.message,
    entry.context,
    entry.level >= LogLevel.ERROR ? 'error' : 'info'
  );
}
```

---

## Migration Progress Tracker

Track your migration progress:

### Priority 1: API Routes (High Traffic)

- [ ] `app/api/generate-vibelog/route.ts`
- [ ] `app/api/transcribe/route.ts`
- [ ] `app/api/save-vibelog/route.ts`
- [ ] `app/api/upload-audio/route.ts`

### Priority 2: Core Libraries

- [ ] `lib/conversation-engine.ts`
- [ ] `lib/supabase.ts`
- [ ] `lib/errorHandler.ts`

### Priority 3: Hooks

- [ ] `hooks/useProfile.ts`
- [ ] `hooks/useAudioEngine.ts`
- [ ] `hooks/useSaveVibelog.ts`

### Priority 4: Components

- [ ] Component migrations as needed

---

## Questions?

- Slack: #engineering-logging
- Documentation: This file
- Examples: See migrated files above

---

**Happy Logging! 📊✨**
