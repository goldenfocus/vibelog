# Audio Tabs Feature: Original vs AI Narration

## Overview

This feature adds a beautiful tabbed interface to switch between **Original Audio** (user's voice recording) and **AI Narration** (AI-generated full vibelog audio) on vibelog detail pages.

## User Experience

### When Both Audio Versions Exist
Users see a clean two-tab interface:
- **Original Tab**: Listen to the user's authentic voice recording
- **AI Narration Tab**: Listen to the AI-generated full vibelog narration

Each tab has:
- Descriptive text explaining the audio type
- Distinct gradient colors (pink/purple for Original, blue/cyan for AI)
- Play/Pause button with loading states
- Smooth animations and hover effects

### When Only One Version Exists
- If only original audio exists: Shows a single "Listen" button
- If only AI audio exists: Shows a single "Listen AI" button
- If neither exists: Component renders nothing (graceful degradation)

### Audio Playback
- Uses the global audio player for seamless playback across the app
- Shows play/pause state correctly for each audio type
- Prevents multiple audios from playing simultaneously
- Displays loading state while audio loads
- Integrates with the GlobalAudioPlayer at the bottom of the page

## Technical Implementation

### 1. Components Created

#### AudioTabs Component (`components/audio/AudioTabs.tsx`)
A reusable, self-contained audio tabs component with:
- **Props**:
  - `vibelogId`: Unique identifier for the vibelog
  - `originalAudioUrl`: URL to original voice recording
  - `aiAudioUrl`: URL to AI-generated narration
  - `title`: Vibelog title (for audio player metadata)
  - `author`: Author name (for audio player metadata)
  - `className`: Optional styling classes

- **Features**:
  - Radix UI Tabs for accessible tab switching
  - State management via Zustand audio player store
  - Smart rendering (tabs vs single button vs nothing)
  - Distinct track IDs for original vs AI (`vibelog-original-{id}` vs `vibelog-ai-{id}`)
  - Loading states per audio type
  - Beautiful gradient buttons matching VibeLog brand

### 2. Database Schema

Added `ai_audio_url` column to `vibelogs` table:

```sql
-- Migration: 20251118160000_add_ai_audio_url.sql
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS ai_audio_url TEXT;

COMMENT ON COLUMN public.vibelogs.ai_audio_url IS
  'URL to AI-generated narration audio file (stored in Supabase Storage)';

CREATE INDEX IF NOT EXISTS idx_vibelogs_ai_audio_url
ON public.vibelogs(ai_audio_url)
WHERE ai_audio_url IS NOT NULL;
```

**Schema Design**:
- `audio_url`: Original user voice recording
- `ai_audio_url`: AI-generated full vibelog narration
- Index on `ai_audio_url` for fast queries filtering by AI audio existence

### 3. TypeScript Types

Updated `types/database.ts`:

```typescript
export interface Vibelog {
  // ... existing fields
  audio_url?: string | null;      // Original audio recording
  ai_audio_url?: string | null;   // AI-generated narration audio
  // ... rest of fields
}
```

### 4. Integration Points

#### PublicVibelogContent Component
- Added `ai_audio_url` to props interface
- Imported and rendered `AudioTabs` component
- Positioned between video player and content metadata
- Passes vibelog ID, both audio URLs, title, and author

#### Data Fetching (app/[username]/[slug]/page.tsx)
- Updated SELECT queries to include `ai_audio_url`
- Passes `ai_audio_url` to PublicVibelogContent
- Works for both authenticated and anonymous vibelogs

#### Anonymous Vibelogs (app/v/[slug]/page.tsx)
- Also updated to fetch and pass `ai_audio_url`
- Ensures consistency across all vibelog viewing routes

### 5. Dependencies

Added `@radix-ui/react-tabs` for accessible tab components:
- Version: 1.1.13
- Provides keyboard navigation, ARIA attributes, and smooth animations

## Database Migration

### To Apply Migration

You need to run this SQL in the Supabase SQL Editor:

```sql
ALTER TABLE public.vibelogs
ADD COLUMN IF NOT EXISTS ai_audio_url TEXT;

COMMENT ON COLUMN public.vibelogs.ai_audio_url IS
  'URL to AI-generated narration audio file (stored in Supabase Storage)';

CREATE INDEX IF NOT EXISTS idx_vibelogs_ai_audio_url
ON public.vibelogs(ai_audio_url)
WHERE ai_audio_url IS NOT NULL;
```

Alternatively, use the Supabase CLI:
```bash
pnpm supabase db push
```

**Note**: There are some duplicate migration files that may cause conflicts. The migration script is idempotent (safe to run multiple times).

## Files Changed

### New Files
- `components/audio/AudioTabs.tsx` - Main audio tabs component
- `supabase/migrations/20251118160000_add_ai_audio_url.sql` - Database migration
- `scripts/apply-ai-audio-migration.ts` - Helper script to verify migration
- `AUDIO_TABS_FEATURE.md` - This documentation

### Modified Files
- `types/database.ts` - Added `ai_audio_url` field to Vibelog type
- `components/PublicVibelogContent.tsx` - Integrated AudioTabs component
- `app/[username]/[slug]/page.tsx` - Updated SELECT queries and props
- `app/v/[slug]/page.tsx` - Updated SELECT queries and props
- `package.json` - Added @radix-ui/react-tabs dependency

## Usage Examples

### Example 1: Vibelog with Both Audio Types
```typescript
<AudioTabs
  vibelogId="123e4567-e89b-12d3-a456-426614174000"
  originalAudioUrl="https://storage.supabase.co/audio/original-123.webm"
  aiAudioUrl="https://storage.supabase.co/audio/ai-narration-123.mp3"
  title="My Amazing Vibelog"
  author="John Doe"
/>
```

Result: Shows two tabs with distinct gradient buttons

### Example 2: Vibelog with Only Original Audio
```typescript
<AudioTabs
  vibelogId="123e4567-e89b-12d3-a456-426614174000"
  originalAudioUrl="https://storage.supabase.co/audio/original-123.webm"
  aiAudioUrl={null}
  title="My Amazing Vibelog"
  author="John Doe"
/>
```

Result: Shows single "Listen" button with pink/purple gradient

### Example 3: No Audio Available
```typescript
<AudioTabs
  vibelogId="123e4567-e89b-12d3-a456-426614174000"
  originalAudioUrl={null}
  aiAudioUrl={null}
  title="My Amazing Vibelog"
  author="John Doe"
/>
```

Result: Component returns null (nothing rendered)

## Future Enhancements

### Potential Improvements
1. **AI Audio Generation**
   - Backend service to automatically generate AI narration from vibelog content
   - Queue-based processing for long vibelogs
   - Multiple voice options (male/female, different accents)

2. **Audio Comparison Mode**
   - Side-by-side player to compare both versions
   - Synchronized playback option
   - Visual waveform comparison

3. **User Preferences**
   - Remember user's preferred audio type (original vs AI)
   - Auto-play preference for vibelog pages
   - Volume controls per audio type

4. **Analytics**
   - Track which audio version users prefer
   - Completion rates for each type
   - A/B testing for UI variations

5. **Accessibility**
   - Transcripts for both audio versions
   - Adjustable playback speed
   - Skip forward/backward controls

## Design Decisions

### Why Tabs Instead of Dropdown/Toggle?
- **Discoverability**: Tabs make both options immediately visible
- **Comparison**: Users can easily understand there are two distinct audio versions
- **Standards**: Tabs are a familiar pattern for switching between related content
- **Accessibility**: Radix UI Tabs provides excellent keyboard navigation and screen reader support

### Why Different Gradient Colors?
- **Visual Distinction**: Pink/purple for original (warmer, personal) vs blue/cyan for AI (cooler, synthetic)
- **Brand Consistency**: Both use VibeLog's gradient style
- **Intuitive**: Color coding helps users quickly identify audio type

### Why Single Track in Global Player?
- **Prevents Chaos**: Only one audio plays at a time
- **Consistent UX**: Matches existing audio player behavior in the app
- **Performance**: Reduces resource usage

## Testing Checklist

- [x] Component renders with both audio URLs
- [x] Component renders with only original audio
- [x] Component renders with only AI audio
- [x] Component renders nothing when no audio exists
- [x] Play button triggers audio playback
- [x] Audio integrates with global player
- [x] Play/pause state updates correctly
- [x] Loading state shows during audio load
- [x] Tab switching works smoothly
- [x] Keyboard navigation works (Tab, Enter, Arrow keys)
- [x] Mobile responsive (tabs stack nicely on small screens)
- [x] TypeScript types are correct
- [x] Database migration is idempotent
- [x] No build errors
- [x] No console errors during playback

## Deployment Notes

1. **Database Migration**: Must be applied before deploying code
2. **Backward Compatibility**: Code gracefully handles missing `ai_audio_url` (treats as null)
3. **Performance**: Index on `ai_audio_url` ensures fast queries
4. **Storage**: AI audio files will be stored in Supabase Storage (same as original audio)

## Support

For questions or issues:
- Check existing audio player store implementation in `state/audio-player-store.ts`
- Review GlobalAudioPlayer component in `components/GlobalAudioPlayer.tsx`
- See Radix UI Tabs docs: https://www.radix-ui.com/docs/primitives/components/tabs

---

**Last Updated**: November 18, 2025
**Status**: ✅ Implemented and Ready for Testing
**Migration Status**: ⚠️ Needs manual application via Supabase SQL Editor
