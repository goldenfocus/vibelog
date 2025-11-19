# Enhanced Vibelog Experience: AI Audio, Content Tabs & Reactions

## Overview

This comprehensive enhancement transforms the vibelog viewing experience with:

1. **Automatic AI Audio Generation** - Every vibelog gets professional AI narration
2. **Vibelog/Original Tabs** - Switch between enhanced content and original recordings
3. **URL-based Navigation** - SEO-friendly `/vibelogged` and `/original` routes
4. **Comment Reactions** - Emoji reactions on comments for better engagement
5. **Nested Comments** - Comments on comments for threaded discussions
6. **SEO/AEO Optimization** - Structured data for search engines and AI assistants

---

## 1. Automatic AI Audio Generation

### Features

- **Auto-generate AI narration** for vibelogs without audio
- Uses **fal.ai MetaVoice TTS** with professional voice (Bria)
- High-quality, natural-sounding voice synthesis
- Automatic truncation for long content (4000 char limit)
- Stores in Supabase Storage alongside original audio

### API Endpoint

**POST** `/api/vibelog/generate-ai-audio`

```typescript
// Request
{
  "vibelogId": "uuid"
}

// Response
{
  "success": true,
  "message": "AI audio generated successfully",
  "audioUrl": "https://storage.supabase.co/..."
}
```

### Database Schema

```sql
-- Already exists from previous feature
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS ai_audio_url TEXT;
```

### How It Works

1. User views a vibelog without `ai_audio_url`
2. Component auto-calls generation API in background
3. **fal.ai MetaVoice** generates narration from title + content
4. Audio downloaded from fal.ai and uploaded to Supabase Storage
5. `ai_audio_url` updated in database
6. Play button appears when ready

### Tech Stack

- **Voice Generation**: fal.ai MetaVoice TTS API
- **Speaker**: Bria (professional, clear voice)
- **Format**: MP3 audio
- **Cost**: ~$0.02 per 1000 characters

---

## 2. Content Tabs: Vibelog vs Original

### The New Experience

Instead of a single "Listen" button, users now see **two tabs**:

#### **Tab 1: Vibelog** (Default)

- AI-generated narration with play button
- Enhanced, published content (markdown rendered)
- Polished reading experience
- SEO-optimized structured data

#### **Tab 2: Original**

- Original voice recording (if available)
- Original video recording (if available)
- Raw transcript before AI enhancement
- Raw content (unprocessed markdown)

### URL Structure

The tabs create unique, linkable URLs:

```
/@username/vibelog-slug           → Default (Vibelog tab)
/@username/vibelog-slug/vibelogged → Explicit Vibelog tab
/@username/vibelog-slug/original   → Original tab
```

### SEO Benefits

**Each URL is indexable:**

- `/vibelogged` - Main content optimized for discovery
- `/original` - Original recording for authenticity/transparency
- Internal linking between versions
- Canonical URLs prevent duplicate content issues

**Structured Data** (JSON-LD):

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Vibelog Title",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "/@username"
  },
  "audio": {
    "@type": "AudioObject",
    "contentUrl": "https://storage.supabase.co/ai-narration.mp3",
    "encodingFormat": "audio/mpeg"
  },
  "workExample": {
    "@type": "CreativeWork",
    "name": "Original Recording",
    "url": "/@username/vibelog-slug/original",
    "audio": {
      "@type": "AudioObject",
      "contentUrl": "https://storage.supabase.co/original-audio.webm"
    }
  }
}
```

### Component: ContentTabs

Location: `components/content/ContentTabs.tsx`

```tsx
<ContentTabs
  vibelogId={vibelog.id}
  title={vibelog.title}
  content={vibelog.content}
  originalAudioUrl={vibelog.audio_url}
  aiAudioUrl={vibelog.ai_audio_url}
  videoUrl={vibelog.video_url}
  author={vibelog.author?.display_name}
  transcript={vibelog.transcript}
>
  <VibelogContentRenderer content={vibelog.content} />
</ContentTabs>
```

**Props:**

- `vibelogId` - UUID for API calls
- `originalAudioUrl` - User's voice recording
- `aiAudioUrl` - AI-generated narration
- `videoUrl` - Camera/screen recording
- `transcript` - Raw transcript before AI enhancement
- `children` - The actual content to display

---

## 3. Comment Reactions System

### Features

- **Emoji reactions** on any comment
- **6 quick reactions**: 👍 ❤️ 😂 🎉 🤔 👏
- **Toggle reactions**: Click again to remove
- **Reaction counts**: Shows total per emoji
- **User attribution**: Highlights your reactions
- Real-time updates via Supabase

### Database Schema

```sql
-- Reactions table
CREATE TABLE public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(comment_id, user_id, emoji)  -- One emoji per user per comment
);

