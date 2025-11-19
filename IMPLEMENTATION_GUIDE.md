# Universal Reactions System - Implementation Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Run the Migration

```bash
# Apply the universal reactions migration
pnpm supabase db push
```

Or manually in Supabase SQL Editor:

```sql
-- Copy/paste: supabase/migrations/20251119000000_universal_reactions_system.sql
```

### Step 2: Add Reactions to Any Component

```tsx
import { ReactionBar } from '@/components/reactions/ReactionBar';

// That's it! Works anywhere:
<ReactionBar type="comment" id={comment.id} />
<ReactionBar type="vibelog" id={vibelog.id} />
<ReactionBar type="chat_message" id={message.id} />
```

### Step 3: There is no step 3! 🎉

---

## 📦 What You Get

### Components (Ready to Use)

- ✅ `<ReactionBar />` - Complete reaction UI
- ✅ `<ReactionButton />` - Single emoji button
- ✅ `<ReactionPicker />` - Emoji selector dropdown

### Hooks

- ✅ `useReactions()` - All reaction logic

### API Endpoints

- ✅ `POST /api/reactions` - Add reaction
- ✅ `DELETE /api/reactions` - Remove reaction
- ✅ `GET /api/reactions?type=X&id=Y` - Get reactions

### Database

- ✅ Universal `reactions` table (polymorphic)
- ✅ `reactions_summary` view (aggregated counts)
- ✅ Auto-updating reaction counts
- ✅ RLS policies for security

---

## 💡 Usage Examples

### Example 1: Comments

```tsx
import { ReactionBar } from '@/components/reactions/ReactionBar';

function CommentItem({ comment }) {
  return (
    <div className="comment">
      <p>{comment.content}</p>
      <ReactionBar
        type="comment"
        id={comment.id}
        variant="compact"
        realtime // Live updates!
      />
    </div>
  );
}
```

### Example 2: Vibelogs

```tsx
function VibelogCard({ vibelog }) {
  return (
    <article>
      <h2>{vibelog.title}</h2>
      <p>{vibelog.content}</p>

      {/* Custom emoji set */}
      <ReactionBar
        type="vibelog"
        id={vibelog.id}
        variant="expanded"
        emojiSet={['🔥', '💯', '🎯', '✨', '💜', '🚀']}
        showCounts
      />
    </article>
  );
}
```

### Example 3: Live Chat

```tsx
function ChatMessage({ message }) {
  return (
    <div>
      <span>{message.text}</span>
      <ReactionBar type="chat_message" id={message.id} variant="minimal" maxVisible={3} realtime />
    </div>
  );
}
```

### Example 4: Media Gallery

```tsx
function MediaCard({ media }) {
  return (
    <figure>
      <img src={media.url} alt={media.alt} />
      <figcaption>
        <ReactionBar
          type="media"
          id={media.id}
          variant="compact"
          emojiSet={['😍', '🔥', '✨', '👀', '💯', '🎨']}
        />
      </figcaption>
    </figure>
  );
}
```

### Example 5: Using the Hook Directly

```tsx
import { useReactions } from '@/hooks/useReactions';

function CustomReactionUI({ type, id }) {
  const { reactions, toggleReaction, hasUserReacted, totalCount } = useReactions({
    type,
    id,
    realtime: true,
  });

  return (
    <div>
      <p>Total reactions: {totalCount}</p>
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={hasUserReacted(r.emoji) ? 'active' : ''}
        >
          {r.emoji} {r.count}
        </button>
      ))}
    </div>
  );
}
```

---

## 🎨 Variants

### Compact (Default)

Best for: Comments, posts, general content

```tsx
<ReactionBar type="comment" id={id} variant="compact" />
```

Looks like: `[👍 5] [❤️ 3] [😂 2] [+]`

### Expanded

Best for: Main content (vibelogs, articles)

```tsx
<ReactionBar type="vibelog" id={id} variant="expanded" />
```

Looks like: Full emoji picker with search

### Minimal

Best for: Chat, dense UIs

```tsx
<ReactionBar type="chat_message" id={id} variant="minimal" />
```

Looks like: `[8] → [👍 5] [❤️ 3] [+]`

### Stacked

Best for: Mobile, sidebars

```tsx
<ReactionBar type="media" id={id} variant="stacked" />
```

Looks like: Vertical list

---

## 🔧 Advanced Features

### Custom Emoji Sets

```tsx
const VIBELOG_REACTIONS = ['🔥', '💯', '🎯', '✨', '💜', '🚀'];

<ReactionBar type="vibelog" id={id} emojiSet={VIBELOG_REACTIONS} />;
```

### Reaction Limits

```tsx
<ReactionBar
  type="chat_message"
  id={id}
  maxReactionsPerUser={5} // Max 5 different emojis per user
  maxTotalReactions={100} // Cap at 100 total reactions
/>
```

### Custom Permissions

