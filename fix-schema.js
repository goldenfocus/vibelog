import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ogqcycqctxulcvhjeiii.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWN5Y3FjdHh1bGN2aGplaWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MzgxNywiZXhwIjoyMDczMjI5ODE3fQ.eMtvOdDVMukPEQnFrc-Akdh8n8qB5Lv_IXNLpSroruU'
)

async function fixSchema() {
  console.log('🔧 Adding missing full_content column...')

  const { data, error } = await supabase.rpc('exec', {
    sql: 'ALTER TABLE public.vibelogs ADD COLUMN IF NOT EXISTS full_content text;'
  })

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Schema updated successfully!')
  }
}

fixSchema()