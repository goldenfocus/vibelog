#!/bin/bash
# Migration Cleanup Script
# Renames old-style migrations (001_, 002_, etc.) to timestamp format (20251101XXXXXX_)
# Also updates Supabase migration history table

set -e

MIGRATIONS_DIR="supabase/migrations"

echo "=== Migration Cleanup Script ==="
echo ""

# Step 1: Rename local files
echo "Step 1: Renaming local migration files..."

declare -A RENAMES=(
  ["001_sync_profile_total_views.sql"]="20251101000000_sync_profile_total_views.sql"
  ["002_add_profile_fields.sql"]="20251101010000_add_profile_fields.sql"
  ["003_storage_public_access.sql"]="20251101020000_storage_public_access.sql"
  ["004_add_username_changed_at.sql"]="20251101030000_add_username_changed_at.sql"
  ["005_backfill_public_slugs.sql"]="20251101040000_backfill_public_slugs.sql"
  ["006_add_vibelog_likes.sql"]="20251101050000_add_vibelog_likes.sql"
  ["007_add_voice_cloning.sql"]="20251101060000_add_voice_cloning.sql"
  ["008_fix_profile_creation_trigger.sql"]="20251101070000_fix_profile_creation_trigger.sql"
  ["009_add_multilanguage_support.sql"]="20251101080000_add_multilanguage_support.sql"
  ["010_sync_profile_total_vibelogs.sql"]="20251101090000_sync_profile_total_vibelogs.sql"
  ["011_add_tone_preferences.sql"]="20251101100000_add_tone_preferences.sql"
  ["012_create_comments_table.sql"]="20251101110000_create_comments_table.sql"
  ["013_add_admin_role.sql"]="20251101120000_add_admin_role.sql"
  ["014_create_usage_tracking.sql"]="20251101130000_create_usage_tracking.sql"
  ["015_create_admin_audit_log.sql"]="20251101140000_create_admin_audit_log.sql"
  ["016_remove_voice_cloning_columns.sql"]="20251101150000_remove_voice_cloning_columns.sql"
  ["018_add_social_publishing_safe.sql"]="20251101160000_add_social_publishing_safe.sql"
  ["019_add_twitter_credentials_to_profiles.sql"]="20251101170000_add_twitter_credentials_to_profiles.sql"
  ["020_remove_tts_audio_urls.sql"]="20251101180000_remove_tts_audio_urls.sql"
  ["021_add_vibe_engine.sql"]="20251101190000_add_vibe_engine.sql"
)

cd "$(dirname "$0")/.."

for old_name in "${!RENAMES[@]}"; do
  new_name="${RENAMES[$old_name]}"
  if [ -f "$MIGRATIONS_DIR/$old_name" ]; then
    echo "  Renaming: $old_name -> $new_name"
    git mv "$MIGRATIONS_DIR/$old_name" "$MIGRATIONS_DIR/$new_name"
  else
    echo "  Skipping (not found): $old_name"
  fi
done

# Step 2: Delete duplicate/orphan files
echo ""
echo "Step 2: Removing duplicate and orphan files..."

FILES_TO_DELETE=(
  "017_remove_voice_cloning_columns.sql"  # Duplicate of 016
  "023a_enhanced_comments.sql"            # Already applied, orphan naming
)

for file in "${FILES_TO_DELETE[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$file" ]; then
    echo "  Deleting: $file"
    git rm "$MIGRATIONS_DIR/$file"
  else
    echo "  Skipping (not found): $file"
  fi
done

echo ""
echo "=== Local file changes complete ==="
echo ""
echo "Step 3: You need to update the Supabase migration history table."
echo "Run the following SQL in your Supabase dashboard or via MCP:"
echo ""
cat << 'SQLEOF'
-- Update migration versions in supabase_migrations.schema_migrations
UPDATE supabase_migrations.schema_migrations SET version = '20251101000000' WHERE version = '001';
UPDATE supabase_migrations.schema_migrations SET version = '20251101010000' WHERE version = '002';
UPDATE supabase_migrations.schema_migrations SET version = '20251101020000' WHERE version = '003';
UPDATE supabase_migrations.schema_migrations SET version = '20251101030000' WHERE version = '004';
UPDATE supabase_migrations.schema_migrations SET version = '20251101040000' WHERE version = '005';
UPDATE supabase_migrations.schema_migrations SET version = '20251101050000' WHERE version = '006';
UPDATE supabase_migrations.schema_migrations SET version = '20251101060000' WHERE version = '007';
UPDATE supabase_migrations.schema_migrations SET version = '20251101070000' WHERE version = '008';
UPDATE supabase_migrations.schema_migrations SET version = '20251101080000' WHERE version = '009';
UPDATE supabase_migrations.schema_migrations SET version = '20251101090000' WHERE version = '010';
UPDATE supabase_migrations.schema_migrations SET version = '20251101100000' WHERE version = '011';
UPDATE supabase_migrations.schema_migrations SET version = '20251101110000' WHERE version = '012';
UPDATE supabase_migrations.schema_migrations SET version = '20251101120000' WHERE version = '013';
UPDATE supabase_migrations.schema_migrations SET version = '20251101130000' WHERE version = '014';
UPDATE supabase_migrations.schema_migrations SET version = '20251101140000' WHERE version = '015';
UPDATE supabase_migrations.schema_migrations SET version = '20251101150000' WHERE version = '016';
DELETE FROM supabase_migrations.schema_migrations WHERE version = '017';
UPDATE supabase_migrations.schema_migrations SET version = '20251101160000' WHERE version = '018';
UPDATE supabase_migrations.schema_migrations SET version = '20251101170000' WHERE version = '019';
UPDATE supabase_migrations.schema_migrations SET version = '20251101180000' WHERE version = '020';
UPDATE supabase_migrations.schema_migrations SET version = '20251101190000' WHERE version = '021';
SQLEOF

echo ""
echo "After running the SQL, commit your changes:"
echo "  git add -A && git commit -m 'chore: standardize migration naming to timestamp format'"
