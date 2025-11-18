# Quick Start: Enhanced Vibelog Experience Integration

## Overview

This guide helps you integrate the new features:

- ✅ AI audio generation
- ✅ Content tabs (Vibelog/Original)
- ✅ Comment reactions
- ✅ URL routing (`/vibelogged`, `/original`)
- ✅ SEO/AEO optimization

---

## Step 1: Apply Database Migration

Run this SQL in **Supabase SQL Editor**:

```bash
# Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Copy and run: supabase/migrations/20251118170000_add_transcript_and_reactions.sql
```

**What it adds:**

- `transcript` column to `vibelogs`
- `comment_reactions` table
- `reaction_count` column to `comments`
- Triggers for auto-updating reaction counts
- RLS policies for security

---

## Step 2: Environment Variables

Ensure these are set in `.env.local`:

```env
OPENAI_API_KEY=sk-...                  # For AI audio generation
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Step 3: Verify Component Integration

The following files have already been updated:

### ✅ PublicVibelogContent.tsx

- Replaced `AudioTabs` with `ContentTabs`
- Passes `transcript` field
- Wraps content in tabs

### ✅ TypeScript Types (types/database.ts)

- Added `transcript?: string | null` to Vibelog interface
- Added `ai_audio_url?: string | null`

### ✅ New Components Created

- `components/content/ContentTabs.tsx` - Main tabs component
- `components/comments/CommentReactions.tsx` - Emoji reactions
- `app/api/vibelog/generate-ai-audio/route.ts` - AI audio API

---

## Step 4: Test the Features

### Test AI Audio Generation

1. Visit any vibelog without `ai_audio_url`
2. Component should auto-generate in background
3. Check browser console for: `🎙️ Generating AI narration...`
4. Play button appears when ready

### Test Content Tabs

1. Visit a vibelog: `/@username/vibelog-slug`
2. Should see two tabs: **Vibelog** | **Original**
3. Click Original tab
4. URL changes to: `/@username/vibelog-slug/original`
5. Shows original audio/video player
6. Click Vibelog tab
7. URL changes to: `/@username/vibelog-slug/vibelogged`

### Test Comment Reactions

1. Go to any vibelog with comments
2. Add `<CommentReactions commentId={comment.id} />` to `CommentItem.tsx`
3. Should see "React" button under each comment
4. Click to see emoji picker: 👍 ❤️ 😂 🎉 🤔 👏
5. Click emoji to react
6. Count updates immediately
7. Click again to remove reaction

---

## Step 5: Add Comment Reactions to UI

Edit `components/comments/CommentItem.tsx`:

```tsx
import { CommentReactions } from '@/components/comments/CommentReactions';

// Inside the CommentItem render, after comment content:
<CommentReactions commentId={comment.id} />;
```

---

## Step 6: Fetch Transcript Field

Update queries to include `transcript`:

### In app/[username]/[slug]/page.tsx

```tsx
.select(`
  id,
  title,
  content,
  transcript,  // ← Add this
  audio_url,
  ai_audio_url,
  ...
`)
```

### In app/v/[slug]/page.tsx

```tsx
.select('*, transcript')  // ← Add to wildcard query
```

Then pass to `PublicVibelogContent`:

```tsx
<PublicVibelogContent
  vibelog={{
    ...vibelog,
    transcript: vibelog.transcript, // ← Pass it through
  }}
/>
```

---

## Step 7: Add SEO Structured Data

In `app/[username]/[slug]/page.tsx`, add before closing `</div>`:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: vibelog.title,
      description: vibelog.teaser || excerpt,
      author: {
        '@type': 'Person',
        name: vibelog.author.display_name,
        url: `https://vibelog.io/@${vibelog.author.username}`,
      },
      datePublished: vibelog.published_at,
      audio: vibelog.ai_audio_url
        ? {
            '@type': 'AudioObject',
            name: 'AI Narration',
            contentUrl: vibelog.ai_audio_url,
            encodingFormat: 'audio/mpeg',
          }
        : undefined,
      workExample: vibelog.audio_url
        ? {
            '@type': 'CreativeWork',
            name: 'Original Recording',
            url: `https://vibelog.io/@${vibelog.author.username}/${vibelog.slug}/original`,
            audio: {
              '@type': 'AudioObject',
              contentUrl: vibelog.audio_url,
            },
          }
        : undefined,
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: vibelog.like_count,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: vibelog.comment_count || 0,
        },
      ],
    }),
  }}
