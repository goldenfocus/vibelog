#!/usr/bin/env node

/**
 * Configure CORS for Supabase Storage Bucket
 * This script updates the CORS configuration for the tts-audio bucket
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');

const SUPABASE_URL = 'https://ogqcycqctxulcvhjeiii.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'tts-audio';

const corsConfig = [
  {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'HEAD'],
    allowedHeaders: ['*'],
    maxAgeSeconds: 3600,
  },
];

async function configureCORS() {
  console.log('🔧 Configuring CORS for Supabase storage bucket...\n');

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.error('Please make sure .env.local is loaded');
    process.exit(1);
  }

  const url = `${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`;

  // First, get the current bucket configuration
  console.log(`📡 Fetching current configuration for bucket: ${BUCKET_NAME}`);

  const getOptions = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const currentConfig = await makeRequest(url, getOptions);
    console.log('✅ Current bucket configuration retrieved\n');

    // Update with CORS configuration
    console.log('📝 Updating CORS configuration...');

    const updatePayload = {
      id: BUCKET_NAME,
      name: BUCKET_NAME,
      public: currentConfig.public || true,
      file_size_limit: currentConfig.file_size_limit || null,
      allowed_mime_types: currentConfig.allowed_mime_types || null,
      cors: corsConfig,
    };

    const putOptions = {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    await makeRequest(url, putOptions, updatePayload);

    console.log('✅ CORS configuration updated successfully!\n');
    console.log('📋 New CORS settings:');
    console.log(JSON.stringify(corsConfig, null, 2));
    console.log('\n🎉 All done! Your audio files should now work with Web Audio API');
  } catch (error) {
    console.error('\n❌ Error configuring CORS:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the bucket "tts-audio" exists in your Supabase project');
    console.error('2. Verify your service role key has the correct permissions');
    console.error('3. Check that your Supabase project URL is correct');
    process.exit(1);
  }
}

function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: options.method,
      headers: options.headers,
    };

    const req = https.request(requestOptions, res => {
      let body = '';

      res.on('data', chunk => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Run the script
configureCORS();
