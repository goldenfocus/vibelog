#!/usr/bin/env node

/**
 * Apply all pending migrations directly to production database
 * This bypasses CLI connection issues
 */

const fs = require('fs');
const https = require('https');

// Read credentials
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

// Read the consolidated migrations
const sql = fs.readFileSync('consolidated-migrations.sql', 'utf-8');

console.log('🚀 Applying all pending migrations to production...\n');
console.log(`📍 Target: ${SUPABASE_URL}\n`);

// Parse URL to use raw HTTPS request (bypassing CORS/PostgREST issues)
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const dbUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/exec`;

const postData = JSON.stringify({ query: sql });

const options = {
  method: 'POST',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  }
};

const req = https.request(dbUrl, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ All migrations applied successfully!\n');
      console.log('📋 Next steps:');
      console.log('   1. Set admin flags: node set-all-admins.js');
      console.log('   2. Test /admin access');
    } else {
      console.error(`❌ Failed with status ${res.statusCode}`);
      console.error(data);

      if (res.statusCode === 404) {
        console.log('\n💡 The exec RPC endpoint doesn\'t exist.');
        console.log('   Please run the SQL manually in Supabase Dashboard:');
        console.log('   https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new');
        console.log('\n📄 Copy this file: consolidated-migrations.sql');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Please run the SQL manually in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/sql/new');
  console.log('\n📄 Copy this file: consolidated-migrations.sql');
});

req.write(postData);
req.end();