/>
```

---

## Step 8: Test in Production

### Checklist

- [ ] Database migration applied successfully
- [ ] AI audio generates for vibelogs without audio
- [ ] "Vibelog" tab shows AI narration
- [ ] "Original" tab shows raw recording
- [ ] URL changes when switching tabs (`/original`, `/vibelogged`)
- [ ] Browser back/forward works with tabs
- [ ] Comment reactions appear and toggle
- [ ] Only authenticated users can react
- [ ] Structured data validates (Google Rich Results Test)
- [ ] Mobile responsive

### Testing URLs

Test these patterns work:

```
/@username/vibelog-slug
/@username/vibelog-slug/vibelogged
/@username/vibelog-slug/original
```

---

## Common Issues & Solutions

### Issue: AI Audio Not Generating

**Solution:**

1. Check `OPENAI_API_KEY` is set
2. Check browser console for errors
3. Check API logs: `app/api/vibelog/generate-ai-audio/route.ts`
4. Verify Supabase Storage bucket `audio` exists

### Issue: Tabs Not Showing

**Solution:**

1. Verify `ContentTabs` is imported
2. Check props are passed correctly
3. Ensure `@radix-ui/react-tabs` is installed
4. Check browser console for TypeScript errors

### Issue: URL Routing Not Working

**Solution:**

1. Verify routes exist:
   - `app/[username]/[slug]/original/page.tsx`
   - `app/[username]/[slug]/vibelogged/page.tsx`
2. Check Next.js routing cache: `rm -rf .next`
3. Rebuild: `pnpm run build`

### Issue: Reactions Not Saving

**Solution:**

1. Run migration to create `comment_reactions` table
2. Check RLS policies are enabled
3. Verify user is authenticated
4. Check browser console for Supabase errors

### Issue: Transcript Not Showing

**Solution:**

1. Run migration to add `transcript` column
2. Update queries to SELECT `transcript`
3. Pass `transcript` to `ContentTabs` component
4. Check database: `SELECT id, transcript FROM vibelogs LIMIT 5`

---

## Performance Optimization

### AI Audio Generation

- Happens in background (non-blocking)
- Uses `tts-1-hd` model (~$0.015/1000 chars)
- Cached forever (never regenerates)

### Comment Reactions

- Optimistic UI updates
- Reaction counts pre-aggregated
- Indexed queries (`idx_comment_reactions_comment_id`)

### Content Tabs

- Client-side only (no extra API calls)
- Lazy loads AI audio
- Code-split with dynamic imports

---

## Next Steps

### Optional Enhancements

1. **Nested Comments UI**
   - Add "Reply" button to each comment
   - Show indented thread structure
   - Collapse/expand threads

2. **Voice Selection**
   - Let users choose AI voice (alloy, echo, fable, etc.)
   - Store preference per user
   - Match original speaker's gender/tone

3. **Transcript Editing**
   - Allow editing transcript before AI enhancement
   - Show diff view (original vs enhanced)
   - Re-generate AI audio from edited transcript

4. **Advanced Reactions**
   - Full emoji picker (beyond 6 quick reactions)
   - Reaction notifications
   - Analytics dashboard

---

## Support

**Documentation:**

- [ENHANCED_VIBELOG_EXPERIENCE.md](ENHANCED_VIBELOG_EXPERIENCE.md) - Full technical docs
- [AUDIO_TABS_FEATURE.md](AUDIO_TABS_FEATURE.md) - Original audio tabs docs

**External Docs:**

- [OpenAI TTS API](https://platform.openai.com/docs/guides/text-to-speech)
- [Schema.org AudioObject](https://schema.org/AudioObject)
- [Radix UI Tabs](https://www.radix-ui.com/docs/primitives/components/tabs)

**Need Help?**

- Check browser console for errors
- Check Supabase logs
- Check API route logs
- Review migration status in Supabase dashboard

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0
**Status**: ✅ Ready for Integration
