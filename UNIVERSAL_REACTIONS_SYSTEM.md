# Universal Reactions System - Architecture

## Vision: One System, Infinite Possibilities

A polymorphic, API-driven reaction system that works for **any content type**:

- Comments
- Vibelogs
- Live chat messages
- Media (images, videos)
- User profiles
- Playlists
- Collections
- ...and anything else you create

## Core Principles

1. **Polymorphic** - Works with any content type
2. **API-First** - Everything goes through unified endpoints
3. **Real-time** - Optimistic updates + Supabase real-time
4. **Plug & Play** - Drop in 1 component, reactions work everywhere
5. **Accessible** - Keyboard nav, screen readers, ARIA
6. **Performant** - Aggregated counts, indexed queries, cached
7. **Extensible** - Custom emoji sets, reaction types, analytics

---

## Database Schema (Polymorphic)

```sql
-- Universal reactions table (works for ANY content)
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic foreign key
  reactable_type TEXT NOT NULL, -- 'comment', 'vibelog', 'chat_message', 'media', etc.
  reactable_id UUID NOT NULL,   -- ID of the thing being reacted to

  -- Who reacted
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What reaction
  emoji TEXT NOT NULL, -- Any emoji: 👍, ❤️, 🔥, 🎉, 😂, 🤔, 👏, 💯, etc.

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_reaction UNIQUE(reactable_type, reactable_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX idx_reactions_reactable ON reactions(reactable_type, reactable_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);
CREATE INDEX idx_reactions_emoji ON reactions(emoji);
CREATE INDEX idx_reactions_created ON reactions(created_at DESC);

-- Aggregated view for counts
CREATE VIEW reactions_summary AS
SELECT
  reactable_type,
  reactable_id,
  emoji,
  COUNT(*)::INTEGER as count,
  ARRAY_AGG(user_id) as user_ids,
  MAX(created_at) as last_reacted_at
FROM reactions
GROUP BY reactable_type, reactable_id, emoji;

-- RLS Policies
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

---

## API Design (REST + Real-time)

### 1. Add Reaction

```typescript
POST /api/reactions

{
  "reactableType": "comment" | "vibelog" | "chat_message" | "media",
  "reactableId": "uuid",
  "emoji": "👍"
}

// Response
{
  "id": "uuid",
  "emoji": "👍",
  "created_at": "2025-11-18T..."
}
```

### 2. Remove Reaction

```typescript
DELETE /api/reactions/:id
// OR
DELETE /api/reactions

{
  "reactableType": "comment",
  "reactableId": "uuid",
  "emoji": "👍"
}
```

### 3. Get Reactions for Content

```typescript
GET /api/reactions?type=comment&id=uuid

// Response
{
  "reactions": [
    { "emoji": "👍", "count": 5, "user_ids": [...], "user_reacted": true },
    { "emoji": "❤️", "count": 3, "user_ids": [...], "user_reacted": false }
  ],
  "total_count": 8,
  "user_reactions": ["👍"]
}
```

### 4. Real-time Subscription

```typescript
// Subscribe to reaction changes
supabase
  .channel('reactions:comment:uuid')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'reactions',
      filter: `reactable_type=eq.comment&reactable_id=eq.${id}`,
    },
    handleReactionChange
  )
  .subscribe();
```

---

## Component Architecture

### 1. Core Hook: `useReactions`

```tsx
import { useReactions } from '@/hooks/useReactions';

const {
  reactions, // Array of reaction summaries
  isLoading,
  userReactions, // User's current reactions
  addReaction, // (emoji) => Promise<void>
  removeReaction, // (emoji) => Promise<void>
  toggleReaction, // (emoji) => Promise<void>
  totalCount,
  subscribe, // Enable real-time updates
  unsubscribe,
} = useReactions({
  type: 'comment',
  id: 'comment-uuid',
});
```

### 2. ReactionButton (Single Emoji)

```tsx
<ReactionButton
  emoji="👍"
  count={5}
  isActive={true}
  onToggle={() => {}}
  size="sm" | "md" | "lg"
  variant="pill" | "square" | "minimal"
/>
```

### 3. ReactionPicker (Emoji Selector)

```tsx
<ReactionPicker
  onSelect={emoji => {}}
  recentEmojis={['👍', '❤️']}
  categories={['frequent', 'people', 'nature', 'food', 'activity', 'travel', 'objects', 'symbols']}
  searchable={true}
/>
```

### 4. ReactionBar (Complete UI)

```tsx
<ReactionBar
  type="comment"
  id="uuid"
  variant="compact" | "expanded" | "minimal"
  maxVisible={6}
  showAddButton={true}
  showCounts={true}
  realtime={true}
  onReactionClick={(emoji, users) => {}} // Show who reacted
/>
```

---

## Usage Examples

### Example 1: Comments

```tsx
import { ReactionBar } from '@/components/reactions/ReactionBar';

