# VibeLog Codebase Analysis

**Generated**: $(date)
**Project**: VibeLog - Voice-to-Vibelog Platform
**Framework**: Next.js 15.5.2 with React 19

---

## 📋 Executive Summary

VibeLog is a **voice-first content creation platform** that transforms spoken words into polished, publishable vibelog posts (called "vibelogs"). The platform uses AI (OpenAI GPT-4o-mini) to transcribe audio, generate engaging content, and enable multi-platform publishing.

### Key Features

- 🎤 **Voice Recording**: Browser-based audio capture with real-time transcription
- 🤖 **AI Content Generation**: Transforms transcriptions into polished vibelog posts with teasers
- 🎨 **Cover Image Generation**: AI-generated cover images for vibelogs
- 📱 **Multi-Platform Publishing**: Export to Twitter, LinkedIn, and other platforms
- 🌍 **Internationalization**: Support for 6 languages (en, de, es, fr, vi, zh)
- 👥 **User Profiles**: Username-based profiles with `/@username` URLs
- 💾 **Storage**: Supabase-based file storage for audio/video and TTS cache

---

## 🏗 Architecture Overview

### Tech Stack

| Layer                | Technology                           |
| -------------------- | ------------------------------------ |
| **Framework**        | Next.js 15.5.2 (App Router)          |
| **Runtime**          | Node.js 18+                          |
| **UI Library**       | React 19                             |
| **Database**         | Supabase (PostgreSQL)                |
| **Auth**             | Supabase Auth (OAuth: Google, Apple) |
| **Storage**          | Supabase Storage                     |
| **AI Services**      | OpenAI (GPT-4o-mini, Whisper)        |
| **State Management** | Zustand, React Query                 |
| **Styling**          | Tailwind CSS + Radix UI              |
| **Testing**          | Vitest (unit), Playwright (E2E)      |
| **i18n**             | next-intl                            |

### Project Structure

```
vibelog/
├── app/                      # Next.js App Router routes
│   ├── api/                  # API routes (30+ endpoints)
│   ├── [username]/           # User profile pages
│   ├── auth/                 # Authentication routes
│   └── [pages]/              # Main application pages
├── components/               # React components
│   ├── mic/                  # Recording & processing components
│   ├── profile/              # User profile components
│   ├── ui/                   # Reusable UI primitives (Radix)
│   └── providers/            # Context providers
├── hooks/                    # Custom React hooks (12 hooks)
├── lib/                      # Core utilities & services
│   ├── supabase.ts          # Database client
│   ├── conversation-engine.ts # Conversational AI engine
│   └── [utilities]          # Various helpers
├── state/                    # State management (Zustand stores)
├── types/                    # TypeScript definitions
├── locales/                  # i18n translations (6 languages)
├── supabase/                 # Database schema & migrations
├── tests/                    # Test suites
└── public/                   # Static assets
```

---

## 🔑 Core Components

### 1. Voice Recording Flow (`components/MicRecorder.tsx`)

**Purpose**: Main orchestrator for the voice recording and content generation pipeline.

**Key Responsibilities**:

- Manages recording state machine (`idle` → `recording` → `processing` → `complete`)
- Coordinates between audio engine, transcription, and AI generation
- Handles live transcript editing
- Manages teaser vs. full content display
- Controls edit modal and upgrade prompts

**State Machine** (`components/mic/useMicStateMachine.ts`):

```typescript
type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';
```

**Processing Pipeline**:

1. **Record** → Audio captured via `useAudioEngine`
2. **Transcribe** → Speech-to-text via `/api/transcribe`
3. **Generate** → Content generation via `/api/generate-vibelog`
4. **Cover Image** → AI image generation via `/api/generate-cover`
5. **Display** → Show teaser (free) or full content (logged-in)

### 2. Audio Engine (`components/mic/AudioEngine.ts`)

**Purpose**: Manages browser audio recording and real-time audio level analysis.

**Features**:

