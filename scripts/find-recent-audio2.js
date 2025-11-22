import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findRecentAudio() {
  const vibelogId = 'fc572854-d02c-438d-a71b-9cdaa2859a75';

  console.log('Checking for audio files for vibelog:', vibelogId);

  // Check sessions folder for anonymous uploads
  const { data: sessionFiles, error: sessionError } = await supabase.storage
    .from('vibelogs')
    .list('sessions', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (sessionError) {
    console.error('Error listing session files:', sessionError);
  } else {
    console.log('\nFound', sessionFiles.length, 'files in sessions folder');
    if (sessionFiles.length > 0) {
      console.log('Most recent 5 files:');
      sessionFiles.slice(0, 5).forEach(file => {
        const date = file.created_at ? new Date(file.created_at) : new Date();
        console.log('  - ' + file.name + ' (' + date.toISOString() + ')');
      });
    }
  }

  // Check the vibelog record
  const { data: vibelog } = await supabase
    .from('vibelogs')
    .select('id, title, created_at, audio_url')
    .eq('id', vibelogId)
    .single();

  if (vibelog) {
    console.log('\nVibelog details:');
    const created = new Date(vibelog.created_at);
    console.log('  Created:', created.toISOString());
    console.log('  Audio URL:', vibelog.audio_url || '(none)');
  }
}

findRecentAudio()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
