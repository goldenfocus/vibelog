# API Design Standards

> Consistent, secure, and predictable API patterns for VibeLog

---

## 🎯 Design Principles

- **Predictable**: Consistent patterns across all endpoints
- **Secure**: Authentication, validation, and rate limiting by default
- **Fast**: Efficient queries, caching, and minimal payload
- **Resilient**: Graceful error handling and retries
- **Observable**: Logging, metrics, and tracing built-in

---

## 🛠 Core Patterns

### Request/Response Structure

```typescript
// Request
interface APIRequest<T = unknown> {
  data: T
  metadata?: {
    requestId: string
    timestamp: string
    version: string
  }
}

// Success Response
interface APIResponse<T = unknown> {
  data: T
  success: true
  metadata: {
    requestId: string
    timestamp: string
    processingTime: number
  }
}

// Error Response
interface APIError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  success: false
  metadata: {
    requestId: string
    timestamp: string
  }
}
```

### Status Codes

- **200** - Success with data
- **201** - Created successfully
- **204** - Success, no content
- **400** - Bad request (client error)
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not found
- **409** - Conflict (duplicate, race condition)
- **422** - Validation failed
- **429** - Rate limited
- **500** - Internal server error
- **503** - Service unavailable

---

## 🔒 Security Standards

### Authentication
```typescript
// JWT payload structure
interface JWTPayload {
  sub: string        // user ID
  email: string
  role: 'user' | 'admin'
  exp: number
  iat: number
}

// API key for external integrations
interface APIKeyAuth {
  key: string        // Format: vb_live_xxx or vb_test_xxx
  permissions: string[]
}
```

### Input Validation
```typescript
// Use Zod schemas for all inputs
const createVibelogSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10).max(50000),
  audioUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false)
})

// Sanitize HTML in content fields
const sanitizeContent = (html: string) =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'strong', 'em', 'h1', 'h2'] })
```

### Rate Limiting
```typescript
// Per-endpoint limits
const rateLimits = {
  '/api/transcribe': { requests: 10, window: '1m' },
  '/api/generate': { requests: 5, window: '1m' },
  '/api/vibelogs': { requests: 100, window: '1h' },
  '/api/upload': { requests: 20, window: '1h' }
}

// Per-user limits
const userLimits = {
  free: { vibelogs: 10, storage: '100MB' },
  pro: { vibelogs: 1000, storage: '10GB' }
}

// Rate limiting headers
const rateLimitHeaders = {
  'X-RateLimit-Limit': '100',           // Total requests allowed
  'X-RateLimit-Remaining': '45',        // Requests remaining in window
  'X-RateLimit-Reset': '1640995200',    // Unix timestamp when window resets
  'X-RateLimit-Window': '3600',         // Window duration in seconds
  'X-RateLimit-Policy': 'sliding-window' // Algorithm used
}

// Request correlation headers
const correlationHeaders = {
  'X-Request-ID': 'req_123abc456def',    // Unique per request
  'X-Trace-ID': 'trace_789ghi012jkl',    // Spans multiple services
  'X-User-ID': 'user_345mno678pqr',      // For user-specific tracking
  'X-Session-ID': 'sess_901rst234uvw'    // For session tracking
}
```

---

## 📊 Error Handling

### Error Codes
```typescript
const errorCodes = {
  // Validation
  VALIDATION_FAILED: 'Field validation failed',
  INVALID_FORMAT: 'Invalid file format',
  FILE_TOO_LARGE: 'File exceeds size limit',

  // Authentication
  INVALID_TOKEN: 'Invalid or expired token',
  INSUFFICIENT_PERMISSIONS: 'User lacks required permissions',

  // Business Logic
  QUOTA_EXCEEDED: 'User quota exceeded',
  DUPLICATE_RESOURCE: 'Resource already exists',
  RESOURCE_NOT_FOUND: 'Resource not found',

  // External Services
  AI_SERVICE_UNAVAILABLE: 'AI service temporarily unavailable',
  TRANSCRIPTION_FAILED: 'Audio transcription failed',

  // Infrastructure
  DATABASE_ERROR: 'Database operation failed',
  NETWORK_ERROR: 'Network request failed'
}
```

### Error Response Examples
```typescript
// Validation error
{
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Title is required',
    details: {
      field: 'title',
      value: '',
      constraint: 'min_length'
    }
  },
  success: false,
  metadata: { requestId: 'req_123', timestamp: '2024-01-01T00:00:00Z' }
}

// Rate limit error
{
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    details: {
      limit: 10,
      window: '1m',
      retryAfter: 45
    }
  },
  success: false,
  metadata: { requestId: 'req_124', timestamp: '2024-01-01T00:00:00Z' }
}
```

---

## 🚀 Performance Patterns

