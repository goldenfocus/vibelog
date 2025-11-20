#!/usr/bin/env node

/**
 * Remove voice cloning columns from production database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

async function cleanupVoiceCloneColumns() {
  console.log('🧹 Removing voice clone columns from database...\n');

  // Read the migration SQL
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '016_remove_voice_cloning_columns.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('');

  // Execute each statement separately for better error handling
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) {continue;}

    try {
      console.log(`Executing: ${statement.substring(0, 60)}...`);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statement })
      });

      if (response.ok || response.status === 404) {
        console.log('✅ Success\n');
      } else {
        const text = await response.text();
        console.log(`⚠️  Response: ${response.status} - ${text}\n`);
      }

    } catch (err) {
      console.log(`⚠️  ${err.message}\n`);
    }
  }

  console.log('\n🎉 Voice clone column cleanup complete!');
  console.log('\nℹ️  Note: If exec endpoint doesn\'t exist, run this SQL manually in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new');
}

cleanupVoiceCloneColumns();
