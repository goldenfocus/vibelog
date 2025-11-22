#!/usr/bin/env node

/**
 * Test that Vibe Brain can search documentation embeddings
 */

const fs = require('fs');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const OPENAI_API_KEY = envContent.match(/OPENAI_API_KEY=(.*)/)[1].trim();

async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

async function searchDocumentation(query) {
  console.log(`🔍 Searching for: "${query}"\n`);

  // Generate embedding for query
  const embedding = await generateEmbedding(query);

  // Search similar content using pgvector
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_content_embeddings`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query_embedding: `[${embedding.join(',')}]`,
      content_types: ['documentation'],
      match_threshold: 0.6,
      match_count: 3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search failed: ${response.status} - ${error}`);
  }

  const results = await response.json();

  console.log(`📊 Found ${results.length} relevant chunks:\n`);

  results.forEach((result, i) => {
    console.log(`${i + 1}. [${result.metadata.source}] ${result.metadata.section}`);
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`   Preview: ${result.text_chunk.substring(0, 150)}...`);
    console.log('');
  });

  return results;
}

async function main() {
  console.log('🧪 Testing Vibe Brain Documentation Search\n');

  try {
    // Test the 3 onboarding questions
    await searchDocumentation('What is VibeLog?');
    console.log('---\n');

    await searchDocumentation('How does VibeLog work?');
    console.log('---\n');

    await searchDocumentation('What is the Living Web vision?');

    console.log('\n✅ All searches completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
