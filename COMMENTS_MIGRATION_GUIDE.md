# Comments System Migration Guide

## 🎯 Quick Start

Run this in Supabase SQL Editor to enable comments:

```bash
# Copy the idempotent migration script
cat IDEMPOTENT_COMMENTS_MIGRATION.sql
```

Then paste and run in: **Supabase Dashboard → SQL Editor → New Query → Run**

## ✅ Why This Script is Safe

The `IDEMPOTENT_COMMENTS_MIGRATION.sql` script is **safe to run multiple times** because:

1. **All CREATE statements use IF NOT EXISTS**
   ```sql
   CREATE TABLE IF NOT EXISTS comments (...)
   CREATE INDEX IF NOT EXISTS comments_idx (...)
   ```

2. **All policies wrapped in existence checks**
   ```sql
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='...') THEN
       CREATE POLICY ...
     END IF;
   END $$;
   ```

3. **All columns added with IF NOT EXISTS**
   ```sql
   ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_url text;
   ```

## 🔧 What Gets Created

### Tables & Columns
- ✅ `comments` table with 30+ columns
  - Basic: content, audio_url, video_url
  - Enhanced: mini-vibelog fields
  - Rich media: attachments, media_description
  - Engagement: likes, replies, views counts
  - SEO: slug, seo_title, seo_description

### Indexes (14 total)
- vibelog_id, user_id, created_at
- video_url, audio_url (partial)
- mini_vibelog, parent_comment, processing status
- rich media, attachment count

### Security (RLS Policies)
- `comments select public or own` - View public comments
- `comments insert authenticated` - Authenticated users can comment
- `comments update own` - Users can edit their comments
- `comments delete own` - Users can delete their comments

### Automation (Triggers)
- Auto-update `updated_at` timestamp
- Auto-set `is_mini_vibelog` flag
- Auto-update `has_rich_media` flag
- Auto-update `comment_count` on vibelogs

### Views
- `enhanced_comments` - Join with profiles and mini-vibelog data

## 🚨 Troubleshooting

### Error: "policy already exists"
✅ **Solution**: Use `IDEMPOTENT_COMMENTS_MIGRATION.sql` instead of `APPLY_COMMENTS_MIGRATION_TO_PRODUCTION.sql`

The idempotent version checks for existence before creating anything.

### Error: "relation comments does not exist"
✅ **Solution**: Run the idempotent migration script

### Comments still not showing
1. Check table exists: `SELECT COUNT(*) FROM comments;`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename='comments';`
3. Try creating a test comment via the UI

## 📊 Verify It Worked

After running the migration:

```sql
-- Should return 0 or existing count (no error)
SELECT COUNT(*) FROM comments;

-- Should show comment_count column
SELECT id, title, comment_count FROM vibelogs LIMIT 5;

-- Should return policy names
SELECT policyname FROM pg_policies WHERE tablename='comments';
```

## 🎉 Expected Behavior After Migration

### Before Migration
- Homepage: "Comments will be available soon!"
- About page: "Comments will be available soon!"
- No comment sections visible

### After Migration
- Homepage: "Recent Vibes" section appears (empty if no comments)
- Vibelog pages: Comment section appears
- Comment counts show: "0 comments", "1 comment", etc.
- Users can leave comments (text, voice, video)

## 📁 Files Modified

| File | Purpose |
|------|---------|
| `IDEMPOTENT_COMMENTS_MIGRATION.sql` | Safe migration script (USE THIS) |
| `app/api/comments/recent/route.ts` | Graceful error handling |
| `components/RecentComments.tsx` | Better empty state message |
| `APPLY_COMMENTS_MIGRATION_TO_PRODUCTION.sql` | Original script (may fail on partial migrations) |

## 🔗 Related PRs

- PR #458 - This fix (idempotent migration + graceful errors)
- PR #453 - Homepage real-time updates (merged)

---

**Created**: 2025-11-18
**Status**: Ready for production
**Safety**: 100% idempotent, can run multiple times
