# CLAUDE.md - VibeLog Project Context

> Voice-to-publish platform that turns spoken thoughts into beautiful posts instantly.

## Prime Directives

1. **Ship, don't ask** - Execute immediately. Only ask if genuinely ambiguous.
2. **One change, one commit** - Atomic commits. PR per feature/fix.
3. **Read before write** - Always check existing patterns before creating new code.
4. **Test what matters** - If it can break prod, it needs a test.
5. **Delete > Comment** - Remove dead code, don't comment it out.

## Tech Stack

| Layer     | Tech                                   |
| --------- | -------------------------------------- |
| Framework | Next.js 15 (App Router) + React 19     |
| Database  | Supabase (PostgreSQL + Auth + Storage) |
| AI        | OpenAI (Whisper, GPT-4o, TTS)          |
| Video     | Google Veo 3.1 via fal.ai              |
| Styling   | Tailwind CSS + Radix UI                |
| State     | Zustand + TanStack Query               |
| Testing   | Vitest + Playwright                    |
| Deploy    | Vercel (5 min function timeout)        |

## Project Map

```
app/
  api/              # ~54 API routes
  [username]/       # Public profile pages
  v/[id]/           # Public vibelog view
  dashboard/        # Authenticated user area
  settings/         # User preferences
components/         # React components (keep <300 LOC)
lib/                # Business logic, utilities
hooks/              # Custom React hooks
supabase/migrations/  # Database migrations (source of truth)
```

## Critical Paths

```
Audio Recording → /api/transcribe → OpenAI Whisper
                → /api/generate-vibelog → GPT-4o → polished content
                → /api/save-vibelog → Supabase
                → /api/generate-cover → DALL-E (optional)
                → /api/vibelog/generate-ai-audio → TTS (optional)
```

## Code Patterns

### API Routes

```typescript
// Always use this pattern
import { createClient } from '@/lib/supabase';
import { trackAICost } from '@/lib/ai-cost-tracker';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // ... implementation
}
```

### Validation

- Use Zod for all external input
- Validate at API boundaries, trust internal code

### Error Handling

- Return proper HTTP status codes (401, 403, 404, 500)
- Log errors server-side, show user-friendly messages client-side
- AI failures: graceful degradation, never crash the request

## Terminology (Strict)

| Wrong             | Right                        |
| ----------------- | ---------------------------- |
| blog, post, entry | vibelog                      |
| Blog, Post        | VibeLog (platform name only) |
| user content      | vibe                         |
| mood, feeling     | vibe                         |

## Modularity Rules (Critical)

**Every function is an API. Build for reuse.**

Before writing ANY new code:

1. **Search first** - Check `lib/`, `hooks/`, `components/` for existing utilities
2. **Extract if used twice** - If you write similar logic twice, extract to `lib/`
3. **Single responsibility** - One function = one job = one reason to change
4. **Compose, don't nest** - Small functions that chain > large functions with conditionals

### Where Shared Code Lives

| Type          | Location      | Example                            |
| ------------- | ------------- | ---------------------------------- |
| Data fetching | `lib/`        | `fetchVibelog()`, `fetchUser()`    |
| Validation    | `lib/`        | `validateVibelogInput()`           |
| Formatting    | `lib/`        | `formatDate()`, `truncateText()`   |
| API helpers   | `lib/`        | `withAuth()`, `handleAPIError()`   |
| React logic   | `hooks/`      | `useVibelog()`, `useAudioPlayer()` |
| UI patterns   | `components/` | Reusable components                |

### Before Creating New Code

**Search by concept, not exact name.** Use multiple search strategies:

```bash
# 1. Search by domain concept (most reliable)
grep -ri "vibelog" lib/           # Find all vibelog-related utilities
grep -ri "audio" lib/ hooks/      # Find audio handling
grep -ri "user" lib/              # Find user utilities

# 2. Search by action verb
grep -ri "fetch\|get" lib/        # Data fetching
grep -ri "format\|parse" lib/     # Data transformation
grep -ri "validate\|check" lib/   # Validation

# 3. List all exports in a directory
grep -r "export" lib/*.ts | head -50

# 4. Check existing hooks
ls hooks/
```