- Browser MediaRecorder API wrapper
- Real-time audio level visualization
- Voice Activity Detection (VAD)
- Multiple audio format support (webm, wav, mp4)
- 5-minute free tier limit with warnings

### 3. API Routes (`app/api/`)

**30+ API endpoints** organized by functionality:

#### Core Workflow

- `POST /api/transcribe` - Speech-to-text transcription
- `POST /api/generate-vibelog` - AI content generation
- `POST /api/generate-cover` - Cover image generation
- `POST /api/save-vibelog` - Persist vibelog to database

#### Content Management

- `GET /api/get-vibelogs` - List user's vibelogs
- `GET /api/get-vibelog/[id]` - Get single vibelog
- `POST /api/update-vibelog` - Update existing vibelog
- `DELETE /api/delete-vibelog/[id]` - Delete vibelog

#### Social Features

- `POST /api/like-vibelog/[id]` - Like a vibelog
- `GET /api/like-vibelog/[id]/users` - Get likers list
- `GET /api/get-liked-vibelogs` - Get user's liked vibelogs
- `POST /api/increment-view` - Track views
- `POST /api/track-view/[id]` - Detailed view tracking

#### Storage

- `POST /api/storage/upload` - Upload audio/video files
- `POST /api/storage/upload-url` - Get presigned upload URL
- `POST /api/upload-audio` - Simplified audio upload

#### Text-to-Speech

- `POST /api/text-to-speech` - Generate audio from text
- `POST /api/generate-missing-audio` - Batch TTS generation

#### User Management

- `GET /api/profile` - Get user profile
- `POST /api/profile/upload-image` - Upload avatar
- `POST /api/sync-avatars` - Sync avatars from OAuth

#### Utility

- `POST /api/claim-vibelog` - Claim anonymous vibelog
- `POST /api/regenerate-vibelog-text` - Regenerate content
- `POST /api/cleanup-storage` - Cleanup orphaned files
- `GET /api/debug-profile` - Debug endpoint
- `GET /api/debug-vibelog` - Debug endpoint

### 4. Database Schema (`supabase/schema.sql`)

**Main Tables**:

#### `profiles`

- User profile data (username, display_name, avatar_url)
- Subscription tier (free, pro, enterprise)
- Stats (total_vibelogs, total_views, total_shares)
- OAuth provider data (Google, Apple)

#### `vibelogs`

- Core vibelog content
- Metadata (title, slug, cover_image_url, audio_url)
- Content fields (transcription, teaser, full_content, markdown)
- Stats (views, likes, shares)
- Timestamps and user references

#### `vibelog_likes`

- Many-to-many relationship for likes
- Tracks user → vibelog likes

#### `rate_limits`

- Server-side rate limiting
- Key-based limiting (per user/IP)

### 5. State Management

#### Zustand Stores

- `state/conversation-state.ts` - Conversational AI state machine
- Used by `lib/conversation-engine.ts` for conversational publishing

#### React Query (`@tanstack/react-query`)

- Server state caching
- Optimistic updates
- Automatic refetching

### 6. Hooks (`hooks/`)

**12 custom hooks**:

- `useAudioEngine.ts` - Audio recording logic
- `useAudioPlayback.ts` - Audio playback control
- `useSpeechRecognition.ts` - Browser speech recognition
- `useVoiceActivityDetection.ts` - VAD implementation
- `useTextToSpeech.ts` - TTS integration
- `useConversation.ts` - Conversational AI interactions
- `useVibelogAPI.ts` - API client wrapper
- `useSaveVibelog.ts` - Save vibelog logic
- `useProfile.ts` - User profile management
- `useBulletproofSave.ts` - Robust save with retries
- `useVibelogTransfer.ts` - Transfer vibelog ownership
- `useAnalytics.ts` - PostHog analytics

---

## 🔄 Key Workflows

### Workflow 1: Voice-to-Vibelog Creation

