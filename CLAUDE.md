# CLAUDE.md - VibeLog Project Context

> Voice-to-publish platform that turns spoken thoughts into beautiful posts instantly.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI (transcription, text generation, TTS)
- **Styling**: Tailwind CSS + Radix UI primitives
- **State**: Zustand + TanStack Query
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Deployment**: Vercel

## Project Structure

```
app/              # Next.js routes (App Router)
  api/            # API routes (~54 endpoints)
  [username]/     # Dynamic user profile pages
  v/[id]/         # Public vibelog view
  dashboard/      # User dashboard
  settings/       # User settings
components/       # React components
lib/              # Utilities, services, configs
hooks/            # Custom React hooks
supabase/         # Database migrations
```

## Key Patterns

### API Routes

- All in `app/api/` using Next.js route handlers
- Use Supabase server client from `lib/supabase.ts`
- AI operations tracked via `lib/ai-cost-tracker.ts`

### Authentication

- Supabase Auth with SSR support via `@supabase/ssr`
- Auth helpers in `lib/auth-*.ts`

### Data Flow

1. User records audio via MicRecorder
2. Audio → OpenAI Whisper transcription
3. Transcript → AI polishing/generation
4. Generated content → Supabase storage
5. Optional: AI-generated cover images, TTS audio

## Terminology (Brand Guidelines)

- **vibelog** (lowercase): A single post/entry
- **VibeLog** (capitalized): The platform/product name
- **vibe**: The emotional tone/energy of content
- Never use "blog", "post", or "entry" - always "vibelog"

## Code Conventions

- TypeScript strict mode
- Files < 300 LOC, functions < 80 LOC
- Use Zod for runtime validation
- Error handling: always return proper HTTP status codes
- Prefer existing patterns - check similar files before creating new ones

## Database

- Migrations in `supabase/migrations/`
- Apply with: `pnpm db:migrate`
- Check status: `pnpm db:status`

## Common Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests
pnpm lint         # ESLint
pnpm db:migrate   # Apply migrations
```

## Workflow Preferences

- Execute actions immediately without asking for confirmation
- Be concise and direct
- Focus on executing, not explaining what you'll do
- Only ask questions if the request is genuinely unclear
- Batch operations when possible

## Important Files

- `lib/ai-cost-tracker.ts` - AI usage tracking with circuit breaker
- `lib/supabase.ts` - Supabase client setup
- `app/api/save-vibelog/route.ts` - Main vibelog save endpoint
- `app/api/transcribe/route.ts` - Audio transcription
- `app/api/generate-vibelog/route.ts` - AI content generation

## Current State

- Production deployed on Vercel
- Supabase for all backend services
- AI cost tracking with caching to reduce API calls
- Video generation feature (Google Veo 3.1 via fal.ai)

## Known Considerations

- OpenAI API has rate limits - cost tracker handles this
- Vercel function timeout: 5 min max for video generation
- Audio files stored in Supabase Storage buckets
