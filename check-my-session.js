const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

console.log('🔍 To check your current session:\n');
console.log('1. Open browser console on www.vibelog.io');
console.log('2. Run this JavaScript:\n');
console.log(`
// Get your current session
const supabaseUrl = '${SUPABASE_URL}';
const supabaseKey = '${ANON_KEY}';

async function checkSession() {
  const response = await fetch(supabaseUrl + '/auth/v1/user', {
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey
    },
    credentials: 'include'
  });

  const data = await response.json();
  console.log('Your session:', data);

  if (data.email) {
    console.log('\\n✅ Logged in as:', data.email);
    console.log('User ID:', data.id);

    // Check admin status
    const profileRes = await fetch(supabaseUrl + '/rest/v1/profiles?id=eq.' + data.id + '&select=email,username,is_admin', {
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
      }
    });
    const profile = await profileRes.json();
    console.log('\\n📋 Profile:', profile[0]);
    console.log('\\n' + (profile[0]?.is_admin ? '✅ YOU ARE ADMIN' : '❌ YOU ARE NOT ADMIN'));
  } else {
    console.log('\\n❌ NOT LOGGED IN');
  }
}

checkSession();
`);

console.log('\n3. This will show if you\'re logged in and if your account has is_admin=true');
console.log('\n💡 If it shows you\'re not admin, the session is stale - log out and back in!');
