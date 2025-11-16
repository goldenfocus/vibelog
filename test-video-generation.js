#!/usr/bin/env node

/**
 * Test video generation API
 * Usage: node test-video-generation.js <vibelogId>
 */

const vibelogId = process.argv[2];

if (!vibelogId) {
  console.error('❌ Please provide a vibelogId');
  console.log('Usage: node test-video-generation.js <vibelogId>');
  process.exit(1);
}

console.log('🎬 Testing video generation API...\n');
console.log('Vibelog ID:', vibelogId);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('\n📡 Calling API endpoint...\n');

const url = process.env.NODE_ENV === 'production'
  ? 'https://www.vibelog.io/api/video/generate'
  : 'http://localhost:3000/api/video/generate';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    vibelogId,
    aspectRatio: '16:9',
  }),
})
  .then(async (response) => {
    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('\n');

    const text = await response.text();
    console.log('📄 Response body (raw):', text);
    console.log('\n');

    try {
      const data = JSON.parse(text);
      console.log('📦 Response body (parsed):', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('\n✅ Video generation started successfully!');
        console.log('Video URL:', data.data?.videoUrl);
      } else {
        console.log('\n❌ Video generation failed:');
        console.log('Error:', data.error);
      }
    } catch (err) {
      console.log('❌ Failed to parse response as JSON');
      console.error('Parse error:', err.message);
    }
  })
  .catch((error) => {
    console.error('\n💥 Request failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