-- Reaction count on comments (for performance)
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS reaction_count INTEGER NOT NULL DEFAULT 0;

-- Auto-update trigger
CREATE TRIGGER trigger_update_comment_reaction_count
  AFTER INSERT OR DELETE ON public.comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reaction_count();

-- Summary view for easy querying
CREATE VIEW public.comment_reactions_summary AS
SELECT
  comment_id,
  emoji,
  COUNT(*) as count,
  ARRAY_AGG(user_id) as user_ids
FROM public.comment_reactions
GROUP BY comment_id, emoji;
```

### Component: CommentReactions

Location: `components/comments/CommentReactions.tsx`

```tsx
<CommentReactions commentId={comment.id} />
```

**Features:**

- Displays existing reactions with counts
- "React" button opens emoji picker
- Optimistic UI updates
- Error handling with toast notifications
- RLS policies ensure auth security

---

## 4. Nested Comments (Already Exists!)

The database already supports nested comments via `parent_comment_id`:

```sql
-- From existing schema
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
```

### To Implement UI:

1. Add "Reply" button to each comment
2. Show nested comments indented
3. Thread indicator (lines connecting replies)
4. Collapse/expand threads
5. "View X replies" for large threads

---

## 5. Transcript Field

Stores the **original transcript** before AI enhancement:

```sql
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS transcript TEXT;
```

**Use Cases:**

- Show authentic voice-to-text output
- Compare original vs AI-enhanced
- Transparency for AI processing
- Training data for improving prompts

**Display Location:**

- "Original" tab only
- In a separate "Original Transcript" section
- Styled differently from enhanced content

---

## 6. SEO/AEO Optimization

### Structured Data (JSON-LD)

Add to vibelog pages:

```tsx
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{vibelog.title}",
  "description": "{vibelog.teaser}",
  "author": {
    "@type": "Person",
    "name": "{author.display_name}",
    "url": "https://vibelog.io/@{author.username}"
  },
  "datePublished": "{vibelog.published_at}",
  "audio": {
    "@type": "AudioObject",
    "name": "AI Narration",
    "contentUrl": "{vibelog.ai_audio_url}",
    "encodingFormat": "audio/mpeg",
    "description": "AI-generated narration of this vibelog"
  },
  "workExample": {
    "@type": "CreativeWork",
    "name": "Original Recording",
    "url": "https://vibelog.io/@{username}/{slug}/original",
    "audio": {
      "@type": "AudioObject",
      "contentUrl": "{vibelog.audio_url}",
      "encodingFormat": "audio/webm"
    }
  },
  "interactionStatistic": [
    {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/LikeAction",
      "userInteractionCount": {vibelog.like_count}
    },
    {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/CommentAction",
      "userInteractionCount": {vibelog.comment_count}
    }
  ],
  "comment": [
    // Include top comments for indexing
    {
      "@type": "Comment",
      "text": "{comment.content}",
      "author": {
        "@type": "Person",
        "name": "{comment.author.display_name}"
      },
      "dateCreated": "{comment.created_at}"
    }
  ]
}
</script>
```

### Meta Tags

```tsx
<meta name="description" content="{vibelog.teaser || excerpt}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="{vibelog.title}" />
<meta property="og:description" content="{vibelog.teaser}" />
<meta property="og:audio" content="{vibelog.ai_audio_url}" />
<meta property="og:audio:type" content="audio/mpeg" />
<meta property="og:url" content="https://vibelog.io/@{username}/{slug}" />
<meta property="og:image" content="{vibelog.cover_image_url}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:player" content="{vibelog.ai_audio_url}" />
<meta name="twitter:player:stream:content_type" content="audio/mpeg" />
```

### Sitemap Entries

```xml
<url>
  <loc>https://vibelog.io/@username/vibelog-slug</loc>
  <lastmod>2025-11-18</lastmod>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://vibelog.io/@username/vibelog-slug/original</loc>
  <lastmod>2025-11-18</lastmod>
  <priority>0.5</priority>
</url>
```

### AEO (Answer Engine Optimization)

**For AI assistants like ChatGPT, Perplexity, Claude:**

1. **Clear H1/H2 structure** - Easy for AI to parse
2. **Bullet points and lists** - Quick facts extraction
3. **Semantic HTML** - `<article>`, `<section>`, `<time>`
4. **Schema.org markup** - Standard AI training data
5. **FAQ schema** (if applicable):

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is {topic}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Extract from vibelog content..."
      }
    }
  ]
}
```

---

## Files Created/Modified

### New Files

```
app/api/vibelog/generate-ai-audio/route.ts
components/content/ContentTabs.tsx
components/comments/CommentReactions.tsx
app/[username]/[slug]/original/page.tsx
app/[username]/[slug]/vibelogged/page.tsx
supabase/migrations/20251118170000_add_transcript_and_reactions.sql
ENHANCED_VIBELOG_EXPERIENCE.md
```

