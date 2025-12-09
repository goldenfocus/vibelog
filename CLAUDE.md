# CLAUDE.md - VibeLog Project Context

> Voice-to-publish platform that turns spoken thoughts into beautiful posts instantly.

## System Paths (MANDATORY)

When commands like `npm`, `gh`, `pnpm` fail with "command not found", use full paths:

| Command | Full Path              |
| ------- | ---------------------- |
| `gh`    | `/opt/homebrew/bin/gh` |
| `npm`   | `/usr/local/bin/npm`   |
| `node`  | `/usr/local/bin/node`  |
| `npx`   | `/usr/local/bin/npx`   |

Example: `/opt/homebrew/bin/gh pr create --title "feat: ..." --base main`

## Git Worktree Rules (MANDATORY)

You are likely running in a git worktree. Follow these rules:

1. **Branch naming**: Always rename auto-generated branch names (like `modest-williams`) to descriptive names BEFORE pushing:

   ```bash
   git branch -m old-name feat/descriptive-name
   ```

2. **Naming convention**: Use `feat/`, `fix/`, `refactor/` prefixes with kebab-case:
   - ✅ `feat/mobile-language-selector`
   - ✅ `fix/homepage-animation-glitch`
   - ❌ `modest-williams` (auto-generated, meaningless)

3. **Before pushing**: Always check branch name matches the work:

   ```bash
   git branch --show-current
   ```

4. **PR workflow**:

   ```bash
   /opt/homebrew/bin/gh pr create --title "feat: Description" --base main
   /opt/homebrew/bin/gh pr merge --squash --auto
   ```

5. **After merge**: Clean up worktree (user responsibility)

## Prime Directives

1. **Ship, don't ask** - Execute immediately. Only ask if genuinely ambiguous.
2. **One change, one commit** - Atomic commits. PR per feature/fix.
3. **Read before write** - Always check existing patterns before creating new code.
4. **Test what matters** - If it can break prod, it needs a test.
5. **Delete > Comment** - Remove dead code, don't comment it out.
6. **Update evolution.md** - When shipping significant features or architectural changes, update `evolution.md` to document the evolution. This file is embedded in Vibe Brain's RAG system for AI-powered documentation.
   - **When to update**: New feature ships, architectural decision made, database migration added, integration added
   - **How to update**: See "Maintenance Guidelines" section in evolution.md
   - **After updating**: Re-embed documentation by calling `POST /api/admin/documentation/embed` (admin only) or run `node scripts/embed-all-docs.js`
7. **Update GitHub Wiki** - When shipping changes that affect external documentation, API, or developer experience, sync the GitHub Wiki.
   - **When to update**: New API endpoint, database schema change, feature affecting docs, breaking changes
   - **How to update**: Run `pnpm wiki:sync` (automated) or follow wiki checklist below
   - **After updating**: Verify wiki at https://github.com/goldenfocus/vibelog/wiki

## Wiki Maintenance (AI Agent Responsibility)

**AI agents MUST proactively detect when GitHub Wiki updates are needed and either execute them or guide the user.**

### When Wiki Update is Required

✅ **Always update wiki when:**

- New API endpoint added/changed/removed
- Database schema significantly changed (new tables, major columns)
- New feature shipped that affects external developers
- Breaking changes in any public API
- New integration added (OAuth provider, AI service, etc.)
- Major architectural decision documented
- User-facing terminology or branding changes
- README.md, evolution.md, api.md, or branding.md modified

### How to Update Wiki

**Option 1: Automated (Preferred)**

```bash
pnpm wiki:sync
```

This will:

1. Detect which documentation files changed
2. Regenerate affected wiki pages
3. Push to GitHub Wiki automatically

**Option 2: Manual (Fallback)**

```bash
# 1. Generate wiki pages
pnpm wiki:generate

# 2. Review changes in /tmp/vibelog-wiki/

# 3. Upload
cd /tmp/vibelog-wiki
git clone https://github.com/goldenfocus/vibelog.wiki.git wiki-repo
cp *.md wiki-repo/
cd wiki-repo
git add . && git commit -m "docs: sync wiki with codebase changes"
git push origin master
```