```tsx
<ReactionBar
  type="vibelog"
  id={id}
  canReact={(user, emoji) => {
    // Only verified users can use fire emoji
    if (emoji === '🔥') {
      return user?.is_verified === true;
    }
    return true;
  }}
/>
```

### Callbacks

```tsx
<ReactionBar
  type="comment"
  id={id}
  onReactionAdd={emoji => {
    console.log('User added:', emoji);
    // Track analytics, show notification, etc.
  }}
  onReactionRemove={emoji => {
    console.log('User removed:', emoji);
  }}
  onReactionClick={(emoji, users) => {
    // Show who reacted
    console.log(`${users.length} users reacted with ${emoji}`);
  }}
/>
```

### Real-time Updates

```tsx
<ReactionBar
  type="vibelog"
  id={id}
  realtime // Auto-subscribe to live updates!
/>
```

---

## 🗄️ Adding New Content Types

### Step 1: Add to Type Definition

```typescript
// types/reactions.ts
export type ReactableType = 'comment' | 'vibelog' | 'chat_message' | 'media' | 'your_new_type'; // ← Add here
```

### Step 2: Add Reaction Count Column

```sql
ALTER TABLE public.your_new_table
ADD COLUMN IF NOT EXISTS reaction_count INTEGER DEFAULT 0;
```

### Step 3: Update Trigger Function

```sql
-- In the migration file
IF NEW.reactable_type = 'your_new_type' THEN
  UPDATE public.your_new_table
  SET reaction_count = reaction_count + 1
  WHERE id = NEW.reactable_id;
END IF;
```

### Step 4: Use It!

```tsx
<ReactionBar type="your_new_type" id={item.id} />
```

---

## 📊 Analytics & Insights

### Get Reaction Analytics (Future Feature)

```typescript
GET /api/reactions/analytics?type=vibelog&id=uuid

{
  "top_reactions": [
    { "emoji": "👍", "count": 50, "percentage": 45.5 },
    { "emoji": "❤️", "count": 30, "percentage": 27.3 }
  ],
  "reaction_velocity": {
    "last_hour": 5,
    "last_day": 20,
    "last_week": 110
  },
  "unique_reactors": 85,
  "reaction_diversity": 0.72
}
```

---

## 🔐 Security

All handled automatically by RLS:

- ✅ Anyone can view reactions
- ✅ Only authenticated users can add reactions
- ✅ Users can only delete their own reactions
- ✅ Cannot react multiple times with same emoji

---

## ⚡ Performance

### Optimizations Built-In:

- ✅ Denormalized counts (no aggregation on read)
- ✅ Indexed queries
- ✅ Optimistic UI updates
- ✅ Aggregated views
- ✅ Real-time subscriptions (opt-in)

### Database Queries:

```sql
-- Getting reactions is FAST (uses view)
SELECT * FROM reactions_summary
WHERE reactable_type = 'comment' AND reactable_id = 'uuid';

-- Adding reaction updates count automatically (trigger)
INSERT INTO reactions VALUES (...);
-- ↑ This also increments comments.reaction_count
```

---

## 🐛 Troubleshooting

### Reactions not appearing?

1. Check migration was applied: `SELECT COUNT(*) FROM reactions;`
2. Check RLS policies: Are you signed in?
3. Check browser console for errors

### Real-time not working?

1. Make sure `realtime` prop is true
2. Check Supabase real-time is enabled
3. Verify channel subscription in devtools

### Count not updating?

1. Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_reaction_count';`
2. Manually refresh: `fetchReactions()`

---

## 🎯 Best Practices

### DO ✅

- Use `ReactionBar` for most cases
- Enable `realtime` for live content (chat, streams)
- Use custom emoji sets for branding
- Add reaction analytics to track engagement

### DON'T ❌

- Don't fetch reactions in a loop
- Don't create custom implementations (use the hook)
- Don't forget to handle loading states
- Don't allow unlimited reactions (set limits)

---

## 📚 Files Reference

### Types

- `types/reactions.ts` - All TypeScript types

### Components

- `components/reactions/ReactionBar.tsx` - Main component
- `components/reactions/ReactionButton.tsx` - Single button
- `components/reactions/ReactionPicker.tsx` - Emoji selector

### Hooks

- `hooks/useReactions.ts` - Core logic

### API

- `app/api/reactions/route.ts` - REST endpoints

### Database

- `supabase/migrations/20251119000000_universal_reactions_system.sql`

### Docs

- `UNIVERSAL_REACTIONS_SYSTEM.md` - Architecture
- `IMPLEMENTATION_GUIDE.md` - This file

---

## 🚀 Next Steps

1. Run the migration
2. Add `<ReactionBar />` to comments
3. Add to vibelogs
4. Add to chat messages
5. Add to media
6. Add anywhere else you want!

**That's it! The system is plug-and-play.** 🎉

---

**Questions? Check the full architecture doc:**
→ [UNIVERSAL_REACTIONS_SYSTEM.md](UNIVERSAL_REACTIONS_SYSTEM.md)
