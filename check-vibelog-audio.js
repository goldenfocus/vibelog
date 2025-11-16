import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVibelog() {
  const slug = 'welcome-to-the-era-of-vibe-flow-communication-pb6kx0ml';
  
  console.log('Checking vibelog:', slug);
  
  // Try public_slug first
  let { data, error } = await supabase
    .from('vibelogs')
    .select('id, title, slug, public_slug, audio_url, user_id, is_public, is_published')
    .eq('public_slug', slug)
    .maybeSingle();
  
  if (!data) {
    // Try slug field
    const result = await supabase
      .from('vibelogs')
      .select('id, title, slug, public_slug, audio_url, user_id, is_public, is_published')
      .eq('slug', slug)
      .maybeSingle();
    
    data = result.data;
    error = result.error;
  }
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data) {
    console.log('Vibelog not found');
    return;
  }
  
  console.log('Found vibelog:');
  console.log('  ID:', data.id);
  console.log('  Title:', data.title);
  console.log('  Slug:', data.slug);
  console.log('  Public Slug:', data.public_slug);
  console.log('  User ID:', data.user_id);
  console.log('  Is Public:', data.is_public);
  console.log('  Is Published:', data.is_published);
  console.log('  Audio URL:', data.audio_url || '(none)');
  console.log('  Has Audio?', !!data.audio_url);
}

checkVibelog().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