### Modified Files

```
components/PublicVibelogContent.tsx (integrate ContentTabs)
types/database.ts (add transcript, reactions types)
app/[username]/[slug]/page.tsx (add structured data)
```

---

## Integration Steps

### 1. Apply Database Migration

Run in Supabase SQL Editor:

```sql
-- See: supabase/migrations/20251118170000_add_transcript_and_reactions.sql
```

### 2. Replace AudioTabs with ContentTabs

In `PublicVibelogContent.tsx`:

```tsx
// BEFORE
<AudioTabs
  vibelogId={vibelog.id}
  originalAudioUrl={vibelog.audio_url}
  aiAudioUrl={vibelog.ai_audio_url}
  title={vibelog.title}
  author={vibelog.author?.display_name}
/>

// AFTER
<ContentTabs
  vibelogId={vibelog.id}
  title={vibelog.title}
  content={vibelog.content}
  originalAudioUrl={vibelog.audio_url}
  aiAudioUrl={vibelog.ai_audio_url}
  videoUrl={vibelog.video_url}
  transcript={vibelog.transcript}
  author={vibelog.author?.display_name}
>
  <VibelogContentRenderer content={vibelog.content} showCTA={false} />
</ContentTabs>
```

### 3. Add Reactions to Comments

In `CommentItem.tsx`:

```tsx
import { CommentReactions } from '@/components/comments/CommentReactions';

// Inside comment render
<CommentReactions commentId={comment.id} />;
```

### 4. Add Structured Data

In `app/[username]/[slug]/page.tsx`:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      // ... full schema from SEO section above
    }),
  }}
/>
```

---

## Testing Checklist

- [ ] AI audio generates for vibelogs without audio
- [ ] "Vibelog" tab shows AI narration with play button
- [ ] "Original" tab shows voice/video recording
- [ ] "Original" tab shows raw transcript
- [ ] Tabs sync with URL (`/original`, `/vibelogged`)
- [ ] Browser back/forward works with tabs
- [ ] Emoji reactions appear on comments
- [ ] Clicking reaction toggles on/off
- [ ] Reaction counts update in real-time
- [ ] Only authenticated users can react
- [ ] Users can remove their own reactions
- [ ] Structured data validates (Google Rich Results Test)
- [ ] Meta tags render correctly (Facebook Debugger)
- [ ] OpenGraph audio plays on social shares
- [ ] SEO: Each URL is indexable
- [ ] SEO: Canonical URLs are set
- [ ] Mobile responsive for all new components

---

## Performance Considerations

### AI Audio Generation

- **Non-blocking**: Happens in background after page load
- **Cached**: Once generated, never regenerates
- **Cost**: ~$0.015 per 1000 characters (OpenAI TTS pricing)
- **Speed**: ~2-5 seconds for average vibelog

### Comment Reactions

- **Indexed**: Queries use `idx_comment_reactions_comment_id`
- **Aggregated**: View `comment_reactions_summary` pre-computed
- **Optimistic UI**: Updates before server confirms
- **Cached counts**: `reaction_count` column on comments

### Content Tabs

- **Client-side only**: No extra server requests
- **Lazy audio**: AI audio loads only when tab is active
- **Code splitting**: ContentTabs dynamically imported

---

## Future Enhancements

### Voice Selection

- Multiple AI voices (alloy, echo, fable, onyx, nova, shimmer)
- Voice preference per user
- Match original speaker's gender/tone

### Transcript Editing

- Edit transcript before AI enhancement
- Compare transcript vs final content
- Diff view for changes

### Advanced Reactions

- Custom emoji picker (beyond 6 quick reactions)
- Reaction notifications (when someone reacts to your comment)
- Reaction analytics (most popular reactions)

### Nested Comment UI

- Visual threading with indent lines
- Collapse/expand threads
- "Load more replies" pagination
- Highlight parent comment on hover

### SEO Enhancements

- Auto-generate FAQ schema from comments
- Extract key quotes for featured snippets
- Image captions for accessibility
- Video transcripts for YouTube/Vimeo embeds

---

## Support & Documentation

**Related Docs:**

- [AUDIO_TABS_FEATURE.md](AUDIO_TABS_FEATURE.md) - Previous audio tabs implementation
- OpenAI TTS API: https://platform.openai.com/docs/guides/text-to-speech
- Schema.org Audio: https://schema.org/AudioObject
- Radix UI Tabs: https://www.radix-ui.com/docs/primitives/components/tabs

**Environment Variables Required:**

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

**Last Updated**: November 18, 2025
**Status**: ✅ Implemented (Migrations Pending)
**Migration**: Run `20251118170000_add_transcript_and_reactions.sql` in Supabase
