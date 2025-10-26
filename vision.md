# 🌍 VibeLog.io — Product Vision

> “The fastest way to turn your voice into viral content.”

---

## 🚀 Core Vision

VibeLog makes publishing as effortless as talking.  
You speak your vibe, and AI transforms it into polished, multi-format, multi-language content, ready to publish everywhere instantly.

**Mission:** remove all friction from idea capture and amplify authentic voices globally.

---

## 🎤 Foundation

- **Voice Capture** — record directly in the app (web + mobile).
- **AI Polishing** — raw transcripts become structured posts.
- **Multi-Format Drafts** — blog articles, tweet threads, LinkedIn posts, captions.
- **Publishing** — export easily to blogs and socials.
- **Languages** — multilingual from day one.

---

## ⚡ Expansion

- **One-Click Multi-Platform Publishing**
- **Style Presets** — professional, witty, hype, personal
- **AI Thumbnails & Visuals** — auto-generate graphics for posts
- **Global Language Pack** — publish in 20+ languages simultaneously
- **Team Collaboration** — invite editors or co-creators

---

## 🌌 Creativity & Scale

- **AI Video Generation** — turn vibes into reels, shorts, TikToks
- **Podcast Mode** — longer voice → polished podcast episodes
- **Scheduling & Autopilot** — speak once, drip content for weeks
- **Engagement Optimization** — hashtags, trending hooks, posting times
- **Analytics Dashboard** — cross-platform performance in one view

---

## 🌐 The Future of Vibelogging

- **Personal AI Clone** — your voice, style, and even face, publishing while you sleep
- **Vibelogging via Video** — speak on camera, AI formats for every platform on Earth
- **Platform-Specific Mastery**
  - **X / Twitter**: optimized hooks + threads
  - **TikTok**: clips engineered like top creators
  - **YouTube**: long-form videos that keep people hooked
  - **Text-only**: auto-generated visuals to boost engagement
  - **WhatsApp & Telegram**: optimized stories + status posts
- **Marketing Agency Mode** — the #1 publishing tool for agencies
- **Social Network Layer**
  - vibelog.io/username profile pages
  - Like, share, collaborate, follow, groups
  - Walls, feeds, friends, collabs
  - Live streaming with chat underneath profiles
- **Creator Commerce** — seamless merch, monetization, subscriptions
- **Marketplace** — sell content packs, prompts, and vibes
- **API Layer** — “Speak → Publish Everywhere” inside 3rd-party apps
- **Enterprise Mode** — amplify voices at team + global scale

---

## 💎 Differentiators

- **Voice-first**: no typing, just talk
- **Creator-first**: built for expression, not just scheduling
- **Global-native**: instant multilingual output
- **Frictionless**: one tap, zero tech hurdles
- **Unified**: publishing + AI + social in one platform

---

## 👉 Evolution Path

**Voice-to-Blog → Voice-to-Everywhere → Voice-to-AI Clone → Voice-to-Ecosystem**

🌐 Community & Network Effect

Vibelog isn’t just a tool, it’s a living ecosystem. Every creator becomes part of a global community where voices spark new conversations, collaborations, and remixes. Profiles, feeds, and discovery pages are designed to showcase authentic voices and build connections.

Community-first design ensures:
• Trending, rising, and remixed vibelogs surface daily.
• Creators gain visibility every time their work is remixed or shared.
• Followers feel part of an ongoing dialogue, not just passive readers.

The network effect grows stronger as every new voice adds to the pool of content others can remix, transform, and amplify.

⸻

🎮 Gamification & Engagement

To make Vibelog habit-forming and rewarding, we introduce a playful token economy and gamified loops:
• Daily Spin & Rewards: Users log in to spin a wheel for bonus tokens, AI boosts, or exclusive features.
• Streaks & Badges: Consecutive days of publishing or remixing unlock visible rewards.
• Leaderboards: Top creators and remixes are highlighted, driving friendly competition.
• Remix Credits: Users earn tokens when others remix their content; premium users can spend tokens to unlock remix rights without credit.
• Seasonal Challenges: Community-wide events (e.g., “Most remixed vibe of the week”) to keep the ecosystem fresh and buzzing.

Gamification turns creativity into a game—making Vibelog not just a publishing platform, but a place people return to daily for inspiration, rewards, and growth.

⸻

🗣️ User Feedback & Product Direction

To ensure VibeLog evolves with user needs, we implement continuous feedback loops that inform every product decision:

**Multi-Channel Feedback Collection:**
• In-app NPS surveys after key moments (first publish, 10th vibelog, monthly usage)
• Feature request voting board where users propose and prioritize new capabilities
• Weekly user interviews with power users and recent churned users
• Usage analytics to identify friction points and drop-off patterns
• Community Discord/Slack for real-time feedback and feature discussions

**Feedback-Driven Roadmap:**
• Monthly roadmap reviews based on user feedback themes and usage data
• Public changelog highlighting features built from user requests
• Beta testing program for power users to test new features early
• Feature flags allow gradual rollouts and A/B testing of major changes

**Closing the Loop:**
• Users who request features get personal updates when they ship
• Monthly "You asked, we built" communications showing impact of feedback
• Public roadmap transparency shows how user input shapes priorities
• Success metrics tied to user satisfaction scores, not just engagement

This creates a product development cycle where user voice directly drives innovation, ensuring VibeLog remains closely aligned with creator needs as we scale from voice-to-blog to the full ecosystem vision.

⸻

## 🌐 Social Layer Implementation Plan

### Phase 1: People Discovery & Profiles (Weeks 1-2)

**Goal:** Transform profiles into creators' #1 shareable link (linktree/milkshake replacement)

**Database Schema:**

```sql
-- Extend profiles table
ALTER TABLE profiles ADD COLUMN:
  - country VARCHAR(2)              -- ISO country code (US, CA, FR)
  - country_source VARCHAR(20)      -- 'ip', 'manual', 'oauth'
  - follower_count INT DEFAULT 0
  - following_count INT DEFAULT 0

-- New follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id),
  following_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ,
  UNIQUE(follower_id, following_id)
)

-- Auto-update follower counts via triggers
```

**API Endpoints:**

- `GET /api/users` — List users for People page (with country, post count, avatar)
- `GET /api/users/[username]` — Profile page data (bio, stats, vibelogs, following status)
- `POST /api/follow { userId }` — Follow user
- `DELETE /api/follow { userId }` — Unfollow user

**UI Components:**

- **UserCard** — Avatar, name, @username, country flag, post count, follow button
- **ProfilePage** (`/[username]`) — Header (avatar, bio, country), stats (posts/followers/following), vibelog grid with cover images
- **FollowButton** — Dynamic state (Follow/Following), optimistic updates

**Country Detection:**

- IP-based geolocation (ipapi.co free tier: 1000 requests/day)
- Fallback to manual country selection in user settings
- Google OAuth provides locale but not country — use IP on first vibelog save

### Phase 2: Follow System & Notifications (Week 3)

**Goal:** Create engagement loops to reduce day-1 churn

**Database Schema:**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  recipient_id UUID REFERENCES profiles(id),
  type VARCHAR(50),                 -- 'new_follower', 'new_vibelog', 'mention'
  actor_id UUID REFERENCES profiles(id),
  data JSONB,                       -- Flexible notification data
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Notification Types (MVP):**

- **New Follower** — "[@username] started following you"
- **New Vibelog from Following** — "[@username] published a new vibelog"

**API Endpoints:**

- `GET /api/notifications?unread_only=true` — Fetch notifications
- `POST /api/notifications/[id]/read` — Mark as read

**UI Components:**

- **NotificationBell** — Bell icon with unread count badge in navigation
- **NotificationDropdown** — Recent notifications with avatars, real-time polling (30s intervals)

**Engagement Strategy:**

- Show people you follow in notification bell (lean MVP)
- Email notifications for new followers (opt-in during signup)

### Phase 3: Direct Messaging (Week 4)

**Goal:** Basic but fast messaging for creator collaboration

**Database Schema:**

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID,             -- Hash of sorted user IDs
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**API Endpoints:**

- `GET /api/messages` — List conversations
- `GET /api/messages/[userId]` — Get conversation thread
- `POST /api/messages/[userId]` — Send message

**UI Components:**

- **MessageInbox** — Conversation list (avatar + last message preview)
- **MessageThread** — Simple chat interface (text-only MVP, no files/emojis)
- **MessageIcon** — Unread message badge in navigation

**MVP Constraints:**

- Text-only messages (no file uploads, images, or emojis)
- No read receipts or typing indicators
- No message search (add later)
- Mobile-friendly sheet/modal interface

### Phase 4: AI-Powered Newsletter (Week 5)

**Goal:** Zero-touch newsletter as first growth flywheel

**Database Schema:**

