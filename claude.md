# VibeLog - Claude Context File

> **Purpose**: This file provides comprehensive context about the VibeLog codebase for AI assistants. Read this first in every new conversation.

---

## 📖 What is VibeLog?

VibeLog is a **voice-first conversational publishing platform** that transforms spoken thoughts into beautiful, AI-generated content and publishes it across multiple platforms. It's not a blog platform—it's a **vibelog platform**.

**Tagline**: "Your AI publishing assistant that speaks your language"

**Core Innovation**: Conversational interface where users speak to an AI that helps them refine and publish content through natural dialogue—no buttons, no forms, just conversation.

---

## 🎯 Product Vision & Philosophy

### Current Strategy (from pivot.md)

**Conversational Publishing Platform**: Users speak their thoughts → AI generates polished content → Users refine through voice conversation → AI publishes everywhere.

**Key Differentiators**:

- Voice-first, conversation-native interface
- No button-heavy UI (conversation beats buttons)
- AI responds with voice, not just text
- Natural language commands ("make it spicier", "publish on X")
- Context retention within sessions

**Launch Target**: December 25, 2025 (Product Hunt)
**Validation**: 66 spa users ready to beta test
**Budget**: $3k/month (APIs + hosting)

### Long-term Vision (from living-web-2026.md)

**The Living Web**: Building a consciousness layer for humanity where:

- Every vibelog becomes conversational (readers can chat with content)
- Content evolves and responds (not static)
- Voice cloning allows AI to respond AS the creator
- Global knowledge graph of connected ideas
- Digital immortality for creators

**Philosophy**:

1. Voice First, Always
2. Conversation Over Interface
3. Trust Over Control (progressive automation)
4. Living Over Static (content grows)
5. Connection Over Metrics
6. Simple Over Complete

---

## 🏗️ Tech Stack

### Core Technologies

- **Framework**: Next.js 15.5.2 (App Router)
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (buckets: vibelogs, avatars, videos)

### AI Services

- **OpenAI GPT-4**: Content generation, conversation
- **OpenAI Realtime API**: Voice-to-voice conversation
- **OpenAI Whisper**: Speech-to-text transcription
- **DALL-E 3 / Gemini 2.5 Flash**: Image generation
- **Google Veo 3.1** (via fal.ai): Video generation
- **Modal.com / ElevenLabs**: Voice synthesis (TTS)

### UI/Styling

- **CSS Framework**: Tailwind CSS 3.4.17
- **Components**: Radix UI primitives
- **Icons**: Lucide React 0.543
- **Animations**: tailwindcss-animate
- **Toast**: Sonner 2.0
- **State Management**: Zustand 5.0
- **Data Fetching**: TanStack Query 5.87

### Development Tools

- **Testing**: Vitest 3.2 (unit) + Playwright 1.55 (E2E + visual)
- **Linting**: ESLint 9 (eslint.config.mjs)
- **Formatting**: Prettier 3.6 with prettier-plugin-tailwindcss
- **Git Hooks**: Husky 9.1 + lint-staged
- **Analytics**: PostHog
- **Internationalization**: next-intl 4.3

---

## 📁 Project Structure