function CommentItem({ comment }) {
  return (
    <div>
      <p>{comment.content}</p>
      <ReactionBar type="comment" id={comment.id} variant="compact" realtime />
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
      <ReactionBar type="vibelog" id={vibelog.id} variant="expanded" showCounts />
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
      <img src={media.url} />
      <ReactionBar type="media" id={media.id} variant="compact" />
    </figure>
  );
}
```

---

## Visual Designs

### Variant 1: Compact (Default)

```
[👍 5] [❤️ 3] [😂 2] [+]
```

### Variant 2: Expanded

```
┌─────────────────────────────────────┐
│ 👍 5  ❤️ 3  😂 2  🎉 1  🔥 1  [+]   │
└─────────────────────────────────────┘
```

### Variant 3: Minimal (Hover to Show)

```
[8]  →  [👍 5] [❤️ 3] [+]
```

### Variant 4: Stacked (Mobile-Optimized)

```
👍 5
❤️ 3
😂 2
[+]
```

---

## Advanced Features

### 1. Reaction Analytics

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
  "reaction_diversity": 0.72 // 0-1, how varied reactions are
}
```

### 2. Reaction Notifications

```typescript
// When someone reacts to your content
{
  "type": "reaction",
  "actor": { "id": "...", "username": "alice" },
  "action": "reacted",
  "emoji": "❤️",
  "target": {
    "type": "comment",
    "id": "...",
    "preview": "This is an amazing point!"
  }
}
```

### 3. Custom Emoji Sets

```typescript
const VIBELOG_REACTIONS = ['🔥', '💯', '🎯', '✨', '💜', '🚀'];
const LIVE_CHAT_REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👏'];
const MEDIA_REACTIONS = ['😍', '🔥', '✨', '👀', '💯', '🎨'];

<ReactionBar
  type="vibelog"
  id={id}
  emojiSet={VIBELOG_REACTIONS}
/>
```

### 4. Reaction Limits

```typescript
<ReactionBar
  type="chat_message"
  id={id}
  maxReactionsPerUser={5}  // Prevent spam
  maxTotalReactions={100}   // Cap total
/>
```

### 5. Reaction Permissions

```typescript
<ReactionBar
  type="vibelog"
  id={id}
  canReact={(user, emoji) => {
    // Custom logic
    return user.is_verified || emoji === '👍';
  }}
/>
```

---

## Performance Optimizations

### 1. Aggregated Counts (Denormalized)

```sql
-- Add reaction_count column to each reactable table
ALTER TABLE comments ADD COLUMN reaction_count INTEGER DEFAULT 0;
ALTER TABLE vibelogs ADD COLUMN reaction_count INTEGER DEFAULT 0;

-- Update via trigger
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    EXECUTE format(
      'UPDATE %I SET reaction_count = reaction_count + 1 WHERE id = $1',
      NEW.reactable_type || 's'  -- 'comment' -> 'comments'
    ) USING NEW.reactable_id;
  ELSIF (TG_OP = 'DELETE') THEN
    EXECUTE format(
      'UPDATE %I SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = $1',
      OLD.reactable_type || 's'
    ) USING OLD.reactable_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_reaction_count();
```

### 2. Caching Strategy

```typescript
// React Query / SWR with aggressive caching
const { data: reactions } = useQuery(['reactions', type, id], () => fetchReactions(type, id), {
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
  refetchOnWindowFocus: false,
  optimisticUpdates: true,
});
```

### 3. Batch Fetching

```typescript
// Fetch reactions for multiple items at once
POST /api/reactions/batch

{
  "items": [
    { "type": "comment", "id": "uuid1" },
    { "type": "comment", "id": "uuid2" },
    { "type": "vibelog", "id": "uuid3" }
  ]
}

// Response
{
  "comment:uuid1": { reactions: [...], total: 5 },
  "comment:uuid2": { reactions: [...], total: 3 },
  "vibelog:uuid3": { reactions: [...], total: 12 }
}
```

---

## Migration Path

### Phase 1: Migrate Existing Data

```sql
-- Migrate comment_reactions to universal reactions table
INSERT INTO reactions (reactable_type, reactable_id, user_id, emoji, created_at)
SELECT
  'comment' as reactable_type,
  comment_id as reactable_id,
  user_id,
  emoji,
  created_at
FROM comment_reactions;

-- Drop old table after verification
DROP TABLE comment_reactions CASCADE;
```

### Phase 2: Update Components

```tsx
// Before
<CommentReactions commentId={id} />

// After
<ReactionBar type="comment" id={id} />
```

---

## Future Extensions

1. **Reaction Animations** - Confetti, sparkles, emoji explosions
2. **Reaction Leaderboards** - Most reacted content
3. **Reaction Trends** - Trending emojis over time
4. **Reaction Stories** - "10 people loved this"
5. **Reaction Challenges** - "Get 100 🔥 reactions"
6. **Custom Reactions** - Upload custom emoji packs
7. **Reaction NFTs** - Blockchain-based rare reactions
8. **AI Suggested Reactions** - Based on content sentiment

---

## Success Metrics

- **Reaction Rate**: % of viewers who react
- **Reaction Diversity**: Variety of emoji used
- **Reaction Velocity**: Reactions per hour
- **Top Reactors**: Users who react most
- **Most Reacted Content**: Viral vibelogs/comments

---

This system is:

- ✅ **Universal** - Works everywhere
- ✅ **Scalable** - Handles millions of reactions
- ✅ **Real-time** - Instant updates
- ✅ **Developer-Friendly** - 1 line of code
- ✅ **User-Delightful** - Beautiful interactions
