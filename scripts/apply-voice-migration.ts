/**
 * Script to apply voice cloning database migration
 * Run with: npx tsx scripts/apply-voice-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Add voice_clone_id columns to support voice cloning feature
-- This allows storing ElevenLabs voice clone IDs for users and vibelogs

-- Add voice_clone_id to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_clone_id TEXT,
  ADD COLUMN IF NOT EXISTS voice_clone_name TEXT;

-- Add voice_clone_id to vibelogs table
ALTER TABLE public.vibelogs
  ADD COLUMN IF NOT EXISTS voice_clone_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS profiles_voice_clone_id_idx ON public.profiles (voice_clone_id)
  WHERE voice_clone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vibelogs_voice_clone_id_idx ON public.vibelogs (voice_clone_id)
  WHERE voice_clone_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.voice_clone_id IS 'ElevenLabs voice clone ID for this user';
COMMENT ON COLUMN public.profiles.voice_clone_name IS 'Name of the cloned voice';
COMMENT ON COLUMN public.vibelogs.voice_clone_id IS 'ElevenLabs voice clone ID used to generate audio for this vibelog';
`;

async function applyMigration() {
  console.log('🔄 Applying voice cloning migration...\n');

  try {
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying direct SQL execution...');
      const { error: directError } = await (supabase as any).from('_').select(migrationSQL);

      if (directError) {
        throw directError;
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('Added columns:');
    console.log('  - profiles.voice_clone_id');
    console.log('  - profiles.voice_clone_name');
    console.log('  - vibelogs.voice_clone_id');
    console.log('\nCreated indexes:');
    console.log('  - profiles_voice_clone_id_idx');
    console.log('  - vibelogs_voice_clone_id_idx');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n📋 Manual steps:');
    console.error('1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.error('2. Paste and run the SQL from /tmp/apply-voice-migration.sql');
    process.exit(1);
  }
}

applyMigration();