```
/app                    # Next.js routes (App Router)
  /[username]           # Public user profiles
  /about                # About page
  /admin                # Admin panel (user management, analytics)
    /analytics          # Analytics dashboard
    /users              # User management
  /api                  # API route handlers (35+ endpoints)
    /admin              # Admin APIs (users, quotas, analytics)
    /auth               # Authentication endpoints
    /comments           # Comment management
    /generate-vibelog   # AI content generation
    /transcribe         # Audio transcription
    /publish            # Multi-platform publishing
    /vibe               # Vibe Communication Engine APIs
      /analyze          # Vibe analysis
      /packet/send      # VTP packet transmission
      /os/adapt         # OS layer adaptation
    /video              # Video generation APIs
      /generate         # Generate single video
      /generate-batch   # Batch video generation
      /status           # Check generation status
      /reset-stuck      # Reset stuck statuses
  /auth                 # Auth pages (login, signup)
  /community            # Community features
  /dashboard            # User dashboard
  /faq                  # FAQ page
  /mic-lab              # Microphone testing playground
  /pricing              # Pricing page
  /processing-lab       # Processing animation playground
  /publish-lab          # Publishing flow testing
  /settings             # User settings
  /transcript-lab       # Transcription testing
  /v                    # Vibelog viewer
  /vibelogs             # Vibelog management
    /new                # Create new vibelog
    /[id]/edit          # Edit vibelog

/components             # React components
  /ui                   # Reusable UI primitives
    button.tsx          # Button variants
    input.tsx           # Input field
    textarea.tsx        # Textarea
    toast.tsx           # Toast notifications
    tooltip.tsx         # Tooltips
    accordion.tsx       # Accordions
    AppSheet.tsx        # Side panel component
  /admin                # Admin-specific components
  /comments             # Comment components
  /common               # Shared components
  /conversation         # Conversation UI components
  /home                 # Homepage components
  /icons                # Custom icon components
  /mic                  # Microphone recording components
  /profile              # Profile components
  /providers            # Context providers (theme, query, etc.)
  /settings             # Settings components
  /vibe                 # Vibe engine UI components
  /vibelog              # Vibelog-specific components
  /video                # Video player/generator components
    VideoPlayer.tsx     # Video playback
    VideoGenerator.tsx  # Video generation UI

  # Top-level components
  AccountSheet.tsx      # User account panel
  AudioPlayer.tsx       # Audio playback component
  CreatorCard.tsx       # Creator profile card
  ExportButton.tsx      # Export functionality
  GlobalAudioPlayer.tsx # Global audio player state
  MicRecorder.tsx       # Main recording interface
  Navigation.tsx        # Site navigation
  OnboardingModal.tsx   # User onboarding
  PublicVibelogContent.tsx  # Public vibelog display
  VibelogActions.tsx    # Vibelog action buttons
  VibelogCard.tsx       # Vibelog preview card
  VibelogContentRenderer.tsx  # Content rendering
  VibelogEditModal.tsx  # Edit modal (simple)
  VibelogEditModalFull.tsx    # Edit modal (full-featured)

/lib                    # Pure logic, utilities, services
  analytics.ts          # Analytics tracking (PostHog)
  audioLimiter.ts       # Audio recording limits
  auth-admin.ts         # Admin authentication
  auth-cache.ts         # Auth caching
  client-logger.ts      # Client-side logging
  command-parser.ts     # Natural language command parsing
  command-patterns.ts   # Command pattern definitions
  config.ts             # App configuration
  conversation-engine.ts # Conversation management
  date-utils.ts         # Date formatting utilities
  ensure-profile.ts     # Profile initialization
  env.ts                # Environment variable validation
  errorHandler.ts       # Error handling utilities
  export.ts             # Export utilities
  godMode.ts            # Admin override utilities
  image.ts              # Image processing
  image-filters.ts      # Image filter effects
  image-orientation.ts  # Image orientation fixes
  logger.ts             # Server-side logging
  rateLimit.ts          # Rate limiting
  seo.ts                # SEO utilities
  session.ts            # Session management
  social-links.ts       # Social media link parsing
  storage.ts            # Supabase storage utilities
  supabase.ts           # Supabase client
  supabaseAdmin.ts      # Supabase admin client
  utils.ts              # General utilities

  /publishers           # Platform-specific publishers
  /vibe                 # Vibe Communication Engine
    detector.ts         # Vibe analysis and detection
    humor.ts            # Humor/sarcasm detection
    os-layer.ts         # OS integration layer
    safety.ts           # Safety and ethics checks
    types.ts            # Vibe type definitions
    vtp.ts              # Vibe Transmission Protocol
  /video                # Video generation utilities
    generator.ts        # fal.ai integration
    storage.ts          # Video storage in Supabase
    types.ts            # Video type definitions
    index.ts            # Video module exports

/hooks                  # Custom React hooks
  useAnalytics.ts       # Analytics tracking hook
  useAudioEngine.ts     # Audio recording engine
  useAudioPlayback.ts   # Audio playback control
  useAutoPlayVibelogAudio.ts  # Auto-play functionality
  useBulletproofSave.ts # Robust save mechanism
  useConversation.ts    # Conversation state
  useProfile.ts         # User profile data
  useSaveVibelog.ts     # Vibelog saving
  useSpeechRecognition.ts  # Speech recognition
  useTextToSpeech.ts    # Text-to-speech
  useToneSettings.ts    # Tone customization
  useVibe.ts            # Vibe engine hook
  useVibelogAPI.ts      # Vibelog API operations
  useVibelogTransfer.ts # Vibelog transfer
  useVoiceActivityDetection.ts  # Voice activity detection

/state                  # State management (Zustand)
  audio-player-store.ts # Global audio player state
  conversation-state.ts # Conversation state

/tests                  # Unit + E2E + visual tests
  /unit                 # Unit tests (Vitest)
  /e2e                  # End-to-end tests (Playwright)
  controls-e2e.spec.ts  # Control flow E2E tests
  e2e-publish-flow.spec.ts     # Publishing flow
  e2e-transcription-flow.spec.ts  # Transcription flow
  micrecorder.spec.ts   # Microphone recorder tests
  processing-animation.spec.ts  # Processing animation tests
  publish-actions.spec.ts       # Publish action tests
  refactor-safety.spec.ts       # Refactor safety tests
  transcription-panel.spec.ts   # Transcription panel tests
  *-snapshots/          # Visual regression snapshots

/supabase               # Database migrations and config
  /migrations           # SQL migration files (chronological)

/scripts                # Utility scripts
/types                  # TypeScript type definitions
/locales                # Internationalization files
/public                 # Static assets
/docs                   # Additional documentation

/.github/workflows      # CI/CD workflows
  tests.yml             # Test runner (smoke tests)
  auto-merge-after-deploy.yml  # Auto-merge workflow

Configuration files:
- package.json          # Dependencies and scripts
- tsconfig.json         # TypeScript configuration
- eslint.config.mjs     # ESLint configuration
- vitest.config.ts      # Vitest test configuration
- playwright.config.ts  # Playwright E2E test configuration
- tailwind.config.ts    # Tailwind CSS configuration
- next.config.js        # Next.js configuration
- .env.example          # Environment variable template
```

