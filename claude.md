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
- **Storage**: Supabase Storage

### AI Services

- **OpenAI GPT-4**: Content generation, conversation
- **OpenAI Realtime API**: Voice-to-voice conversation
- **OpenAI Whisper**: Speech-to-text transcription
- **DALL-E 3**: Image generation
- **Google Veo 3.1** (via fal.ai): Video generation
- **ElevenLabs**: Voice synthesis (fallback)

### UI/Styling

- **CSS Framework**: Tailwind CSS 3.4
- **Components**: Radix UI primitives
- **Icons**: Lucide React
- **Animations**: tailwindcss-animate
- **Toast**: Sonner
- **State**: Zustand 5.0
- **Data Fetching**: TanStack Query 5.87

### Development Tools

- **Testing**: Vitest (unit) + Playwright (E2E + visual)
- **Linting**: ESLint 9 + Prettier
- **Git Hooks**: Husky + lint-staged
- **Analytics**: PostHog
- **Internationalization**: next-intl

---

## 📁 Project Structure

```
/app                # Next.js routes (App Router)
  /api              # API route handlers
    /vibe           # Vibe engine APIs
    /video          # Video generation APIs
  /[locale]         # Internationalized routes

/components         # React components
  /ui               # Reusable UI primitives (buttons, inputs, etc.)
  /vibe             # Vibe engine UI components
  /video            # Video player/generator components
  /mic              # Microphone recording components
  /conversation     # Chat/conversation features
  /providers        # Context providers

/lib                # Pure logic, utilities, services
  /vibe             # Vibe Communication Engine
  /video            # Video generation utilities
  export.ts         # Export utilities
  storage.ts        # Storage utilities

/hooks              # Custom React hooks
  useVibe.ts        # Vibe engine hook

/state              # State management (Zustand)

/tests              # Unit + E2E + visual tests
/lab                # Component playground for testing UI states

/supabase           # Database migrations and config
  /migrations       # SQL migration files

/docs               # Additional documentation
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
- **Security**: Input validation with Zod, HTML sanitization with DOMPurify

### Testing Requirements (Golden Matrix)

1. **Unit Tests** (Vitest): Reducers, hooks, services
2. **E2E Tests** (Playwright): Real user flows (happy + error paths)
3. **Visual Snapshots** (Playwright): UI regression detection

**Rules**:

- Every UI change → snapshots
- Every behavior change → unit + one E2E
- CI blocks merge if any fail

### Git Workflow

1. Always commit to branch first
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

- Browser-based audio capture
- OpenAI Whisper for speech-to-text
- Real-time preview

### 2. Conversational Editing

- Natural language commands
- AI voice responses
- Context retention
- Iterative refinement

### 3. Multi-Platform Publishing

- Twitter/X (browser automation)
- p69 integration
- Future: Instagram, TikTok, LinkedIn
- One-click or voice-command publishing

### 4. Vibe Communication Engine

**The foundational system for emotion-aware communication**:

- **Vibe Detection**: AI analyzes text for emotional dimensions
- **Vibe Transmission Protocol (VTP)**: Send "vibe packets" with metadata
- **Vibelog OS Layer**: Vibe-based rules and UI adaptation
- **Safety & Ethics**: Detects passive-aggression, emotional masking
- **Fun Modules**: Sarcasm detection, flirtation amplifier

**Key Files**:

- `lib/vibe/detector.ts` - Vibe analysis
- `lib/vibe/vtp.ts` - Transmission protocol
- `lib/vibe/os-layer.ts` - OS integration
- `hooks/useVibe.ts` - React hook
- `app/api/vibe/*` - API endpoints

### 5. Video Generation

**AI-powered video creation using Google Veo 3.1**:

- Text-to-video from vibelog content
- Image-to-video using cover images
- Automatic storage in Supabase
- Real-time generation status tracking
- Cost: ~$0.80 per 8-second video

**Key Files**:

- `lib/video/generator.ts` - fal.ai integration
- `lib/video/storage.ts` - Supabase upload
- `components/video/VideoPlayer.tsx`
- `components/video/VideoGenerator.tsx`
- `app/api/video/generate/route.ts`

---

## 🗄️ Database Schema

### Core Tables

- `vibelogs` - Main content table
  - Includes: title, content, audio_url, cover_image_url
  - Video fields: video_url, video_generation_status, video_generated_at
  - Vibe fields: vibe_scores, primary_vibe
- `profiles` - User profiles
- `vibe_analyses` - Vibe analysis results
- `vibe_packets` - VTP packets
- `user_vibe_states` - User's current emotional state
- `vibelog_conversations` - Chat history
- `vibelog_edit_history` - Iteration tracking

### Migration Commands

```bash
pnpm db:migrate    # Apply migrations
pnpm db:status     # Check migration status
pnpm db:reset      # Reset local database (dev only)
```

**Important**: Code deploys automatically via Vercel, but database migrations must be applied manually using `pnpm db:migrate`.

---

## 🔒 Security & API Standards

### Input Validation

- **Zod schemas** for all API inputs
- **DOMPurify** for HTML sanitization
- **Rate limiting** on expensive operations
- **JWT tokens** for authentication

### Error Handling

- Structured error codes (VALIDATION_FAILED, QUOTA_EXCEEDED, etc.)
- User-friendly error messages
- Sentry integration for tracking
- Proper HTTP status codes

### Environment Variables

Required in `.env.local`:

- `OPENAI_API_KEY` - OpenAI services
- `FAL_API_KEY` - Video generation
- `SUPABASE_URL` - Database URL
- `SUPABASE_ANON_KEY` - Public key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key
- `NEXT_PUBLIC_APP_URL` - App domain

---

## 🎨 UI/UX Patterns

### Styling Conventions

- **Borders**: `border-border/50`, `border-border/30`
- **Backgrounds**: `bg-card`, `bg-background`, `bg-muted`
- **Text**: `text-foreground`, `text-muted-foreground`
- **Accent**: `text-electric`, `bg-electric`
- **Z-index**: `z-50` for dropdowns, `z-[100]` for modals

### Common Components (in /components/ui/)

- `button.tsx` - Button variants
- `input.tsx`, `textarea.tsx` - Form inputs
- `toast.tsx` / `use-toast.tsx` - Notifications
- `tooltip.tsx` - Tooltips
- `accordion.tsx` - Accordions
- `AppSheet.tsx` - Side panels (uses Radix Dialog)

### Audio Playback UX Standards

- Play button (▶️) switches to pause (⏸️) when active
- Progress indicator with seekable scrubber
- Current time updates in real-time
- Immediate visual feedback on press
- Proper ARIA labels for accessibility

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

- **Sentry**: Error tracking
- **PostHog**: Analytics and product insights
- **Vercel**: Infrastructure monitoring

---

## 🚀 Deployment & CI/CD

### Environments

- **Development**: `localhost:3000`
- **Staging**: `staging.vibelog.io`
- **Production**: `vibelog.io`

### Deployment Process

1. Code changes deployed automatically via Vercel on merge to `main`
2. Database migrations applied manually: `pnpm db:migrate`
3. Run smoke tests: `pnpm test:smoke`
4. Monitor error rates for 30 minutes

### Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server

# Testing
pnpm test             # Unit tests (Vitest)
pnpm test:e2e         # End-to-end tests (Playwright)
pnpm test:all         # Run all tests

# Code Quality
pnpm lint             # ESLint
prettier --write .    # Format code

# Database
pnpm db:migrate       # Apply migrations
pnpm db:status        # Check status
pnpm db:reset         # Reset local DB
```

---

## 🎯 Current Focus & Roadmap

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
3. **Reuse Components**: Always search before building new
4. **Test Everything**: Unit + E2E + Visual for all changes
5. **Brand Consistency**: Use "vibelog" not "blog"
6. **Performance Matters**: < 100ms interactions, 60fps animations
7. **Accessibility**: Keyboard navigation, ARIA labels, focus rings

### Common Tasks:

- **Adding API**: Follow patterns in `api.md`, use Zod validation
- **New Component**: Check `/components/ui/` first, use Radix UI
- **Database Change**: Create migration in `supabase/migrations/`
- **Testing**: Add unit test + E2E + visual snapshot
- **Styling**: Use Tailwind, match existing patterns

### Anti-Patterns to Avoid:

❌ Building custom dialogs (use Radix)
❌ Creating new dropdown patterns
❌ Using "blog" terminology
❌ Skipping tests
❌ Inline styles instead of Tailwind
❌ Files over 300 LOC

---

## 📚 Essential Documentation

Must-read files in order:

1. `branding.md` - Brand voice and terminology
2. `living-web-2026.md` - Long-term vision and philosophy
3. `engineering.md` - Development standards and testing
4. `pivot.md` - Current product strategy
5. `api.md` - API design patterns
6. `deployment.md` - Infrastructure and CI/CD
7. `monitoring.md` - Observability and SLOs
8. `DEVELOPMENT_GUIDELINES.md` - Component reuse checklist

Additional docs:

- `VIDEO_GENERATION.md` - Video feature documentation
- `docs/vibe-engine.md` - Vibe Communication Engine
- `docs/vibe-api-sdk.md` - Vibe API reference

---

## 🎬 Getting Started as an AI Assistant

When starting a new conversation:

1. **Read this file first** (you're doing it now!)
2. **Understand the task context** from user's request
3. **Search codebase** for existing patterns
4. **Follow established conventions** in similar files
5. **Test thoroughly** before marking complete
6. **Update docs** if adding new features

Remember: You're not just writing code for a startup. You're helping build **a living web** that makes the internet feel again. Every commit should ask: "Does this help the web feel alive?"

Let's vibe it. 🌌

---

**Last Updated**: 2025-11-15
**Current Branch**: feature/automatic-video-generation
**Main Branch**: main
**Status**: Active development toward December 25 launch
