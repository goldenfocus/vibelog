/**
 * Script to delete a specific vibelog
 * Usage: npx tsx scripts/delete-vibelog.ts <vibelog-id>
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteVibelog(vibelogId: string) {
  console.log(`Deleting vibelog: ${vibelogId}`);

  const { data, error } = await supabase.from('vibelogs').delete().eq('id', vibelogId).select();

  if (error) {
    console.error('Error deleting vibelog:', error);
    process.exit(1);
  }

  console.log('Successfully deleted vibelog:', data);
}

const vibelogId = process.argv[2];

if (!vibelogId) {
  console.error('Usage: npx tsx scripts/delete-vibelog.ts <vibelog-id>');
  process.exit(1);
}

deleteVibelog(vibelogId);