### Caching Strategy
```typescript
// Redis cache patterns
const cachePatterns = {
  user: 'user:{id}',           // TTL: 1h
  vibelog: 'vl:{id}',          // TTL: 24h
  transcription: 'tx:{hash}',  // TTL: 7d
  generation: 'gen:{hash}'     // TTL: 1h
}

// Cache-aside pattern
async function getVibelog(id: string) {
  const cached = await redis.get(`vl:${id}`)
  if (cached) return JSON.parse(cached)

  const vibelog = await db.vibelog.findUnique({ where: { id } })
  if (vibelog) {
    await redis.setex(`vl:${id}`, 86400, JSON.stringify(vibelog))
  }
  return vibelog
}
```

### Database Queries
```typescript
// Always include select fields
const getVibelogs = () => db.vibelog.findMany({
  select: {
    id: true,
    title: true,
    excerpt: true,
    createdAt: true,
    author: { select: { name: true, avatar: true } }
  },
  orderBy: { createdAt: 'desc' },
  take: 20
})

// Use cursors for pagination
const getVibelogsPaginated = (cursor?: string) => db.vibelog.findMany({
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
  take: 20,
  orderBy: { createdAt: 'desc' }
})
```

---

## 🔄 Async Operations

### Background Jobs
```typescript
// Job queue patterns
interface TranscriptionJob {
  type: 'transcription'
  data: {
    audioUrl: string
    vibelogId: string
    userId: string
  }
  options: {
    priority: 'high' | 'normal' | 'low'
    retries: number
    delay?: number
  }
}

// Job status tracking
interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: unknown
  error?: string
  createdAt: Date
  updatedAt: Date
}
```

### Webhook Patterns
```typescript
// Webhook payload structure
interface WebhookPayload {
  event: string
  data: unknown
  timestamp: string
  signature: string  // HMAC verification
}

// Webhook retry logic
const webhookRetry = {
  attempts: 3,
  backoff: 'exponential',  // 1s, 2s, 4s
  timeout: 5000
}
```

---

## 📝 API Documentation

### OpenAPI Schema
```yaml
# Auto-generate from code annotations
paths:
  /api/vibelogs:
    post:
      summary: Create a new vibelog
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateVibelogRequest'
      responses:
        201:
          description: Vibelog created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VibelogResponse'
```

### Response Examples
Include real examples in documentation:
```typescript
// GET /api/vibelogs/123
{
  "data": {
    "id": "vl_123",
    "title": "My Morning Thoughts",
    "content": "<p>Today I realized...</p>",
    "audioUrl": "https://cdn.vibelog.io/audio/123.mp3",
    "createdAt": "2024-01-01T10:00:00Z"
  },
  "success": true,
  "metadata": {
    "requestId": "req_456",
    "timestamp": "2024-01-01T10:00:01Z",
    "processingTime": 45
  }
}
```

---

## 🧪 Testing Standards

### API Tests
```typescript
// Integration test pattern
describe('POST /api/vibelogs', () => {
  it('creates vibelog with valid data', async () => {
    const response = await request(app)
      .post('/api/vibelogs')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Vibelog',
        content: 'Test content here'
      })
      .expect(201)

    expect(response.body.data).toMatchObject({
      title: 'Test Vibelog',
      content: 'Test content here'
    })
  })

  it('rejects invalid data', async () => {
    const response = await request(app)
      .post('/api/vibelogs')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: '' })  // Invalid: empty title
      .expect(422)

    expect(response.body.error.code).toBe('VALIDATION_FAILED')
  })
})
```

### Contract Testing
```typescript
// Ensure API matches frontend expectations
const apiContract = {
  'POST /api/vibelogs': {
    request: CreateVibelogRequest,
    response: VibelogResponse,
    errors: ['VALIDATION_FAILED', 'QUOTA_EXCEEDED']
  }
}
```

---

## 📊 Monitoring & Observability

### Metrics to Track
```typescript
const apiMetrics = {
  // Request metrics
  'api.requests.total': 'counter',
  'api.requests.duration': 'histogram',
  'api.requests.errors': 'counter',

  // Business metrics
  'vibelogs.created': 'counter',
  'transcriptions.completed': 'counter',
  'users.active_daily': 'gauge',

  // Infrastructure
  'db.queries.duration': 'histogram',
  'cache.hit_rate': 'gauge',
  'queue.jobs.pending': 'gauge'
}
```

### Structured Logging
```typescript
// Log format
interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  requestId?: string
  userId?: string
  endpoint?: string
  duration?: number
  error?: {
    name: string
    message: string
    stack: string
  }
  metadata?: Record<string, unknown>
}
```

---

## 🔧 Implementation Checklist

### New Endpoint Checklist
- [ ] Input validation with Zod schema
- [ ] Authentication/authorization checks
- [ ] Rate limiting configured
- [ ] Error handling with proper codes
- [ ] Response format follows standard
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Tests written (unit + integration)
- [ ] OpenAPI documentation added
- [ ] Monitoring/logging in place

### Security Review
- [ ] No sensitive data in logs
- [ ] SQL injection prevention
- [ ] XSS protection for content
- [ ] CSRF tokens for state changes
- [ ] Rate limiting on expensive operations
- [ ] Input sanitization
- [ ] Proper error messages (no info leakage)

---

**See also**: `engineering.md` for testing standards, `monitoring.md` for observability setup, `deployment.md` for production deployment, `branding.md` for error message copy