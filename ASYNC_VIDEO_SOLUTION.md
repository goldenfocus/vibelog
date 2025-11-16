# Async Video Generation Architecture

## Problem
Current synchronous approach has fundamental issues:
- API waits 2-5 min for video generation → timeouts
- Poor UX (user stares at spinner for minutes)
- Serverless functions not designed for long-running tasks
- Multiple infrastructure timeouts (like-vibelog, check-admin also failing)

## Proposed Solutions (in order of simplicity)

### Option 1: Queue + Polling (Simplest - Use This)
**No external dependencies, works with current Vercel setup**

```
Flow:
1. User clicks "Generate Video"
2. API immediately returns 202 Accepted, sets status='queued'
3. Separate endpoint processes queue (triggered by cron or manual)
4. Frontend polls every 10s to check status
5. Shows progress bar, allows user to navigate away
6. When complete, shows notification + video
```

**Pros:**
- No new services needed
- Works with Vercel
- User can navigate away
- Simple to implement

**Cons:**
- Still uses serverless functions for processing (300s limit)
- Need to manage queue manually

### Option 2: Vercel Cron + Queue (Recommended)
**Use Vercel's built-in cron jobs**

```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/video/process-queue",
    "schedule": "*/2 * * * *"  // Every 2 minutes
  }]
}
```

**Flow:**
1. User clicks → API adds to queue table
2. Cron runs every 2 min, picks up queued items
3. Processes ONE video at a time (respects 300s limit)
4. Updates status in DB
5. Frontend polls or uses Supabase realtime

**Pros:**
- Built into Vercel
- Reliable scheduling
- Can process multiple jobs over time
- User can close browser

**Cons:**
- Still limited by 300s serverless timeout
- Cron frequency limits (max once per minute on Pro plan)

### Option 3: External Queue Service
**Use Inngest, QStash, or similar**

Services like **Inngest** or **Upstash QStash** handle long-running jobs:

```typescript
// Using Inngest (free tier available)
export const generateVideo = inngest.createFunction(
  { name: "Generate Video" },
  { event: "video.generate.requested" },
  async ({ event }) => {
    // No timeout limits, automatic retries, monitoring
    await generateAndUploadVideo(event.data.vibelogId);
  }
);
```

**Pros:**
- No timeout limits
- Built-in retries, monitoring, logging
- Better for production
- Can handle failures gracefully

**Cons:**
- Another service to manage
- Potential cost (though free tiers exist)
- Additional complexity

### Option 4: Database-Driven Queue (Best for Supabase)
**Use Supabase Edge Functions + Database Queue**

```sql
-- Add queue table
CREATE TABLE video_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vibelog_id uuid NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT
);
```

**Use Supabase Edge Functions (Deno) - 50ms-unlimited duration**

**Pros:**
- Unlimited execution time (Edge Functions don't have Vercel's limits)
- Native Supabase integration
- Database-driven queue is reliable
- Can use Supabase Realtime for live updates

**Cons:**
- Need to migrate logic to Deno/Edge Functions
- Different runtime environment

## Recommended Immediate Fix: Option 1 + 2 Hybrid

### Implementation Plan

1. **Create queue table** (1 migration)
2. **Modify `/api/video/generate`** - return immediately with status='queued'
3. **Create `/api/video/process-queue`** - process one item
4. **Add Vercel cron** - trigger process-queue every 2 min
5. **Update frontend** - poll for status instead of waiting

### Code Changes

```typescript
// POST /api/video/generate - NOW RETURNS IMMEDIATELY
export async function POST(request: NextRequest) {
  const { vibelogId } = await request.json();

  // Add to queue
  await supabase.from('video_queue').insert({
    vibelog_id: vibelogId,
    status: 'pending'
  });

  // Update vibelog status
  await supabase.from('vibelogs').update({
    video_generation_status: 'queued'
  }).eq('id', vibelogId);

  return NextResponse.json({
    success: true,
    status: 'queued',
    message: 'Video generation queued. Check back in a few minutes.'
  }, { status: 202 });
}
```

```typescript
// GET /api/video/status/:vibelogId - For polling
export async function GET(req, { params }) {
  const { data } = await supabase
    .from('vibelogs')
    .select('video_generation_status, video_url, video_generation_error')
    .eq('id', params.vibelogId)
    .single();

  return NextResponse.json(data);
}
```

```typescript
// POST /api/video/process-queue - Called by cron
export async function POST() {
  // Get next pending item
  const { data: job } = await supabase
    .from('video_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!job) return NextResponse.json({ message: 'No jobs in queue' });

  // Mark as processing
  await supabase.from('video_queue')
    .update({ status: 'processing', started_at: new Date() })
    .eq('id', job.id);

  try {
    // Do the actual generation (same code as before)
    const result = await generateAndUploadVideo(job.vibelog_id);

    // Mark as complete
    await supabase.from('video_queue')
      .update({ status: 'completed', completed_at: new Date() })
      .eq('id', job.id);

  } catch (error) {
    // Mark as failed
    await supabase.from('video_queue')
      .update({
        status: 'failed',
        error: error.message,
        attempts: job.attempts + 1
      })
      .eq('id', job.id);
  }
}
```

```tsx
// Frontend: Poll for status
function VideoGenerator({ vibelogId }) {
  const [status, setStatus] = useState('idle');

  const handleGenerate = async () => {
    await fetch('/api/video/generate', {
      method: 'POST',
      body: JSON.stringify({ vibelogId })
    });

    setStatus('queued');

    // Poll every 10 seconds
    const interval = setInterval(async () => {
      const res = await fetch(`/api/video/status/${vibelogId}`);
      const data = await res.json();

      if (data.video_generation_status === 'completed') {
        setStatus('completed');
        clearInterval(interval);
        window.location.reload(); // Show video
      } else if (data.video_generation_status === 'failed') {
        setStatus('failed');
        clearInterval(interval);
      }
    }, 10000);
  };

  if (status === 'queued') {
    return <div>Video generation in progress... You can navigate away and come back later.</div>;
  }

  // ... rest of component
}
```

## Benefits of This Approach

1. ✅ **Immediate response** - User doesn't wait
2. ✅ **No timeout issues** - Processing happens in background
3. ✅ **Better UX** - User can navigate away
4. ✅ **Scalable** - Can queue multiple jobs
5. ✅ **No new services** - Uses existing Vercel + Supabase
6. ✅ **Reliable** - Cron ensures processing even if frontend closes

## Timeline
- **Phase 1** (1 hour): Queue table + immediate return
- **Phase 2** (30 min): Status polling endpoint
- **Phase 3** (1 hour): Process queue endpoint + cron
- **Phase 4** (30 min): Update frontend to poll
- **Total**: ~3 hours for complete async solution