### Wiki Update Checklist

Before completing documentation work:

- [ ] Codebase docs updated (README, evolution.md, api.md, etc.)
- [ ] Wiki pages regenerated (`pnpm wiki:generate`)
- [ ] Wiki changes reviewed in `/tmp/vibelog-wiki/`
- [ ] Wiki pushed to GitHub (`pnpm wiki:sync` or manual)
- [ ] Documentation re-embedded for Vibe Brain (`pnpm docs:embed`)
- [ ] Wiki links tested at https://github.com/goldenfocus/vibelog/wiki
- [ ] Cross-references between pages verified

### Wiki-Codebase Mapping

| Codebase File              | Generates Wiki Page                | Update Trigger              |
| -------------------------- | ---------------------------------- | --------------------------- |
| README.md                  | Home.md, Getting-Started.md        | Any README change           |
| evolution.md               | Database-Schema.md, Vibe-Engine.md | Architecture/schema changes |
| api.md                     | API-Reference.md                   | API endpoint changes        |
| branding.md                | Branding-Guidelines.md             | Terminology/voice changes   |
| CLAUDE.md + engineering.md | Engineering-Standards.md           | Dev standards changes       |
| living-web-2026.md         | Product-Vision.md                  | Vision/philosophy updates   |
| supabase/migrations/\*.sql | Database-Schema.md                 | New migrations              |

### Auto-Detection Signals for AI Agents

**Commit Message Patterns:**

- `feat:` + mentions API, user-facing feature, or integration → Update wiki
- `breaking:` + any change → Update wiki
- `api:` + endpoint mention → Update wiki
- `docs:` + major documentation → Update wiki
- Contains `[wiki]` flag → Force wiki update

**File Change Patterns:**

- Any `DOCUMENTATION_SOURCES` file modified → Update wiki
- `supabase/migrations/*.sql` added → Update Database-Schema.md
- `app/api/*/route.ts` with new exports → Update API-Reference.md

**PR Label Patterns:**

- `documentation` → Review wiki need
- `breaking-change` → Always update wiki
- `public-api` → Update API-Reference.md

### AI Agent Response Pattern

When detecting wiki update needed:

```
🤖 Wiki Update Detected

I've identified changes that require GitHub Wiki synchronization:
- Modified: README.md, api.md
- Wiki pages affected: Home.md, API-Reference.md

Running wiki sync...
[Execute: pnpm wiki:sync]

✅ Wiki updated successfully!
📖 View changes: https://github.com/goldenfocus/vibelog/wiki
```

### Manual Reminder (If Automation Unavailable)

If `pnpm wiki:sync` fails or is unavailable:

```
⚠️  Wiki Update Required (Manual)

Please update the GitHub Wiki manually:
1. Generate: pnpm wiki:generate
2. Review: Check /tmp/vibelog-wiki/
3. Upload: Follow Option 2 steps above
4. Verify: https://github.com/goldenfocus/vibelog/wiki
```

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

### Cover Image Storage

**CRITICAL: All cover images use the standardized `lib/cover-storage.ts` module.**

**Storage Structure:**

```
vibelog-covers/           # Bucket name
  covers/                 # All covers in this directory
    {vibelogId}.png       # AI-generated covers (DALL-E)
    {vibelogId}.jpg       # User-uploaded covers
```

**One file per vibelog** - Uploading a new cover automatically replaces the old one.

**Usage Pattern:**

```typescript
import { uploadCover, deleteCover, getCoverUrl } from '@/lib/cover-storage';

// Upload a cover (AI-generated or user-uploaded)
const { url, error } = await uploadCover(vibelogId, buffer, 'image/png');

// Get cover URL
const url = await getCoverUrl(vibelogId, 'png'); // or 'jpg'

// Delete a cover
const { success, error } = await deleteCover(vibelogId);
```

**Rules:**

- ✅ ALWAYS use `lib/cover-storage.ts` functions
- ❌ NEVER construct storage paths manually
- ❌ NEVER use old storage utilities (`lib/storage.ts` is for audio only)
- ✅ Cover operations are modular and reusable across endpoints

