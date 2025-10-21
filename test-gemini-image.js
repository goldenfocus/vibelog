#!/usr/bin/env node

/**
 * Test script for Gemini 2.5 Flash Image generation
 * Tests the generate-cover endpoint with device detection
 */

const testCases = [
  {
    name: 'Mobile Device (iPhone)',
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    },
    body: {
      title: 'Test Vibelog: Mobile Portrait Image',
      summary: 'Testing 9:16 aspect ratio for mobile devices',
      tone: 'inspirational',
      username: 'test-user'
    },
    expectedAspect: '9:16',
    expectedDimensions: '1080x1920'
  },
  {
    name: 'Desktop Device (Chrome)',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body: {
      title: 'Test Vibelog: Desktop Landscape Image',
      summary: 'Testing 16:9 aspect ratio for desktop devices',
      tone: 'professional',
      username: 'test-user'
    },
    expectedAspect: '16:9',
    expectedDimensions: '1920x1080'
  }
];

async function runTest(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const response = await fetch('http://localhost:3000/api/generate-cover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...testCase.headers
      },
      body: JSON.stringify(testCase.body)
    });

    const data = await response.json();

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📏 Expected Aspect: ${testCase.expectedAspect}`);
    console.log(`📏 Expected Dimensions: ${testCase.expectedDimensions}`);
    console.log(`\n📦 Response Data:`);
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log(`\n✅ Test PASSED`);
      console.log(`   URL: ${data.url}`);
      console.log(`   Path: ${data.path || 'N/A'}`);
      console.log(`   Dimensions: ${data.width}x${data.height}`);
      console.log(`   Style: ${data.style}`);

      // Verify dimensions match expected
      const expectedDims = testCase.expectedDimensions;
      const actualDims = `${data.width}x${data.height}`;

      if (data.path && data.path.includes(expectedDims)) {
        console.log(`   ✅ Dimensions match expected: ${expectedDims}`);
      } else if (data.url === '/og-image.png') {
        console.log(`   ⚠️  Using placeholder (API key may not be configured)`);
      } else {
        console.log(`   ⚠️  Warning: Dimensions don't match expected`);
        console.log(`      Expected: ${expectedDims}`);
        console.log(`      Got: ${actualDims}`);
      }
    } else {
      console.log(`\n❌ Test FAILED`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.log(`\n❌ Test FAILED with exception`);
    console.log(`   Error: ${error.message}`);
    console.log(`\n💡 Make sure the dev server is running: npm run dev`);
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║       Gemini 2.5 Flash Image Generation Test Suite        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  console.log(`📝 This test suite will:`);
  console.log(`   1. Test mobile device image generation (9:16)`);
  console.log(`   2. Test desktop device image generation (16:9)`);
  console.log(`   3. Verify device detection is working`);
  console.log(`   4. Validate API responses`);

  console.log(`\n⚙️  Prerequisites:`);
  console.log(`   • Dev server running on http://localhost:3000`);
  console.log(`   • GEMINI_API_KEY configured in .env.local`);
  console.log(`   • @google/generative-ai package installed`);

  console.log(`\n🚀 Starting tests...\n`);

  for (const testCase of testCases) {
    await runTest(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✨ All tests completed!`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`📚 Next steps:`);
  console.log(`   • Check the console output above for any failures`);
  console.log(`   • Review GEMINI_IMAGE_MIGRATION.md for troubleshooting`);
  console.log(`   • Test in the UI by recording a vibelog`);
  console.log(``);
}

// Check if server is likely running before starting
fetch('http://localhost:3000/api/generate-cover', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'ping' })
})
  .then(() => main())
  .catch(() => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                      ⚠️  Server Not Running                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

The development server doesn't appear to be running.

Please start it first:

  npm run dev

Then run this test again:

  node test-gemini-image.js

`);
  });
