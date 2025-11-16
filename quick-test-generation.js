#!/usr/bin/env node

/**
 * Quick test - just trigger generation, don't wait
 */

const vibelogId = 'bc34b382-9c48-45ae-b00f-164be1e17aaf'; // The long-content one

console.log('🎬 Triggering video generation for long-content vibelog...');
console.log('Vibelog ID:', vibelogId);
console.log('');

fetch('https://www.vibelog.io/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vibelogId,
    aspectRatio: '16:9',
  }),
})
  .then(async (response) => {
    console.log('📥 Initial response:', response.status, response.statusText);
    const text = await response.text();

    try {
      const data = JSON.parse(text);
      console.log('Response:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('\n✅ Video generation started!');
        console.log('Check status in 5 minutes with: node check-video-error.js', vibelogId);
      } else {
        console.log('\n❌ Failed:', data.error);
      }
    } catch {
      console.log('Raw response:', text.substring(0, 500));
    }
  })
  .catch((error) => {
    console.error('\n💥 Request failed:', error.message);

    // This is expected if it times out, which means it's working!
    if (error.message.includes('ECONNRESET') || error.message.includes('timeout')) {
      console.log('\n⚠️  Connection timeout - this might mean the API is processing!');
      console.log('Check status in 5 minutes with: node check-video-error.js', vibelogId);
    }
  });