```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ
)

CREATE TABLE newsletter_editions (
  id UUID PRIMARY KEY,
  week_of DATE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_content TEXT NOT NULL,
  stats JSONB,                      -- Top creators, vibelogs, engagement data
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Auto-Subscribe Strategy:**

- **Opt-in everyone on signup** — Add to newsletter_subscribers table in `handle_new_user()` trigger
- One-click unsubscribe link in every email (legal requirement)

**Newsletter Content (AI-Generated):**

1. **"What's New"** — Features, fixes, releases (parsed from git commits)
2. **"Top Vibelogs This Week"** — Most liked, most viewed, most remixed
3. **"Rising Stars"** — New creators with highest engagement
4. **"Community Spotlight"** — AI picks 1-2 interesting vibelogs to feature
5. **"Coming Soon"** — Roadmap preview

**AI Generation Pipeline:**

```typescript
// Weekly Vercel Cron job (Sundays 9am EST)
// lib/newsletter-generator.ts

async function generateWeeklyNewsletter() {
  // 1. Query DB for weekly stats
  const stats = await getWeeklyStats({
    topVibelogs: { orderBy: 'like_count', limit: 5 },
    risingCreators: { orderBy: 'follower_growth', limit: 3 },
    newFeatures: { source: 'github_commits', since: lastWeek },
  });

  // 2. Call OpenAI GPT-4 to generate engaging newsletter copy
  const content = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are the Vibelog newsletter AI. Generate engaging, friendly weekly newsletter content highlighting community achievements and new features.',
      },
      {
        role: 'user',
        content: JSON.stringify(stats),
      },
    ],
  });

  // 3. Generate HTML email template (@react-email/components)
  const html = await renderEmail(NewsletterTemplate, { content, stats });

  // 4. Send via Resend API to all subscribers
  await sendBatch(subscribers, { subject, html, plainText });

  // 5. Store edition in newsletter_editions table
  await storeEdition({ week_of, subject, html, stats, sent_at });
}
```

**Technical Stack:**

- **Email Service:** Resend (100 emails/day free, scales to millions)
- **Email Templates:** @react-email/components (beautiful, responsive emails)
- **Cron:** Vercel Cron (built-in, zero config)
- **AI:** OpenAI GPT-4 (generate newsletter copy from stats)
- **Scheduling:** Weekly on Sundays, 9am EST

**Admin Dashboard:**

- Preview newsletter before sending
- Manual send override for special editions
- Subscriber stats and open rates

### Technical Services & Dependencies

**Geolocation:**

- Service: `ipapi.co` (free tier: 1000 requests/day, then $10/month for 30k)
- Fallback: Manual country selection in user settings

**Email:**

- Service: `Resend` (100 free emails/day, $20/month for 50k emails)
- Templates: `@react-email/components` + custom Vibelog brand theme
- Deliverability: SPF, DKIM, DMARC records configured

**UI Libraries:**

- Country flags: `country-flag-emoji` npm package
- Date handling: `date-fns` (newsletter scheduling)
- Real-time: Polling every 30s (WebSocket later for scale)

### MVP Social Features Summary

**Week 1-2: Foundation**

- ✅ People page with real user cards (avatar, name, country, post count)
- ✅ Profile pages at `/[username]` (shareable creator link)
- ✅ Follow/unfollow functionality

**Week 3: Engagement**

- 🔔 Notification system (new followers, new vibelogs)
- 🔔 Notification bell with unread count
- 🔔 Following list in notifications

**Week 4: Messaging**

- 💬 Basic text-only DM system
- 💬 Conversation inbox
- 💬 Message notifications

**Week 5: Growth Flywheel**

- 📧 Auto-subscribe on signup
- 📧 AI-generated weekly newsletter
- 📧 Automated cron job (zero human touch)

### Deferred for Post-MVP

- Collab requests (special friend status for co-creating)
- Profile customization (themes, colors like linktree)
- Message search and advanced features
- Read receipts and typing indicators
- Group messaging
- Video/voice messages
- Analytics (profile views, link clicks)
- Webhook integrations

### Open Questions

1. **Newsletter frequency:** Weekly on Sundays, or bi-weekly?
2. **Profile customization:** Later feature or include in MVP? (custom colors, themes)
3. **Message moderation:** Trust users for MVP or add profanity filter?
4. **Analytics tracking:** Track profile views and newsletter link clicks from day 1?
5. **Email unsubscribe flow:** One-click vs preferences center?

⸻

## 🎯 Success Metrics & Milestones

### MVP Success (Month 1-3)

```typescript
const mvpTargets = {
  adoption: {
    weekly_active_creators: 1000,
    recording_to_publish_rate: 0.7, // 70% complete their first vibelog
    avg_session_duration: 240, // 4 minutes (record + edit + publish)
    mobile_usage_rate: 0.6, // 60% use mobile for recording
  },

  performance: {
    transcription_time_p95: 3000, // <3s for 60s audio
    ai_generation_time_p95: 5000, // <5s for content polish
    app_load_time_lcp: 2500, // <2.5s first paint
    error_rate: 0.005, // <0.5% error rate
  },

  quality: {
    app_store_rating: 4.5, // 4.5+ stars
    nps_score: 50, // Net Promoter Score 50+
    transcription_accuracy: 0.95, // 95% accuracy rate
    user_retention_day_7: 0.4, // 40% return after week
  },
};
```

### Growth Success (Month 6-12)

```typescript
const growthTargets = {
  scale: {
    monthly_active_users: 10000,
    vibelogs_created_monthly: 50000,
    multi_platform_publish_rate: 0.5, // 50% publish to multiple platforms
    organic_growth_rate: 0.15, // 15% monthly organic growth
  },

  monetization: {
    trial_conversion_rate: 0.25, // 25% trial to paid
    monthly_recurring_revenue: 50000, // $50k MRR
    customer_acquisition_cost: 20, // $20 CAC
    lifetime_value: 200, // $200 LTV (10:1 LTV:CAC)
    churn_rate_monthly: 0.05, // 5% monthly churn
  },

  engagement: {
    avg_vibelogs_per_user_month: 8, // 8 vibelogs per active user
    power_user_rate: 0.2, // 20% create 10+ vibelogs
    feature_discovery_rate: 0.8, // 80% discover key features
    support_ticket_rate: 0.02, // <2% users need support
  },
};
```

### Product-Market Fit Indicators

```typescript
const pmfIndicators = {
  // Sean Ellis Test: "How would you feel if you could no longer use VibeLog?"
  very_disappointed_rate: 0.4, // >40% "very disappointed"

  // Retention curves
  cohort_retention: {
    day_1: 0.6, // 60% return next day
    day_7: 0.4, // 40% return after week
    day_30: 0.25, // 25% return after month
    day_90: 0.15, // 15% become long-term users
  },

  // Organic growth signals
  viral_coefficient: 0.3, // Each user brings 0.3 new users
  word_of_mouth_rate: 0.5, // 50% discover via referral
  social_sharing_rate: 0.3, // 30% share their vibelogs

  // Usage intensity
  weekly_usage_frequency: 2.5, // 2.5 sessions per week
  session_completion_rate: 0.8, // 80% complete their workflow
  feature_stickiness: 0.6, // 60% use advanced features
};
```

### Competitive Benchmarks

```typescript
const competitiveBenchmarks = {
  // vs Traditional Blogging (WordPress, Medium)
  content_creation_speed: '10x_faster', // Minutes vs hours
  technical_barrier: '95%_lower', // No setup vs complex setup

  // vs Video Tools (Loom, Reels)
  accessibility_score: '90%_higher', // Text-first vs video-only
  searchability: '100%_better', // Full text vs video transcripts

  // vs Voice Notes (Apple Notes, WhatsApp)
  professional_output: 'infinite', // Polished vs raw
  distribution_reach: '50x_wider', // Multi-platform vs single app

  // vs AI Writing (Jasper, Copy.ai)
  authenticity_score: '100%_higher', // Your voice vs generic AI
  speed_to_publish: '3x_faster', // Voice input vs typing prompts
};
```

### Success Validation Framework

```typescript
const validationGates = {
  // Gate 1: Initial Traction (Month 1)
  gate_1: {
    criteria: [
      'recording_success_rate > 90%',
      'user_satisfaction_score > 4.0',
      'weekly_active_users > 100',
    ],
    action_if_fail: 'focus_on_core_recording_experience',
  },

  // Gate 2: Retention & Engagement (Month 3)
  gate_2: {
    criteria: ['day_7_retention > 30%', 'avg_vibelogs_per_user > 3', 'feature_adoption_rate > 60%'],
    action_if_fail: 'improve_onboarding_and_habit_formation',
  },

  // Gate 3: Growth & Monetization (Month 6)
  gate_3: {
    criteria: ['organic_growth_rate > 10%', 'trial_conversion_rate > 20%', 'nps_score > 40'],
    action_if_fail: 'refine_value_proposition_and_pricing',
  },

  // Gate 4: Scale & PMF (Month 12)
  gate_4: {
    criteria: [
      'very_disappointed_rate > 40%',
      'viral_coefficient > 0.25',
      'sustainable_unit_economics',
    ],
    action_if_fail: 'pivot_or_major_product_iteration',
  },
};
```

---

**See also**: `branding.md` for voice and positioning, `monitoring.md` for success metrics tracking, `api.md` for technical implementation