```
1. User clicks record → startRecording()
2. Audio captured → useAudioEngine
3. Real-time transcription → useSpeechRecognition (optional live preview)
4. User stops recording → stopRecording()
5. Audio blob sent to → POST /api/transcribe
6. Transcription received → POST /api/generate-vibelog
7. AI generates:
   - Teaser (200-400 chars, curiosity-gap hook)
   - Full content (markdown with H1, H2 sections)
8. Optional: POST /api/generate-cover (AI image generation)
9. Display teaser (anonymous) or full content (logged-in)
10. User can edit, save, or publish
```

### Workflow 2: Publishing Flow

```
1. User clicks "Publish" → ExportButton component
2. Content formatted for platform (Twitter, LinkedIn, etc.)
3. Copy to clipboard or direct API posting
4. View tracking initiated → POST /api/track-view
5. Analytics event fired → useAnalytics
```

### Workflow 3: User Profile Management

```
1. OAuth sign-in → Supabase Auth
2. Profile created/updated → profiles table
3. Username normalized → sanitized for URL (/@username)
4. Avatar synced → POST /api/sync-avatars
5. Profile page accessible → /@username route
```

---

## 🎨 UI/UX Patterns

### Design System

- **Radix UI** primitives (Dialog, Toast, Tooltip, etc.)
- **Tailwind CSS** for styling
- **Dark mode** by default
- **Responsive** design (mobile-first)

### Component Architecture

```
MicRecorder (container)
├── Controls (record/stop/reset)
├── Waveform (audio visualization)
├── TranscriptionPanel (live transcript)
├── ProcessingAnimation (loading states)
├── AudioPlayer (playback)
├── VibelogContentRenderer (markdown → HTML)
├── PublishActions (share/edit buttons)
└── VibelogEditModal (edit interface)
```

### Internationalization

- **6 languages** supported (en, de, es, fr, vi, zh)
- **next-intl** for translations
- Translation files in `locales/`
- Components use `useI18n()` hook

---

## 🔐 Security & Performance

### Security Features

- **CSP headers** configured in `next.config.ts`
- **Rate limiting** per user/IP (`lib/rateLimit.ts`)
- **Row Level Security (RLS)** in Supabase
- **Authentication** via Supabase Auth
- **CORS** configured for API routes
- **Input validation** on API endpoints (transcription length limits)

### Performance Optimizations

- **Streaming responses** for AI generation
- **TTS caching** (content hash-based)
- **Image optimization** via Next.js Image
- **React Query caching** for API responses
- **Lazy loading** components
- **Bundle analysis** tool (`npm run analyze`)

### Rate Limits

- **Anonymous**: 10,000 requests/day
- **Authenticated**: 10,000 requests/15 minutes
- **Transcription**: Max 10,000 characters
- **Recording**: 5 minutes max (free tier)

---

## 🧪 Testing Strategy

### Test Suite Structure

```
tests/
├── unit/              # Vitest unit tests
├── e2e/               # Playwright E2E tests
├── *.spec.ts          # Component E2E tests
└── *.spec.ts-snapshots/ # Visual regression snapshots
```

### Testing Approach

1. **Unit Tests** (Vitest):
   - Hooks, utilities, parsers
   - Mock external APIs
2. **E2E Tests** (Playwright):
   - Full user workflows
   - Multi-browser testing
   - Visual regression
3. **Visual Snapshots**:
   - Component state variations
   - Responsive breakpoints
   - Accessibility checks

### Test Coverage

- Recording flow (`micrecorder.spec.ts`)
- Transcription panel (`transcription-panel.spec.ts`)
- Processing animation (`processing-animation.spec.ts`)
- Publish actions (`publish-actions.spec.ts`)
- Conversation engine (`conversation-engine.test.ts`)
- Command parser (`command-parser.test.ts`)

---

## 📊 Data Flow

### Request Flow (Typical)

