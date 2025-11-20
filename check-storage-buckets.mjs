#!/usr/bin/env node

/**
 * Check Supabase Storage buckets
 */

import fs from 'fs';

import { createClient } from '@supabase/supabase-js';

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkBuckets() {
  console.log('🔍 Checking Supabase Storage buckets...\n');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Error listing buckets:', error);
    process.exit(1);
  }

  if (!buckets || buckets.length === 0) {
    console.log('⚠️  No storage buckets found!');
    console.log('\n📝 You need to create a bucket named "vibelog-assets"');
    console.log('   Go to: https://supabase.com/dashboard/project/ogqcycqctxulcvhjeiii/storage/buckets');
    process.exit(0);
  }

  console.log(`Found ${buckets.length} bucket(s):\n`);
  buckets.forEach((bucket, i) => {
    console.log(`${i + 1}. ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
  });

  console.log('\n✅ Storage is configured!');

  if (!buckets.find(b => b.name === 'vibelog-assets')) {
    console.log('\n⚠️  WARNING: "vibelog-assets" bucket not found!');
    console.log('   Available buckets:', buckets.map(b => b.name).join(', '));
    console.log('\n📝 Create "vibelog-assets" bucket in Supabase dashboard');
  }
}

checkBuckets().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
