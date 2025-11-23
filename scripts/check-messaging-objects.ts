import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkObjects() {
  console.log('🔍 Checking existing messaging-related database objects...\n');

  // Check tables
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND (tablename LIKE '%conversation%'
             OR tablename LIKE '%message%'
             OR tablename = 'follows'
             OR tablename = 'user_presence')
      ORDER BY tablename;
    `,
  });

  if (tablesError) {
    // Try direct query if RPC doesn't work
    const { data, error } = await supabase.from('information_schema.tables').select('table_name');
    console.log('Tables query result:', { data, error });
  } else {
    console.log('📊 Existing Tables:');
    console.log(tables);
  }

  console.log('\n');

  // Check indexes - direct psql query
  console.log('📇 Run this SQL to check indexes:');
  console.log(`
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE '%conversation%'
       OR indexname LIKE '%message%'
       OR indexname LIKE '%follow%'
       OR indexname LIKE '%presence%')
ORDER BY indexname;
  `);
}

checkObjects().catch(console.error);