**Endpoints using cover storage:**

- `/api/generate-cover` - AI-generated covers (DALL-E)
- `/api/vibelog/upload-cover` - User-uploaded covers

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

## Database Migrations (CRITICAL)

### Naming Convention (MANDATORY)

All migrations MUST use timestamp format: `YYYYMMDDHHMMSS_descriptive_name.sql`

```bash
# ✅ CORRECT
20251207143000_add_user_preferences.sql
20251207150000_create_notifications_table.sql

# ❌ WRONG - Never use these formats
001_add_something.sql      # Numeric prefix
023a_fix_something.sql     # Letter suffixes
add_feature.sql            # No timestamp
```

**Why this matters:** Supabase sorts migrations lexicographically. Numeric prefixes like `023a_` sort AFTER `20251118...` causing ordering chaos and failed deployments.

### Creating New Migrations

```bash
# Generate timestamp for new migration
date +%Y%m%d%H%M%S  # e.g., 20251207143052

# Create migration file
touch supabase/migrations/20251207143052_your_migration_name.sql
```

### Migration Rules

1. **Immutable once pushed** - Never edit migrations already in production
2. **Idempotent when possible** - Use `IF NOT EXISTS`, `IF EXISTS` guards
3. **One concern per migration** - Don't mix unrelated schema changes
4. **Test locally first** - Run `supabase db reset` to verify migration chain

### Keeping Local and DB in Sync

**Check sync status:**

```bash
# List local migrations
ls supabase/migrations/

# List DB migrations (via Supabase MCP)
# Use mcp__supabase__list_migrations tool
```

**If migrations are out of sync:**

1. **Local has files not in DB** - Migrations weren't applied. Either:
   - Apply them: `pnpm db:migrate`
   - Or if already applied manually, record them:
     ```sql
     INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
     VALUES ('20251207143000', 'migration_name', '{}');
     ```

2. **DB has versions not matching local** - Versions were renamed. Update DB:

   ```sql
   UPDATE supabase_migrations.schema_migrations
   SET version = 'new_version' WHERE version = 'old_version';
   ```

3. **Complete mismatch** - Run cleanup script: `bash scripts/cleanup-migrations.sh`

### Migration Troubleshooting

| Symptom                     | Cause                         | Fix                                  |
| --------------------------- | ----------------------------- | ------------------------------------ |
| "Migration already applied" | Version exists in DB          | Check if changes are actually needed |
| "Migration not found"       | Local file missing or renamed | Verify filenames match DB versions   |
| Migrations run out of order | Mixed naming conventions      | Rename all to timestamp format       |
| Schema drift                | Manual DB changes             | Create migration to match or revert  |

### Commands

```bash
pnpm db:migrate    # Push pending migrations to Supabase
pnpm db:status     # Check migration status
supabase db reset  # Reset local DB and replay all migrations
```

## Key Files (Read These First)

| File                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `lib/ai-cost-tracker.ts`                     | AI usage tracking + circuit breaker          |
| `lib/cover-storage.ts`                       | Cover image storage utilities (ALWAYS use)   |
| `lib/supabase.ts`                            | Supabase client factory                      |
| `lib/vibe-brain/knowledge-base.ts`           | Documentation embedding & search             |
| `app/api/save-vibelog/route.ts`              | Main save endpoint (reference pattern)       |
| `app/api/transcribe/route.ts`                | Whisper integration                          |
| `app/api/generate-cover/route.ts`            | DALL-E cover generation (uses cover-storage) |
| `app/api/admin/documentation/embed/route.ts` | Re-embed documentation (admin)               |
| `components/MicRecorder.tsx`                 | Audio capture UI                             |
| `scripts/embed-all-docs.js`                  | CLI tool for batch documentation embedding   |
| `scripts/migrate-cover-paths.ts`             | Migrate covers to standardized paths         |
| `scripts/cleanup-migrations.sh`              | Fix migration naming/sync issues             |

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