```
Client Component
  ↓
Custom Hook (e.g., useVibelogAPI)
  ↓
API Route (/app/api/...)
  ↓
Rate Limiter (lib/rateLimit.ts)
  ↓
Supabase Client (lib/supabase.ts)
  ↓
Database (Supabase PostgreSQL)
```

### State Flow

```
Component State
  ↓
Zustand Store (if global)
  ↓
React Query Cache
  ↓
API Route
  ↓
Database
```

---

## 🚀 Deployment & DevOps

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations
- `OPENAI_API_KEY` - OpenAI API access
- `NEXT_PUBLIC_APP_URL` - App base URL

### Build & Deploy

- **Framework**: Next.js (Vercel-optimized)
- **CI/CD**: Likely Vercel or custom
- **Database**: Supabase (managed PostgreSQL)
- **Storage**: Supabase Storage buckets

### Monitoring

- **Analytics**: PostHog (via `lib/analytics.ts`)
- **Error Tracking**: Likely Sentry or similar
- **Logging**: Console logs (dev), structured logs (prod)

---

## 🔮 Future Architecture (Pivot)

### Conversational Publishing Assistant

According to `pivot.md`, the platform is pivoting to a **conversational AI assistant** model:

**Current State**: Voice → Transcription → AI Generation → Manual Publishing

**Target State**: Voice → Conversational Refinement → Multi-Platform Publishing

**Key Changes**:

- `lib/conversation-engine.ts` - Already implemented
- Voice commands for edits ("make it spicier", "change image 2")
- Multi-turn refinement dialogue
- Voice + text hybrid interface
- Real-time content updates

---

## 📝 Code Quality Standards

### Engineering Guidelines (`engineering.md`)

- **File size**: Max 300 LOC, target 150-200 LOC
- **Function size**: Max 80 LOC, target 20-60 LOC
- **Testing**: Unit + E2E + visual regression required
- **Accessibility**: Keyboard-first, ARIA compliant
- **Performance**: <100ms interactions, 60fps animations

### Patterns

- **Server Components** where possible
- **Client Components** for interactivity
- **API Routes** for server-side logic
- **Custom Hooks** for reusable logic
- **TypeScript** throughout (strict mode off currently)

---

## 🐛 Known Issues & Technical Debt

### Current Limitations

1. **TypeScript strict mode**: Disabled (per `tsconfig.json`)
2. **Mock responses**: Development uses mock OpenAI responses
3. **Error handling**: Some API routes have basic error handling
4. **TTS caching**: Incomplete implementation
5. **Conversation engine**: Partially implemented (pivot in progress)

### Potential Improvements

1. Enable strict TypeScript mode
2. Implement comprehensive error boundaries
3. Add request/response logging middleware
4. Improve TTS cache invalidation
5. Add more granular rate limiting
6. Implement request queuing for high load

---

## 📚 Documentation Files

- `README.md` - Quick start guide
- `engineering.md` - Development standards
- `api.md` - API design patterns
- `pivot.md` - Product strategy & roadmap
- `branding.md` - Copy and tone guidelines
- `deployment.md` - Deployment procedures
- `monitoring.md` - Observability setup
- `DEVELOPMENT_GUIDELINES.md` - Development workflow

---

## 🎯 Summary

**VibeLog** is a well-structured, modern Next.js application that demonstrates:

- ✅ Clean architecture with separation of concerns
- ✅ Comprehensive API design
- ✅ Strong testing infrastructure
- ✅ Internationalization support
- ✅ Modern React patterns (hooks, context, state management)
- ✅ Security best practices (rate limiting, RLS, CSP)
- 🔄 Active pivot toward conversational AI assistant model

**Key Strengths**:

- Modular component structure
- Extensive API surface
- Good separation of UI and business logic
- Comprehensive documentation

**Areas for Growth**:

- TypeScript strict mode adoption
- More robust error handling
- Complete conversation engine implementation
- Enhanced monitoring and observability

---

_Analysis generated from codebase structure, key files, and documentation._
