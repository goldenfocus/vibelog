import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateVibelogAudio() {
  const vibelogId = 'fc572854-d02c-438d-a71b-9cdaa2859a75';
  const audioFile = 'session_1763230390172_isf7mk-3a4b2970.webm';
  const audioUrl = `${supabaseUrl}/storage/v1/object/public/vibelogs/sessions/${audioFile}`;
  
  console.log('Updating vibelog with audio URL...');
  console.log('Vibelog ID:', vibelogId);
  console.log('Audio URL:', audioUrl);
  
  const { data, error } = await supabase
    .from('vibelogs')
    .update({ 
      audio_url: audioUrl,
      audio_duration: null // We don't have the exact duration, but that's ok
    })
    .eq('id', vibelogId)
    .select();
  
  if (error) {
    console.error('Error updating vibelog:', error);
    return;
  }
  
  console.log('✅ Successfully updated vibelog!');
  console.log('Updated record:', data);
  console.log('\nYou should now see the play button at:');
  console.log('https://www.vibelog.io/@anonymous/welcome-to-the-era-of-vibe-flow-communication-pb6kx0ml');
}

updateVibelogAudio().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
