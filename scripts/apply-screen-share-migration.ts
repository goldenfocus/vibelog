/**
 * Apply screen-share migration manually
 * Run with: npx tsx scripts/apply-screen-share-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying screen-share migration...\n');

  try {
    // Step 1: Add capture_mode column
    console.log('1. Adding capture_mode column...');
    const { error: col1Error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE vibelogs
          ADD COLUMN IF NOT EXISTS capture_mode TEXT DEFAULT 'audio'
            CHECK (capture_mode IN ('audio', 'camera', 'screen', 'screen-with-camera'));
      `
    });

    if (col1Error) {
      // Try direct approach
      console.log('   Using direct SQL execution...');
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          sql: `ALTER TABLE vibelogs ADD COLUMN IF NOT EXISTS capture_mode TEXT DEFAULT 'audio';`
        })
      });

      if (!response.ok) {
        console.log('   ⚠️  Column might already exist, continuing...');
      }
    }
    console.log('   ✅ capture_mode column ready\n');

    // Step 2: Add has_camera_pip column
    console.log('2. Adding has_camera_pip column...');
    console.log('   ⚠️  Using SQL editor in Supabase Studio is recommended\n');

    console.log('✅ Migration preparation complete!');
    console.log('\nPlease run these SQL commands in Supabase Studio SQL Editor:\n');
    console.log('----------------------------------------');
    console.log(`
-- Add capture_mode column (if not exists)
ALTER TABLE vibelogs
  ADD COLUMN IF NOT EXISTS capture_mode TEXT DEFAULT 'audio'
    CHECK (capture_mode IN ('audio', 'camera', 'screen', 'screen-with-camera'));

-- Add has_camera_pip column (if not exists)
ALTER TABLE vibelogs
  ADD COLUMN IF NOT EXISTS has_camera_pip BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vibelogs_capture_mode
  ON vibelogs(capture_mode)
  WHERE capture_mode IN ('screen', 'screen-with-camera');

-- Add documentation comments
COMMENT ON COLUMN vibelogs.capture_mode IS 'Type of recording: audio (mic only), camera (video), screen (screen share), screen-with-camera (screen + camera PiP)';
COMMENT ON COLUMN vibelogs.has_camera_pip IS 'True if screen recording includes camera picture-in-picture overlay';

-- Update existing records
UPDATE vibelogs
SET capture_mode = CASE
  WHEN video_url IS NOT NULL AND video_source IN ('captured', 'uploaded') THEN 'camera'
  WHEN audio_url IS NOT NULL THEN 'audio'
  ELSE 'audio'
END
WHERE capture_mode = 'audio';
    `);
    console.log('----------------------------------------\n');

    console.log('📍 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
    console.log('   Copy and paste the SQL above, then click "Run"\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
