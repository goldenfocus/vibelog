import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 Applying ai_audio_url migration...');

  try {
    // Execute raw SQL directly
    const { data, error } = await supabase.from('vibelogs').select('ai_audio_url').limit(1);

    if (error && error.message.includes('column "ai_audio_url" does not exist')) {
      console.log('📝 Column does not exist, needs to be added manually via Supabase Dashboard');
      console.log('');
      console.log('Run this SQL in the Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS ai_audio_url TEXT;');
      console.log("COMMENT ON COLUMN public.vibelogs.ai_audio_url IS 'URL to AI-generated narration audio file (stored in Supabase Storage)';");
      console.log('CREATE INDEX IF NOT EXISTS idx_vibelogs_ai_audio_url ON public.vibelogs(ai_audio_url) WHERE ai_audio_url IS NOT NULL;');
    } else if (!error) {
      console.log('✅ Column ai_audio_url already exists!');
    } else {
      console.error('❌ Error checking column:', error);
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