---

## 🎨 Branding & Terminology

### CRITICAL: Always Use These Terms

✅ **CORRECT**:

- **vibelog** (lowercase, one word) - The content piece
- **Vibelog** (capitalized) - When starting a sentence
- **VibeLog** (brand name) - The platform/product
- **vibelogs** (plural)
- **vibelogger** - Person who creates
- **vibelogging** - The act of creating

❌ **NEVER USE**:

- ~~blog~~ / ~~Blog post~~ / ~~blogging~~ / ~~blogger~~

### Voice & Tone

- **Conversational**: Speak like humans, not robots
- **Energetic**: Excited about voice-first content
- **Empowering**: Make creation effortless
- **Playful**: "Vibe" implies fun, flow, energy
- **Innovative**: Pioneers in voice-to-content

---

## 🔧 Development Standards (from engineering.md)

### Non-Negotiables

- **Files**: Target 150-200 LOC, max ~300 LOC
- **Functions**: Single purpose, ≤80 LOC (target 20-60)
- **Refactors**: Never without unit + E2E + visual tests
- **Accessibility**: Keyboard-first, focus rings visible, ARIA accurate
- **Performance**: Interactions <100ms, smooth 60fps, CLS ~0
- **Determinism**: Freeze randomness (time, animations, seeded data)

