# Twitter Auto-Posting Setup Guide

## Overview

This feature allows your Vibelog app to automatically post vibelogs to Twitter/X when users publish them.

## What's Been Implemented

### ✅ Backend Infrastructure

1. **Database Schema** (`supabase/migrations/018_add_social_publishing_safe.sql`)
   - `vibelog_social_posts` table to track posts across platforms
   - Profile columns for auto-post preferences
   - RLS policies for security

2. **Twitter API Endpoint** (`app/api/publish/twitter/route.ts`)
   - POST: Publishes vibelog to Twitter
   - GET: Checks if vibelog has been posted
   - Handles content formatting (teaser/full/custom templates)
   - Character limit enforcement (280 chars)
   - Error handling and status tracking

3. **Auto-Post Integration** (`app/api/save-vibelog/route.ts`)
   - Automatically triggers Twitter posting after vibelog save
   - Non-blocking (fire-and-forget)
   - Only posts if user has auto-posting enabled

### ✅ Frontend Components

1. **Settings UI** (`components/settings/AutoPostSettings.tsx`)
   - Toggle to enable/disable auto-posting
   - Post format selection (teaser/full/custom)
   - Custom template editor with placeholders
   - Integrated into `/settings/profile` page

2. **Post Indicator** (`components/VibelogActions.tsx`)
   - Shows Twitter icon on vibelogs that have been posted
   - Clickable link to view post on Twitter
   - Only visible to vibelog owner

### ✅ Configuration

- Environment variables documented in `.env.example`
- Migration files created and ready to apply

## Setup Instructions

### Step 1: Run Database Migration

Apply the database schema changes:

```bash
pnpm db:migrate
```

Or manually run the migration:

```bash
supabase db push --linked --include-all
```

If you encounter conflicts with existing migrations, you can apply just the new migration:

```bash
# The safe idempotent version
cat supabase/migrations/018_add_social_publishing_safe.sql | psql <your-db-connection-string>
```

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Twitter Auto-Posting
TWITTER_SESSION_KEY=your_32_character_encryption_key_here
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password

# App URL (for generating links in tweets)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

**Generate encryption key:**

```bash
# Generate a random 32-character key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Step 3: Test the Feature

1. **Enable Auto-Posting:**
   - Go to Settings > Profile
   - Scroll to "Twitter Auto-Posting" section
   - Toggle "Enable Auto-Posting" to ON
   - Select post format (teaser recommended)
   - Click "Save Settings"

2. **Publish a Vibelog:**
   - Record and publish a new vibelog
   - Check your Twitter account - it should auto-post!
   - The vibelog will show a blue Twitter icon linking to the tweet

3. **Manual Testing:**
   - Test the API endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/publish/twitter \
     -H "Content-Type: application/json" \
     -d '{"vibelogId": "your-vibelog-id"}'
   ```

## Architecture

### Post Flow

```
User Publishes Vibelog
  ↓
Save to Database
  ↓
Check if auto_post_twitter is enabled
  ↓ (if yes)
Fire-and-forget API call to /api/publish/twitter
  ↓
TwitterAutomation class (existing)
  ↓
Post to Twitter
  ↓
Save post metadata to vibelog_social_posts
```

### Content Formatting

**Teaser Mode** (default):

```
[Title]

[Teaser content or first 200 chars]

Read more: https://vibelog.app/@user/slug
```

**Full Mode:**

```
[Title]

[Full content, truncated to fit 280 chars]

https://vibelog.app/@user/slug
```

**Custom Mode:**
Uses user's template with placeholders:

- `{title}` - Vibelog title
- `{content}` - Vibelog content
- `{url}` - Public URL

## Database Schema

### vibelog_social_posts Table

- `id` - UUID primary key
- `vibelog_id` - Reference to vibelogs table
- `user_id` - Reference to auth.users
- `platform` - 'twitter', 'instagram', etc.
- `post_id` - Platform's post ID
- `post_url` - Direct link to post
- `post_data` - JSON metadata
- `status` - 'pending', 'posting', 'posted', 'failed'
- `error_message` - Error details if failed
- `posted_at` - Timestamp of successful post

### profiles Table (new columns)

- `auto_post_twitter` - Boolean, enable/disable
- `auto_post_instagram` - Boolean (future)
- `auto_post_linkedin` - Boolean (future)
- `twitter_post_format` - 'teaser' | 'full' | 'custom'
- `twitter_custom_template` - Custom template string

## Extending to Other Platforms

The architecture is designed for multi-platform support. To add Instagram/LinkedIn/TikTok:

1. Create platform-specific automation class (like `TwitterAutomation`)
2. Create API route `/api/publish/[platform]/route.ts`
3. Add auto-post toggle to settings UI
4. Update `save-vibelog` flow to check new platform flag

## Troubleshooting

### Migration Issues

If migrations conflict, use the safe idempotent version:

```bash
# Apply only social publishing migration
psql <connection-string> < supabase/migrations/018_add_social_publishing_safe.sql
```

### Twitter Auth Issues

- Check `TWITTER_SESSION_KEY` is 32 characters
- Verify `TWITTER_USERNAME` and `TWITTER_PASSWORD` are correct
- Check Twitter automation logs in console

### Posts Not Auto-Posting

1. Verify `auto_post_twitter` is TRUE in database:
   ```sql
   SELECT auto_post_twitter FROM profiles WHERE id = 'user-id';
   ```
2. Check environment variables are set
3. Look for errors in server logs
4. Test manual posting via API endpoint

## Security Notes

- Twitter credentials are encrypted using AES-256-CBC
- Session storage uses user-specific encryption
- RLS policies ensure users only access their own posts
- API endpoint verifies ownership before posting

## Performance

- Auto-posting is non-blocking (async fire-and-forget)
- Does not delay vibelog save response
- Twitter rate limits are handled with exponential backoff
- Failed posts are logged but don't block user flow

## Future Enhancements

- [ ] Retry failed posts automatically
- [ ] Post scheduling/queuing
- [ ] Thread support for long vibelogs
- [ ] Image/media attachments
- [ ] Analytics integration
- [ ] Multi-account support
- [ ] OAuth authentication (vs credentials)

## Files Modified/Created

### Created

- `supabase/migrations/018_add_social_publishing_safe.sql`
- `app/api/publish/twitter/route.ts`
- `components/settings/AutoPostSettings.tsx`
- `TWITTER_AUTO_POST_SETUP.md` (this file)

### Modified

- `app/api/save-vibelog/route.ts` (added auto-post hook)
- `app/settings/profile/page.tsx` (added AutoPostSettings component)
- `components/VibelogActions.tsx` (added Twitter post indicator)
- `.env.example` (added Twitter config)

## Credits

Built on top of existing Twitter automation infrastructure:

- `lib/publishers/twitter-automation.ts`
- `lib/publishers/twitter-auth.ts`

The heavy lifting was already done! This implementation just wires it into the vibelog publishing flow.
