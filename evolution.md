# VibeLog Platform Evolution

> **Living Document**: This file tracks VibeLog's technical evolution from inception to present. Update this file whenever significant features ship or architectural decisions are made.

**Last Updated**: November 22, 2025
**Current Version**: v1.0 (Foundation)
**Branch**: refactor/cleanup-and-fixes
**Next Review**: December 22, 2025

---

## Table of Contents

1. [Current State (v1.0)](#current-state-v10---january-2025)
2. [Evolution Timeline](#evolution-timeline)
3. [Technical Capabilities Matrix](#technical-capabilities-matrix)
4. [Architecture Overview](#architecture-overview)
5. [Database Schema Evolution](#database-schema-evolution)
6. [Integration Points](#integration-points)
7. [Performance & Scale](#performance--scale)
8. [Security Posture](#security-posture)
9. [Future Roadmap](#future-roadmap)

---

## Current State (v1.0 - January 2025)

### Tech Stack Snapshot

| Layer                | Technology            | Version        | Purpose                                   |
| -------------------- | --------------------- | -------------- | ----------------------------------------- |
| **Framework**        | Next.js               | 15.5.2         | App Router, Server Components, API Routes |
| **UI Library**       | React                 | 19.1.0         | Frontend components, hooks                |
| **Language**         | TypeScript            | 5.x            | Type safety across codebase               |
| **Database**         | Supabase (PostgreSQL) | Latest         | Data persistence, auth, storage           |
| **Vector DB**        | pgvector              | Latest         | Semantic search for RAG                   |
| **State Management** | Zustand               | Latest         | Global state (audio, chat, conversation)  |
| **Server State**     | TanStack Query        | 5.87.1         | Caching, invalidation, background refetch |
| **Styling**          | Tailwind CSS          | 3.4.17         | Utility-first styling                     |
| **UI Components**    | Radix UI              | Various        | Accessible primitives                     |
| **Animation**        | Framer Motion         | 12.23.24       | Micro-interactions                        |
| **Testing**          | Vitest + Playwright   | 3.2.4 + 1.55.0 | Unit and E2E tests                        |
| **Deployment**       | Vercel                | N/A            | Edge runtime, 5-min function timeout      |

### AI Services Integration

| Service                | Model/API            | Cost                      | Purpose                              |
| ---------------------- | -------------------- | ------------------------- | ------------------------------------ |
| **OpenAI Whisper**     | whisper-1            | $0.006/min                | Audio transcription                  |
| **OpenAI GPT-4o-mini** | gpt-4o-mini          | $0.15/$0.60 per 1M tokens | Content generation, RAG              |
| **OpenAI GPT-4o**      | gpt-4o               | $2.50/$10 per 1M tokens   | Advanced features, admin             |
| **OpenAI TTS**         | tts-1-hd             | $0.03/1K chars            | Text-to-speech (shimmer voice)       |
| **OpenAI DALL-E 3**    | dall-e-3             | $0.08/image               | Cover image generation               |
| **Google Veo 3.1**     | veo-3.1 (via fal.ai) | ~$0.80/8s video           | Video generation (ready, not active) |

**Cost Protection**: $50/day circuit breaker with automatic shutdown, aggressive caching, rate limiting.

### Production Metrics

- **API Endpoints**: 60+ routes
- **Database Tables**: 40+ tables with advanced features
- **Business Logic**: ~10,247 LOC in /lib and /hooks
- **React Components**: 100+ components (<300 LOC each)
- **Custom Hooks**: 20 hooks for reusable logic
- **Migrations**: 40 database migrations

---

## Evolution Timeline

### January 2025 - Foundation (v1.0)

**Core Voice-to-Publish Pipeline**

- ✅ Web-based audio recording (WebM, WAV, MP3, MP4, MOV support)
- ✅ Real-time waveform visualization
- ✅ Voice Activity Detection (VAD)
- ✅ OpenAI Whisper transcription with language auto-detection
- ✅ GPT-4o-mini content generation with 9 tone options
- ✅ DALL-E 3 cover image generation
- ✅ OpenAI TTS audio generation (shimmer voice)
- ✅ Dual-content format (teaser + full content)

**Vibe Brain AI Assistant**

- ✅ RAG (Retrieval Augmented Generation) system with pgvector
- ✅ Vector embeddings of all public content (vibelogs, comments, profiles)
- ✅ Per-user memory extraction and storage
- ✅ Multi-turn contextual conversations
- ✅ Source citations with clickable links
- ✅ Admin panel for AI configuration
  - Live system prompt editing
  - Model settings tuning (temperature, max_tokens, top_p, penalties)
  - Memory extraction patterns
  - RAG tuning (similarity threshold, max results)
  - Tone designer (personality modes)
  - Conversation monitoring
  - Usage statistics

**Social Features**

- ✅ Universal reactions system (any emoji on any content type)
- ✅ Nested comments with threading
- ✅ Voice comments (record instead of type)
- ✅ Rich media comments (images, videos)
- ✅ Like/unlike functionality
- ✅ View tracking (anonymous + authenticated)
- ✅ User profiles (/@username format)

**Notification System**

- ✅ In-app notification framework
- ✅ Granular per-type preferences (comment, reply, reaction, mention, follow, likes)
- ✅ Smart grouping and quiet hours
- ✅ Email/push infrastructure (ready, needs provider integration)
- ✅ Real-time updates ready (Supabase Realtime)

**Content Management**

- ✅ Rich text editing with Markdown support
- ✅ Image upload with cropping/filters
- ✅ Video upload and embedding
- ✅ SEO metadata extraction (tags, entities, keywords, sentiment)
- ✅ Draft/publish workflow
- ✅ URL slug management (@username/slug)
- ✅ Anonymous publishing with claim-on-signin

**Admin Panel**

- ✅ User management (view all users, manage subscriptions)
- ✅ Content moderation (view/delete vibelogs, comments)
- ✅ Vibe Brain configuration (system prompt, model settings, RAG tuning)
- ✅ Cost monitoring dashboard
- ✅ Audit logging

**Developer Experience**

- ✅ CLAUDE.md - Comprehensive development guide
- ✅ living-web-2026.md - Long-term vision and philosophy
- ✅ branding.md - Voice, tone, and brand identity
- ✅ Modular codebase with clear separation of concerns
- ✅ Full TypeScript type safety
- ✅ Vitest + Playwright testing infrastructure

**Documentation Embeddings & Knowledge Base**

- ✅ Database support for documentation content type (migration 20251123000000)
- ✅ Nullable `content_id` for documentation embeddings (no specific content reference)
- ✅ Markdown chunking strategy (sections split at ~2000 chars, preserving headings)
- ✅ API endpoint `/api/admin/documentation/embed` for re-embedding (GET/POST)
- ✅ CLI embedding script `scripts/embed-all-docs.js` for batch processing
- ✅ 5 platform docs embedded: README.md, evolution.md, living-web-2026.md, branding.md, CLAUDE.md
- ✅ Vector search with pgvector (cosine similarity, 60% threshold)
- ✅ Vibe Brain can answer platform questions via RAG ("What is VibeLog?", "How does it work?")

### December 2024 - Pre-Launch

**Authentication & Profiles**

- ✅ Supabase Auth integration (Google, Apple OAuth)
- ✅ Auto-profile creation from OAuth metadata
- ✅ Username conflict resolution (auto-suffix)
- ✅ Row Level Security (RLS) on all tables

**Storage Infrastructure**

- ✅ Supabase Storage buckets (audio, video, images, TTS cache)
- ✅ Image optimization with Sharp
- ✅ Lazy loading and code splitting

**Cost Tracking**

- ✅ AI cost tracking per request
- ✅ Daily cost aggregation
- ✅ $50/day circuit breaker
- ✅ Response caching (AI, TTS)

---

## Technical Capabilities Matrix

### Production-Ready Features

| Feature                   | Status        | Tech Stack                    | Notes                              |
| ------------------------- | ------------- | ----------------------------- | ---------------------------------- |
| **Voice Recording**       | ✅ Production | Web Audio API, MediaRecorder  | 5 min free, 30 min premium         |
| **Transcription**         | ✅ Production | OpenAI Whisper                | Multi-language, auto-detect        |
| **AI Content Generation** | ✅ Production | GPT-4o-mini                   | 9 tones, dual format               |
| **Cover Images**          | ✅ Production | DALL-E 3                      | Context-aware prompts              |
| **TTS Audio**             | ✅ Production | OpenAI TTS-1-HD               | Shimmer voice, cached              |
| **Comments**              | ✅ Production | PostgreSQL                    | Text, voice, media, threading      |
| **Reactions**             | ✅ Production | PostgreSQL                    | Universal, any emoji               |
| **Notifications**         | ✅ Production | PostgreSQL, Supabase Realtime | In-app ready, email/push framework |
| **Vibe Brain**            | ✅ Production | pgvector, GPT-4o              | RAG with memory                    |
| **User Profiles**         | ✅ Production | Supabase Auth                 | Google, Apple OAuth                |
| **Admin Panel**           | ✅ Production | Next.js, Supabase             | Full platform management           |
| **SEO Metadata**          | ✅ Production | GPT-4o-mini                   | Auto-tags, entities, sentiment     |

### Experimental/In-Progress Features

| Feature                 | Status            | Tech Stack              | Notes                         |
| ----------------------- | ----------------- | ----------------------- | ----------------------------- |
| **Video Upload**        | ⚙️ Experimental   | Supabase Storage        | Works, needs polish           |
| **Screen Recording**    | ⚙️ Experimental   | Screen Capture API      | Implemented, needs testing    |
| **Video Generation**    | 🚧 Ready          | Google Veo 3.1 (fal.ai) | Integration ready, not active |
| **Twitter Auto-Post**   | ⚙️ Experimental   | Twitter API             | Credentials integrated        |
| **Vibe System**         | ⚙️ Experimental   | Custom algorithms       | Analysis, packets, state      |
| **Email Notifications** | 🚧 Infrastructure | Framework in place      | Needs email provider          |
| **Push Notifications**  | 🚧 Infrastructure | Framework in place      | Needs push service            |

### Planned Features

| Feature                     | Priority | Rationale                                      |
| --------------------------- | -------- | ---------------------------------------------- |
| **Real-time Subscriptions** | High     | Supabase Realtime ready, just needs activation |
| **Following System**        | High     | Social graph infrastructure exists             |
| **Mobile App**              | Medium   | API-first design makes this straightforward    |
| **Embeddable Vibelogs**     | Medium   | iframe embed with player                       |
| **Collaborative Vibelogs**  | Low      | Architecture supports multi-user               |
| **API Documentation**       | Medium   | OpenAPI spec generation                        |
| **Advanced Analytics**      | Low      | PostHog integrated, needs dashboards           |

---

## Architecture Overview

### Frontend Architecture

```
/app                    # Next.js App Router
  /api                  # 60+ API routes
  /[username]           # Public profile pages
  /v/[id]               # Public vibelog view
  /dashboard            # Authenticated user area
  /settings             # User preferences
  /admin                # Admin panel
    /vibe-brain         # AI configuration UI
    /users              # User management
    /config             # System settings

/components             # 100+ React components
  /mic                  # Recording interface (7 files)
  /video                # Video features (5 files)
  /comments             # Comment system (5 files)
  /notifications        # Notification UI (3 files)
  /reactions            # Reaction picker (3 files)
  /profile              # Profile management (6 files)
  /admin/vibe-brain     # AI admin (6 files)
  /ui                   # Radix UI wrappers (13 files)

/lib                    # Business logic (33 files, ~10K LOC)
  /vibe-brain           # RAG system
    - rag-engine.ts     # Chat with tool calling
    - embedding-service.ts  # Vector search
    - memory-service.ts # User memory
    - platform-queries.ts   # Data fetching
    - tools.ts          # AI function definitions
    - tool-executor.ts  # Function execution
  /services             # Domain services
  - vibelog-service.ts  # Vibelog CRUD
  - conversation-engine.ts  # State machine
  - ai-cost-tracker.ts  # Cost tracking
  - storage.ts          # File management

/hooks                  # 20 custom React hooks
  - useAudioEngine.ts   # Recording state machine
  - useSaveVibelog.ts   # Bulletproof save logic
  - useConversation.ts  # Vibe Brain chat
  - useReactions.ts     # Reaction management

/state                  # Global state (Zustand)
  - audio-player-store.ts   # Global audio playback
  - conversation-state.ts   # Vibelog creation FSM
  - vibe-brain-store.ts     # Vibe Brain chat UI
```

### Backend Architecture Patterns

#### Standard API Route Pattern

```typescript
import { createClient } from '@/lib/supabase';
import { trackAICost } from '@/lib/ai-cost-tracker';
import { z } from 'zod';

export async function POST(req: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Rate limiting (if expensive)
  const limited = await checkRateLimit(user.id, 'endpoint-name');
  if (limited) return Response.json({ error: 'Rate limited' }, { status: 429 });

  // 3. Input validation
  const schema = z.object({
    /* ... */
  });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });

  // 4. Business logic
  const result = await doSomething(parsed.data);

  // 5. Cost tracking (AI endpoints)
  await trackAICost(user.id, 'service', cost, metadata);

  return Response.json(result);
}
```

### Data Flow Diagrams

#### Voice-to-Publish Flow

```
User Records Audio
    ↓ (upload to Supabase Storage)
POST /api/transcribe (Whisper)
    ↓ (transcription + language)
POST /api/generate-vibelog (GPT-4o-mini)
    ↓ (teaser + full content)
[Optional] POST /api/generate-cover (DALL-E 3)
    ↓ (cover_image_url)
[Optional] POST /api/vibelog/generate-ai-audio (TTS)
    ↓ (ai_audio_url)
POST /api/save-vibelog
    ↓
Async: Extract metadata, embed content, send notifications
```

#### RAG (Vibe Brain) Flow

```
User sends message
    ↓
POST /api/vibe-brain/chat
    ↓
1. Embed user query (OpenAI text-embedding-3-small)
    ↓
2. Vector search (pgvector)
   - Search content_embeddings (vibelogs, comments, profiles)
   - Search user_memories (personal facts)
    ↓
3. Build context
   - Conversation history (last 10 messages)
   - Retrieved content (top 5 matches)
   - User memories (top 10 relevant facts)
    ↓
4. Generate response (GPT-4o with tool calling)
   - System prompt from vibe_brain_config
   - Context injection
   - Available tools: searchVibelogs, getLatestVibelogs, getUserProfile, etc.
    ↓
5. Extract new memories from conversation
   - Regex pattern matching
   - Store in user_memories with embeddings
    ↓
6. Return response + sources
```

---

## Database Schema Evolution

### Migration History (40 migrations)

#### Foundation Migrations (001-010)

- **001**: Initial schema (profiles, vibelogs, basic tables)
- **002**: Comments system
- **003**: Reactions system
- **004**: Notifications infrastructure
- **005**: User quotas and rate limiting
- **006**: TTS usage tracking
- **007**: Remove voice cloning (dead feature)
- **008**: Enhanced profiles (Google OAuth metadata)
- **009**: Vibelog metadata (tags, entities, SEO)
- **010**: Comment threading

#### AI & RAG Migrations (011-020)

- **011**: Content embeddings (pgvector)
- **012**: Vibe Brain conversations
- **013**: Vibe Brain messages
- **014**: User memories
- **015**: Vibe Brain config
- **016**: Remove voice cloning triggers
- **017**: Remove voice cloning columns
- **018**: Enhanced comment features (voice, media)
- **019**: Update notification schema
- **020**: Remove TTS columns, update AI cache

#### Social & Polish Migrations (021-023)

- **021**: Reactions v2 (universal polymorphic system)
- **022**: (Deleted) Video generation attempt
- **023a**: Enhanced comments (finalized schema)

#### Cost Tracking & Fixes (2025-11-20 onwards)

- **20251120000000**: AI cost tracking tables (simple version)
- **20251120000001**: AI cost tracking (refined)
- **20251121000000**: Vibe Brain RAG system with pgvector
- **20251122000000**: Fix handle_new_user trigger (Google OAuth)
- **20251123000000**: Add documentation embeddings (content_type='documentation', nullable content_id)
- **20251123100000**: Fix comments RLS for anonymous access - allow anon users to view public comments

### Key Tables & Relationships

#### Core Content

```
profiles (users)
  ├─→ vibelogs (1:many)
  │     ├─→ comments (1:many)
  │     │     ├─→ reactions (1:many, polymorphic)
  │     │     └─→ comments (self-join for replies)
  │     └─→ reactions (1:many, polymorphic)
  ├─→ reactions (1:many, polymorphic)
  └─→ notifications (1:many)
```

#### AI & RAG

```
profiles
  ├─→ content_embeddings (1:many) - semantic search index
  ├─→ vibe_brain_conversations (1:many)
  │     └─→ vibe_brain_messages (1:many)
  └─→ user_memories (1:many) - learned facts

ai_usage_log (global) - all AI requests
ai_daily_costs (global) - circuit breaker
ai_cache (global) - response caching
tts_cache (global) - TTS audio caching
```

### Advanced Features

#### Polymorphic Reactions

```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY,
  reactable_type TEXT NOT NULL,  -- 'vibelog', 'comment', 'chat_message'
  reactable_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id),
  emoji TEXT NOT NULL,  -- Any emoji: 👍❤️🔥🎉😂
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reactable_type, reactable_id, user_id, emoji)
);
```

#### Vector Search (pgvector)

```sql
CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY,
  content_type TEXT NOT NULL,  -- 'vibelog', 'comment', 'profile', 'documentation'
  content_id UUID,  -- Nullable for documentation embeddings (no specific content reference)
  user_id UUID REFERENCES auth.users(id),
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
  text_chunk TEXT,
  metadata JSONB,  -- For docs: {source, category, section, chunk_index, total_chunks}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX content_embeddings_vector_idx
  ON content_embeddings
  USING ivfflat (embedding vector_cosine_ops);

-- Fast documentation lookups
CREATE INDEX idx_content_embeddings_documentation
  ON content_embeddings(content_type, created_at DESC)
  WHERE content_type = 'documentation';
```

---

## Integration Points

### OpenAI Services

- **API Version**: v1
- **Services Used**: 5 (Whisper, GPT-4o-mini, GPT-4o, TTS-1-HD, DALL-E 3)
- **Authentication**: API Key (OPENAI_API_KEY)
- **Rate Limits**: Managed via circuit breaker
- **Caching**: Aggressive (ai_cache table, TTS cache)

### Supabase Platform

- **Components**: Database (PostgreSQL), Auth, Storage, Realtime
- **Authentication Providers**: Google, Apple (OAuth 2.0)
- **Storage Buckets**:
  - `audio` - User recordings
  - `tts-audio` - Generated TTS files
  - `images` - Cover images, profile avatars
  - `videos` - Uploaded video content
  - `screen-recordings` - Screen capture uploads
- **Row Level Security**: Enabled on all tables
- **Extensions**: pgvector (vector similarity search)

### fal.ai (Google Veo 3.1)

- **Service**: AI video generation
- **Status**: Integration ready, not activated
- **Cost**: ~$0.80 per 8-second video
- **Authentication**: FAL_API_KEY environment variable

### Vercel Platform

- **Deployment**: Edge runtime where possible
- **Function Timeout**: 5 minutes (critical for long AI tasks)
- **Environment**: Production, Preview, Development
- **Regions**: Auto (global distribution)

### PostHog Analytics

- **Environment**: Production only
- **Features**: Event tracking, feature flags, user identification
- **Integration**: Client-side and server-side tracking

---

## Performance & Scale

### Current Limits

| Resource         | Free Tier         | Premium Tier       | Technical Limit  |
| ---------------- | ----------------- | ------------------ | ---------------- |
| Recording Length | 5 minutes         | 30 minutes         | 500MB file size  |
| Audio Upload     | 25MB              | 500MB              | Vercel body size |
| Function Timeout | 5 minutes         | 5 minutes          | Vercel limit     |
| Daily AI Cost    | $50               | $50                | Circuit breaker  |
| Rate Limits      | 10/day transcribe | 100/day transcribe | Configurable     |

### Caching Strategy

1. **AI Response Cache** (ai_cache table)
   - Cache key: SHA256(service + model + prompt + params)
   - TTL: 7 days
   - Hit rate tracking
   - Saves ~70% of repeat AI costs

2. **TTS Audio Cache** (tts_cache table)
   - Cache key: SHA256(text + voice)
   - Storage: Supabase bucket
   - Access count tracking
   - Permanent until manual cleanup

3. **TanStack Query Cache** (client-side)
   - Stale time: 5 minutes (vibelogs)
   - Cache time: 30 minutes
   - Background refetch on window focus
   - Optimistic updates for mutations

### Database Performance

- **Indexes**: Strategic indexes on all FK relationships
- **Vector Search**: ivfflat index on embeddings (cosine similarity)
- **Computed Columns**: Triggers maintain counts (view_count, like_count, etc.)
- **Connection Pooling**: Managed by Supabase

### Monitoring

- **PostHog**: User behavior, feature adoption
- **Vercel Analytics**: Core Web Vitals, function performance
- **Supabase Logs**: Database queries, auth events
- **Custom Logging**: Structured logs in lib/logger.ts
- **Cost Tracking**: ai_daily_costs table, alerts at $40

---

## Security Posture

### Authentication & Authorization

- **No Passwords**: OAuth-only (Google, Apple)
- **Row Level Security (RLS)**: Enabled on all tables
- **Service Role**: Backend operations only, never exposed
- **Anonymous Access**: Limited to public content viewing

### Data Protection

- **Encryption at Rest**: Supabase default (AES-256)
- **Encryption in Transit**: TLS 1.3
- **PII Handling**: Minimal collection, OAuth provider metadata
- **GDPR Compliance**: User deletion cascade, right to export

### Input Validation

- **Zod Schemas**: All API inputs validated
- **XSS Protection**: rehype-sanitize for user content
- **SQL Injection**: Parameterized queries only
- **File Upload**: Type validation, size limits
- **Rate Limiting**: Per-user, per-IP, per-endpoint

### Rate Limiting (lib/config.ts)

```typescript
RATE_LIMITS = {
  transcribe: { free: 10 / day, premium: 100 / day },
  generateVibelog: { free: 20 / day, premium: 200 / day },
  generateCover: { free: 5 / day, premium: 50 / day },
  tts: { free: 10 / day, premium: 100 / day },
  saveVibelog: { free: 50 / day, premium: 500 / day },
};
```

### Circuit Breakers

1. **AI Cost Circuit Breaker**
   - Daily limit: $50
   - Automatic shutdown on breach
   - Alert to admin
   - Manual reset required

2. **Database Circuit Breaker**
   - Connection pool limits
   - Query timeout: 30 seconds
   - Automatic retry with exponential backoff

---

## Future Roadmap

### Q1 2025 - Platform Maturity

**High Priority**:

- [ ] Activate real-time subscriptions (Supabase Realtime)
- [ ] Email notification integration (SendGrid/Resend)
- [ ] Push notification service (OneSignal/Firebase)
- [ ] Following/followers system (social graph completion)
- [ ] Public documentation page (/docs) with interactive AI assistant

**Medium Priority**:

- [ ] Mobile app (React Native or Flutter)
- [ ] Embeddable vibelog player (iframe widget)
- [ ] Twitter auto-posting activation
- [ ] Advanced analytics dashboard

**Low Priority**:

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Webhooks for integrations
- [ ] Custom domain support for profiles

### Q2 2025 - Advanced Features

- [ ] Activate Google Veo 3.1 video generation
- [ ] Collaborative vibelogs (multi-author)
- [ ] Vibelog series/collections
- [ ] Advanced search (full-text + semantic)
- [ ] Monetization features (tips, subscriptions)

### Q3 2025 - Enterprise

- [ ] White-label solution
- [ ] Team accounts
- [ ] SSO integration
- [ ] Audit logging enhancements
- [ ] SLA guarantees

---

## Maintenance Guidelines

### Updating This Document

**When to Update**:

- ✅ New feature ships to production
- ✅ Major architectural decision made
- ✅ Database migration added
- ✅ New integration added
- ✅ Performance characteristics change
- ✅ Security posture updated

**How to Update**:

1. Add entry to Evolution Timeline with date
2. Update Technical Capabilities Matrix
3. Update Database Schema Evolution if applicable
4. Update Integration Points if new service added
5. **Update GitHub Wiki** (run `pnpm wiki:sync`)
6. Re-embed documentation for AI assistant (run `pnpm docs:embed` or `/api/admin/documentation/embed`)
7. Commit with message: `docs: Update evolution.md - [brief description]`

**Review Cycle**: Monthly review to ensure accuracy

---

## Acknowledgments

Built with vision by the VibeLog team, inspired by the philosophy in `living-web-2026.md`.

**Core Philosophy**: "Conversation beats buttons. Voice is the interface. The web can feel again."

**Technical Standards**: See `CLAUDE.md` for development guidelines and `engineering.md` for code quality standards.

---

_This document is automatically embedded in Vibe Brain's RAG system. Users can ask questions like "What is VibeLog?" or "How does the platform work?" and receive accurate, source-cited answers._

**Version**: 1.0.0
**Next Review**: February 23, 2025
