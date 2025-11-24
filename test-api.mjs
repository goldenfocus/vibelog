// Test the fixed APIs
async function testAPIs() {
  console.log('🧪 Testing fixed comment APIs...\n');

  // Test 1: Home feed API
  console.log('1️⃣ Testing /api/home-feed...');
  try {
    const homeFeedRes = await fetch('http://localhost:3000/api/home-feed');
    const homeFeedData = await homeFeedRes.json();

    console.log(`   Status: ${homeFeedRes.status}`);
    console.log(`   Recent comments: ${homeFeedData.recentComments?.length || 0}`);

    if (homeFeedData.recentComments && homeFeedData.recentComments.length > 0) {
      const sample = homeFeedData.recentComments[0];
      console.log(`   ✅ Sample comment:`, {
        id: sample.id.substring(0, 8) + '...',
        hasContent: !!sample.content,
        hasAudio: !!sample.audioUrl,
        commentator: sample.commentator?.username,
        vibelog: sample.vibelog?.title?.substring(0, 30) + '...'
      });
    } else {
      console.log('   ⚠️  No recent comments returned');
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }

  // Test 2: Recent comments API
  console.log('\n2️⃣ Testing /api/comments/recent...');
  try {
    const recentRes = await fetch('http://localhost:3000/api/comments/recent?limit=5');
    const recentData = await recentRes.json();

    console.log(`   Status: ${recentRes.status}`);
    console.log(`   Comments: ${recentData.comments?.length || 0}`);

    if (recentData.comments && recentData.comments.length > 0) {
      const sample = recentData.comments[0];
      console.log(`   ✅ Sample comment:`, {
        id: sample.id.substring(0, 8) + '...',
        commentator: sample.commentator?.username,
        vibelog: sample.vibelog?.title?.substring(0, 30) + '...'
      });
    } else {
      console.log('   ⚠️  No comments returned');
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
  }
}

testAPIs().catch(console.error);