**Ask yourself:** "What problem am I solving?" Then search for that problem domain.

| If building...  | Search for...                         |
| --------------- | ------------------------------------- |
| Vibelog fetch   | `grep -ri "vibelog" lib/`             |
| Date display    | `grep -ri "date\|time\|format" lib/`  |
| Auth check      | `grep -ri "auth\|user\|session" lib/` |
| Form validation | `grep -ri "valid\|schema\|zod" lib/`  |
| Error handling  | `grep -ri "error\|handle" lib/`       |

If something similar exists: **use it, extend it, or refactor it**.
If nothing exists and you need it twice: **create it in the right location**.

### Function Design Principles

```typescript
// BAD: Does too much, can't reuse parts
async function createVibelogAndNotify(data) {
  // 50 lines of mixed concerns
}

// GOOD: Composable pieces
async function validateVibelog(data) {
  /* ... */
}
async function saveVibelog(data) {
  /* ... */
}
async function notifyFollowers(vibelogId) {
  /* ... */
}

// Compose at the call site
const validated = validateVibelog(data);
const vibelog = await saveVibelog(validated);
await notifyFollowers(vibelog.id);
```

## Anti-Patterns (Never Do)

- **Don't duplicate** - If code exists, use it. If similar code exists, refactor to share.
- **Don't rebuild what exists** - Search lib/, hooks/, components/ before writing
- Don't add "improvement" comments to code you didn't change
- Don't create backwards-compatibility shims - just change the code
- Don't add error handling for impossible states
- Don't over-abstract - 3 similar lines > premature abstraction (but 4+ = extract)
- Don't wait for confirmation - execute and report

## Commands

```bash
pnpm dev           # Start dev server (localhost:3000)
pnpm build         # Production build (catch type errors)
pnpm test          # Unit tests
pnpm test:e2e      # E2E tests
pnpm lint          # ESLint
pnpm db:migrate    # Push migrations to Supabase
pnpm db:status     # Check migration status
```

## Deployment Flow

When asked to deploy/merge to main:

```bash
git checkout -b fix/descriptive-name
git add . && git commit -m "fix: description"
git push -u origin fix/descriptive-name
gh pr create --title "Fix: title" --body "## Summary\n..."
gh pr merge --squash --auto  # Auto-merge when checks pass
```

The `--auto` flag queues merge for when checks pass. Don't wait manually.

## Database

- Migrations: `supabase/migrations/` (numbered, immutable once pushed)
- Never edit pushed migrations - create new ones
- Apply: `pnpm db:migrate`
- Check: `pnpm db:status`

## Key Files (Read These First)

| File                            | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `lib/ai-cost-tracker.ts`        | AI usage tracking + circuit breaker    |
| `lib/supabase.ts`               | Supabase client factory                |
| `app/api/save-vibelog/route.ts` | Main save endpoint (reference pattern) |
| `app/api/transcribe/route.ts`   | Whisper integration                    |
| `components/MicRecorder.tsx`    | Audio capture UI                       |

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
FAL_API_KEY  # For video generation
```

## Performance Constraints

- Vercel function timeout: 5 minutes max
- OpenAI rate limits: handled by cost tracker
- Video generation: 2-5 min depending on content length
- Audio files: Supabase Storage (public bucket)

## When Stuck

1. Check similar existing code first
2. Read the error message carefully
3. Check Supabase logs in dashboard
4. Check Vercel logs for deployed functions
5. If truly blocked, ask - but propose a solution

## Quality Bar

Before marking any task complete:

- [ ] Types pass (`pnpm build`)
- [ ] No console errors in browser
- [ ] Works on mobile viewport
- [ ] Error states handled
- [ ] Loading states exist for async ops
