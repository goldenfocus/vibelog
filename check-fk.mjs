// Check foreign key names in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogqcycqctxulcvhjeiii.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncWN5Y3FjdHh1bGN2aGplaWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MzgxNywiZXhwIjoyMDczMjI5ODE3fQ.eMtvOdDVMukPEQnFrc-Akdh8n8qB5Lv_IXNLpSroruU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkForeignKeys() {
  console.log('🔍 Checking foreign key relationships...\n');

  // Query to get foreign key constraints
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'comments'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `
  });

  if (error) {
    console.error('Error:', error);

    // Try alternative method using service role
    console.log('\nTrying alternative query method...');
    const { data: altData, error: altError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'comments');

    console.log('Alt result:', altData, altError);
  } else {
    console.log('Foreign keys:', data);
  }

  // Try a simpler test - just select comments with profiles
  console.log('\n🧪 Testing different relationship hints...\n');

  const hints = [
    'comments_user_id_fkey',
    'user_id',
    'profiles',
    null // No hint
  ];

  for (const hint of hints) {
    const selectStr = hint
      ? `profiles!${hint}(id, username)`
      : `profiles(id, username)`;

    console.log(`Testing: ${selectStr}`);

    const { data, error } = await supabase
      .from('comments')
      .select(`id, ${selectStr}`)
      .limit(1);

    if (error) {
      console.log(`  ❌ ${error.code}: ${error.message}`);
    } else {
      console.log(`  ✅ Success! Found ${data?.length} records`);
      if (data && data.length > 0) {
        console.log(`     Sample:`, JSON.stringify(data[0], null, 2));
      }
    }
  }
}

checkForeignKeys().catch(console.error);
