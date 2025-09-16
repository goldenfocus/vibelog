import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ogqcycqctxulcvhjeiii.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWN5Y3FjdHh1bGN2aGplaWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MzgxNywiZXhwIjoyMDczMjI5ODE3fQ.eMtvOdDVMukPEQnFrc-Akdh8n8qB5Lv_IXNLpSroruU'
)

async function applySchema() {
  console.log('🔧 Applying bulletproof schema...')

  try {
    // First, let's try adding the missing columns manually
    const queries = [
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS full_content text;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS session_id text;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_image_url text;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_image_alt text;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_image_width integer;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS cover_image_height integer;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS is_teaser boolean DEFAULT false;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS processing_status text DEFAULT \'completed\';',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS error_log text;',
      'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT \'{}\';'
    ]

    for (const query of queries) {
      console.log(`Executing: ${query}`)
      const { error } = await supabase.rpc('exec', { sql: query })
      if (error) {
        console.log(`❌ Error with query: ${error.message}`)
      } else {
        console.log('✅ Success!')
      }
    }

  } catch (error) {
    console.error('❌ Failed to apply schema:', error)
  }
}

applySchema()