### Testing Requirements (Golden Matrix)

1. **Unit Tests** (Vitest): Reducers, hooks, services
2. **E2E Tests** (Playwright): Real user flows (happy + error paths)
3. **Visual Snapshots** (Playwright): UI regression detection

**Rules**:

- Every UI change → snapshots
- Every behavior change → unit + one E2E
- CI blocks merge if any fail
- Snapshots updated only with reviewer note + "approved-diff" label

**Test Configuration**:

- Unit tests: `tests/unit/**/*.{test,spec}.{js,ts,tsx}` (Vitest)
- E2E tests: `tests/**/*.spec.ts` (Playwright, excluding unit tests)
- CI runs only critical E2E tests (`e2e-*.spec.ts`) for speed
- Visual snapshots stored in `*-snapshots/` directories

### Git Workflow

1. Always commit to branch first (convention: `feature/*`, `fix/*`, `refactor/*`)
2. Create PR from branch to main
3. Must pass CI tests (typecheck, lint, unit, E2E, visual)
4. Conventional commits: `feat:`, `fix:`, `refactor:`

### Component Reuse Principle

**ALWAYS check for existing components before building new ones**:

1. Search `/components/ui/` for primitives
2. Check existing patterns in similar files
3. Use Radix UI for accessible primitives
4. Use Lucide React for icons
5. Match existing styling and structure

---

## 🎯 Key Features & Systems

### 1. Voice Recording & Transcription

- Browser-based audio capture (MediaRecorder API)
- OpenAI Whisper for speech-to-text
- Real-time waveform visualization
- Audio quality limiting and validation
- Files: `components/MicRecorder.tsx`, `hooks/useAudioEngine.ts`, `lib/audioLimiter.ts`

### 2. Conversational Editing

- Natural language command parsing
- AI voice responses
- Context retention across edits
- Iterative refinement
- Files: `lib/command-parser.ts`, `lib/command-patterns.ts`, `lib/conversation-engine.ts`, `hooks/useConversation.ts`, `state/conversation-state.ts`

### 3. Multi-Platform Publishing

- Twitter/X (browser automation with encrypted credentials)
- p69 integration
- Future: Instagram, TikTok, LinkedIn
- One-click or voice-command publishing
- Files: `lib/publishers/`, `app/api/publish/`, `components/VibelogActions.tsx`

### 4. Vibe Communication Engine

**The foundational system for emotion-aware communication**:

- **Vibe Detection**: AI analyzes text for emotional dimensions (joy, energy, trust, etc.)
- **Vibe Transmission Protocol (VTP)**: Send "vibe packets" with metadata
- **Vibelog OS Layer**: Vibe-based rules and UI adaptation
- **Safety & Ethics**: Detects passive-aggression, emotional masking, manipulation
- **Fun Modules**: Sarcasm detection, humor analysis, flirtation detection

**Key Files**:

- `lib/vibe/detector.ts` - Vibe analysis (8 emotional dimensions)
- `lib/vibe/vtp.ts` - Transmission protocol
- `lib/vibe/os-layer.ts` - OS integration and UI adaptation
- `lib/vibe/safety.ts` - Safety and ethics checks
- `lib/vibe/humor.ts` - Humor and sarcasm detection
- `lib/vibe/types.ts` - Type definitions
- `hooks/useVibe.ts` - React hook for vibe features
- `app/api/vibe/*` - API endpoints

### 5. Video Generation

**AI-powered video creation using Google Veo 3.1 via fal.ai**:

- Text-to-video from vibelog content (AI-generated prompts)
- Image-to-video using cover images
- Automatic storage in Supabase Storage (`videos` bucket)
- Real-time generation status tracking
- Batch generation support
- Stuck status recovery mechanism
- Cost: ~$0.80 per 8-second video

**Key Files**:

- `lib/video/generator.ts` - fal.ai integration
- `lib/video/storage.ts` - Supabase upload and URL generation
- `lib/video/types.ts` - Type definitions
- `components/video/VideoPlayer.tsx` - Video playback UI
- `components/video/VideoGenerator.tsx` - Video generation UI
- `app/api/video/generate/route.ts` - Single generation endpoint
- `app/api/video/generate-batch/route.ts` - Batch generation
- `app/api/video/status/route.ts` - Status checking
- `app/api/video/reset-stuck/route.ts` - Recovery endpoint

**Database Fields** (in `vibelogs` table):

- `video_url`: Public URL of generated video
- `video_generation_status`: 'idle' | 'generating' | 'completed' | 'failed'
- `video_generated_at`: Timestamp of successful generation

### 6. Admin Panel

**Comprehensive admin dashboard for platform management**:

- User management (view, search, quotas)
- Analytics dashboard (user metrics, growth charts)
- Platform health monitoring
- Quota management
- Files: `app/admin/*`, `app/api/admin/*`, `components/admin/*`

---

## 🗄️ Database Schema

### Core Tables

- `vibelogs` - Main content table
  - Content: title, content, audio_url, cover_image_url
  - Video: video_url, video_generation_status, video_generated_at
  - Vibe: vibe_scores, primary_vibe
  - Metadata: views, likes, is_published, created_at, updated_at
  - Relations: user_id (foreign key to profiles)

- `profiles` - User profiles
  - Fields: username, full_name, avatar_url, bio, website
  - Social: twitter_username, instagram_username
  - Quotas: max_vibelogs, max_storage_mb
  - Stats: total_views, total_likes

- `vibe_analyses` - Vibe analysis results
- `vibe_packets` - VTP packets
- `user_vibe_states` - User's current emotional state
- `vibelog_conversations` - Chat history
- `vibelog_edit_history` - Iteration tracking
- `comments` - Comment system

### Storage Buckets

- `vibelogs` - Audio files and cover images
- `avatars` - User profile pictures
- `videos` - Generated video files

### Migration Commands

```bash
pnpm db:migrate    # Apply migrations to linked project
pnpm db:status     # Check migration status
pnpm db:reset      # Reset local database (dev only!)
```

**Important**: Code deploys automatically via Vercel, but database migrations must be applied manually using `pnpm db:migrate` after schema changes.

---

## 🔒 Security & API Standards

### Input Validation

- **Zod schemas** for all API inputs (see `api.md` for patterns)
- **DOMPurify** for HTML sanitization
- **Rate limiting** on expensive operations (`lib/rateLimit.ts`)
- **JWT tokens** for authentication (Supabase Auth)

### Error Handling

- Structured error codes: VALIDATION_FAILED, QUOTA_EXCEEDED, UNAUTHORIZED, etc.
- User-friendly error messages
- Sentry integration for error tracking (planned)
- Proper HTTP status codes (see `api.md` for standards)
- Files: `lib/errorHandler.ts`, `lib/client-logger.ts`, `lib/logger.ts`

### Environment Variables

Required in `.env.local` (see `.env.example` for template):

**Supabase**:

- `NEXT_PUBLIC_SUPABASE_URL` - Database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (server-side only)

**AI Services**:

- `OPENAI_API_KEY` - OpenAI (GPT-4, Whisper, DALL-E)
- `GEMINI_API_KEY` - Google Gemini (image generation)
- `FAL_API_KEY` - fal.ai (video generation)
- `ELEVENLABS_API_KEY` - ElevenLabs (TTS fallback)
- `MODAL_TTS_ENDPOINT` - Modal.com TTS endpoint
- `MODAL_ENABLED` - Enable Modal TTS

**Third-party Services**:

- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host URL
- `NEXT_PUBLIC_EMAILJS_SERVICE_ID` - EmailJS service
- `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` - EmailJS template
- `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` - EmailJS public key
- `STABILITY_API_KEY` - Stability AI (fallback)

**Publishing**:

- `TWITTER_SESSION_KEY` - Twitter encryption key (32 chars)
- `TWITTER_USERNAME` - Twitter username
- `TWITTER_PASSWORD` - Twitter password

**App Configuration**:

- `NEXT_PUBLIC_APP_URL` - App domain (for links)
- `NODE_ENV` - development | production | test

---

## 🎨 UI/UX Patterns

### Styling Conventions

- **Borders**: `border-border/50`, `border-border/30`
- **Backgrounds**: `bg-card`, `bg-background`, `bg-muted`
- **Text**: `text-foreground`, `text-muted-foreground`
- **Accent**: `text-electric`, `bg-electric`
- **Z-index**: `z-50` for dropdowns, `z-[100]` for modals

### Common Components (in /components/ui/)

- `button.tsx` - Button variants (default, destructive, outline, ghost, link)
- `input.tsx`, `textarea.tsx` - Form inputs with consistent styling
- `toast.tsx` / `use-toast.tsx` - Toast notifications (Sonner)
- `tooltip.tsx` - Tooltips (Radix UI)
- `accordion.tsx` - Accordions (Radix UI)
- `AppSheet.tsx` - Side panels (uses Radix Dialog)

### Audio Playback UX Standards

- Play button (▶️) switches to pause (⏸️) when active
- Progress indicator with seekable scrubber
- Current time updates in real-time
- Immediate visual feedback on press
- Proper ARIA labels for accessibility
- Global audio player prevents multiple simultaneous playback

---

## 📊 Monitoring & Observability

### Service Level Objectives (SLOs)

- **Availability**: 99.9% uptime (43 min downtime/month)
- **Performance**: p95 response time < 2s
- **Error Rate**: < 0.1% (1 error per 1000 requests)

### Core Web Vitals Targets

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Monitoring Tools

- **PostHog**: Analytics and product insights (configured)
- **Vercel**: Infrastructure monitoring (automatic)
- **Sentry**: Error tracking (planned)

---

## 🚀 Deployment & CI/CD

### Environments

- **Development**: `localhost:3000`
- **Production**: Auto-deployed via Vercel

### Deployment Process

1. Code changes deployed automatically via Vercel on merge to `main`
2. Database migrations applied manually: `pnpm db:migrate --linked`
3. Monitor error rates post-deployment

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/tests.yml`):

- Runs on: PR (opened, sync, reopened, labeled) and push to main
- Currently: Smoke tests (dependency installation)
- Planned: Full test suite (unit + E2E + visual)

**Auto-merge workflow** (`.github/workflows/auto-merge-after-deploy.yml`):

- Automatic merge after successful Vercel deployment
- Requires passing checks

### Available Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server

# Testing
pnpm test             # Unit tests (Vitest)
pnpm test:unit        # Unit tests (explicit)
pnpm test:unit:watch  # Unit tests in watch mode
pnpm test:e2e         # End-to-end tests (Playwright)
pnpm test:e2e:ui      # E2E tests with UI
pnpm test:e2e:debug   # E2E tests in debug mode
pnpm test:e2e:report  # Show E2E test report
pnpm test:ci          # All tests (CI mode)
pnpm test:all         # All tests (local)

# Code Quality
pnpm lint             # ESLint
pnpm analyze          # Bundle size analysis

# Database
pnpm db:migrate       # Apply migrations
pnpm db:status        # Check migration status
pnpm db:reset         # Reset local database (dev only!)

# Git Hooks
pnpm prepare          # Install Husky hooks
```

**Lint-staged** (pre-commit hooks):

- Auto-fix and format `.{ts,tsx,js,jsx}` files with ESLint and Prettier
- Auto-format `.{json,md,yml,yaml}` files with Prettier

---

## 🎯 Current Focus & Roadmap

### Recent Work (Last 10 Commits)

1. Video generation error handling improvements
2. Stuck status reset API endpoint
3. Supabase Storage bucket name fixes
4. Video generation feature stabilization
5. Claude context documentation

### Immediate Priorities

1. **Conversational Editing MVP**
   - Voice-first chat interface for owners to edit their vibelogs
   - Natural language commands
   - AI voice responses

2. **Publishing Automation**
   - Multi-platform distribution
   - Natural language platform selection
   - Confirmation with live links

3. **Spa Beta Testing**
   - Roll out to 66 spa users
   - Collect feedback and testimonials
   - Iterate on UX

### Q1 2026 Goals

- Own vibelog conversation feature complete
- Voice-to-voice conversation working smoothly
- Publishing to X/Twitter reliable
- Positive user testimonials collected

### Christmas Launch (Dec 25, 2025)

- Product Hunt submission
- Demo video showcasing conversational flow
- Landing page optimized for conversion
- Case study: How spas publish 100+ posts/month via voice

---

## 💡 Key Insights for AI Assistants

### When Working on VibeLog:

1. **Voice First**: If adding a feature, prioritize voice control
2. **Conversation Native**: Think "dialogue" not "buttons"
3. **Reuse Components**: Always search `/components/ui/` before building new
4. **Test Everything**: Unit + E2E + Visual for all changes
5. **Brand Consistency**: Use "vibelog" not "blog"
6. **Performance Matters**: < 100ms interactions, 60fps animations
7. **Accessibility**: Keyboard navigation, ARIA labels, focus rings
8. **Path Aliases**: Use `@/` for imports (configured in tsconfig.json)

### Common Tasks:

**Adding a new API endpoint**:

1. Create route handler in `app/api/[endpoint]/route.ts`
2. Follow patterns in `api.md` (Zod validation, error codes, status codes)
3. Use `lib/errorHandler.ts` for consistent error responses
4. Add rate limiting for expensive operations
5. Test with unit tests in `tests/unit/`

**Creating a new component**:

1. Check `/components/ui/` for existing similar components
2. Use Radix UI primitives for accessibility
3. Use Lucide React for icons
4. Match existing Tailwind patterns (see "Styling Conventions")
5. Keep files under 300 LOC
6. Add visual regression tests with Playwright

**Database schema changes**:

1. Create migration: `supabase migration new [description]`
2. Write SQL in `supabase/migrations/[timestamp]_[description].sql`
3. Test locally: `pnpm db:reset` then `pnpm db:migrate`
4. Apply to production: `pnpm db:migrate --linked`

**Adding new hooks**:

1. Create in `/hooks/use[Name].ts`
2. Single purpose, keep under 80 LOC
3. Add unit tests in `tests/unit/hooks/`
4. Document with JSDoc comments

### Anti-Patterns to Avoid:

❌ Building custom dialogs (use Radix Dialog)
❌ Creating new dropdown patterns (use Radix Select)
❌ Using "blog" terminology (always "vibelog")
❌ Skipping tests (breaks CI)
❌ Inline styles instead of Tailwind
❌ Files over 300 LOC (split into smaller modules)
❌ Multiple purposes in one function (single responsibility)
❌ Ignoring TypeScript errors (strict typing)
❌ Hardcoding values (use config.ts or env variables)
❌ Non-deterministic tests (freeze time/animations/random data)

### TypeScript Configuration Notes:

- **Strict mode**: OFF (to allow rapid prototyping)
- **No implicit any**: OFF
- **Skip lib check**: ON (for faster builds)
- **Path alias**: `@/` maps to project root
- **Target**: ES2017
- **Module**: ESNext with Node resolution

---

## 📚 Essential Documentation

### Must-Read Files (in order):

1. `CLAUDE.md` (this file) - Start here for comprehensive overview
2. `branding.md` - Brand voice and terminology
3. `living-web-2026.md` - Long-term vision and philosophy
4. `engineering.md` - Development standards and testing (Golden Matrix)
5. `pivot.md` - Current product strategy
6. `api.md` - API design patterns
7. `deployment.md` - Infrastructure and CI/CD
8. `monitoring.md` - Observability and SLOs
9. `DEVELOPMENT_GUIDELINES.md` - Component reuse checklist

### Feature-Specific Docs:

- `VIDEO_GENERATION.md` - Video feature documentation
- `TWITTER_AUTO_POST_SETUP.md` - Twitter publishing setup
- `MODAL_SETUP.md` - Modal.com TTS setup
- `VIBE_ENGINE_IMPLEMENTATION.md` - Vibe Communication Engine
- `ADMIN_SETUP_INSTRUCTIONS.md` - Admin panel setup

### Other Reference Docs:

- `README.md` - Quick start guide
- `ANALYSIS.md` - Codebase analysis
- `CODEBASE_ANALYSIS.md` - Detailed codebase structure
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation summaries
- `MIGRATION_INSTRUCTIONS.md` - Database migration guide

---

## 🎬 Getting Started as an AI Assistant

### Initial Setup:

When starting a new conversation:

1. **Read this file first** (CLAUDE.md)
2. **Understand the task** from user's request
3. **Check existing patterns** by searching the codebase
4. **Review related docs** (branding, engineering, api.md as needed)
5. **Follow conventions** established in similar files
6. **Test thoroughly** before marking complete
7. **Update docs** if adding new features

### Quick Reference Checklist:

Before implementing any feature:

- [ ] Searched `/components/ui/` for existing components
- [ ] Reviewed similar implementations in codebase
- [ ] Checked `api.md` for API patterns
- [ ] Verified terminology follows `branding.md`
- [ ] Planned unit + E2E + visual tests
- [ ] Confirmed file size will stay under 300 LOC
- [ ] Using TypeScript with proper types
- [ ] Using Tailwind (no inline styles)
- [ ] Following accessibility standards (ARIA, keyboard nav)
- [ ] Performance targets met (<100ms interactions)

### Development Workflow:

1. **Branch**: Create feature branch (`feature/[name]`)
2. **Code**: Implement with tests
3. **Test**: Run `pnpm test:all` locally
4. **Lint**: Run `pnpm lint` (auto-fixes on commit)
5. **Commit**: Use conventional commits (`feat:`, `fix:`, `refactor:`)
6. **Push**: Push to branch
7. **PR**: Create pull request to main
8. **CI**: Wait for CI checks to pass
9. **Merge**: Auto-merge after Vercel deployment

### When Stuck:

- Check similar implementations in the codebase
- Review the specific documentation file (e.g., `api.md` for APIs)
- Look at test files for usage examples
- Search for error messages in `lib/errorHandler.ts`
- Check Supabase schema in `supabase/migrations/`

---

## 🌌 Remember the Mission

You're not just writing code for a startup. You're helping build **a living web** that makes the internet feel again. Every commit should ask: "Does this help the web feel alive?"

The goal is to create a platform where:

- Thoughts flow naturally from mind to voice to content
- Conversations replace clicking
- Content evolves and responds
- Creators connect authentically
- The web becomes more human

Let's vibe it. 🌌

---

**Last Updated**: 2025-11-16
**Current Branch**: claude/claude-md-mi11s7bcmvg5n3ok-01DFGknWueEkKqzJK7F927eo
**Main Branch**: main
**Repository**: goldenfocus/vibelog
**Status**: Active development toward December 25, 2025 launch

---

## 📝 Changelog

### 2025-11-16

- Complete rewrite with comprehensive codebase analysis
- Added detailed project structure with all directories and key files
- Documented all 35+ API endpoints
- Added TypeScript configuration details
- Enhanced testing documentation with configuration details
- Added environment variables with complete list
- Documented recent work and commit history
- Added development workflow and quick reference checklist
- Expanded video generation documentation with all endpoints
- Added admin panel documentation
- Improved formatting and organization throughout

### 2025-11-15

- Initial version with basic structure and core concepts
