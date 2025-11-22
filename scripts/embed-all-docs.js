#!/usr/bin/env node

/**
 * Embed all platform documentation into vector database
 * This allows Vibe Brain to answer questions using RAG
 */

const fs = require('fs');
const path = require('path');

// Read credentials from .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const OPENAI_API_KEY = envContent.match(/OPENAI_API_KEY=(.*)/)[1].trim();

// Documentation sources to embed
const DOCUMENTATION_SOURCES = [
  {
    filename: 'README.md',
    path: path.join(process.cwd(), 'README.md'),
    category: 'quick-start',
    description: 'Quick start guide and project structure',
  },
  {
    filename: 'evolution.md',
    path: path.join(process.cwd(), 'evolution.md'),
    category: 'platform-overview',
    description: 'Platform evolution, current state, and technical capabilities',
  },
  {
    filename: 'living-web-2026.md',
    path: path.join(process.cwd(), 'living-web-2026.md'),
    category: 'philosophy',
    description: 'Long-term vision, philosophy, and The Living Web concept',
  },
  {
    filename: 'branding.md',
    path: path.join(process.cwd(), 'branding.md'),
    category: 'brand',
    description: 'Voice, tone, microcopy, and brand identity',
  },
  {
    filename: 'CLAUDE.md',
    path: path.join(process.cwd(), 'CLAUDE.md'),
    category: 'development',
    description: 'Development guidelines and coding standards',
  },
];

/**
 * Generate OpenAI embedding for text
 */
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Split markdown document into logical sections
 */
function splitIntoSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = 'Introduction';
  let currentText = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      if (currentText.length > 0) {
        sections.push({
          section: currentSection,
          text: currentText.join('\n').trim(),
        });
      }
      currentSection = headingMatch[2];
      currentText = [line];
    } else {
      currentText.push(line);
    }
  }

  if (currentText.length > 0) {
    sections.push({
      section: currentSection,
      text: currentText.join('\n').trim(),
    });
  }

  return sections.filter(s => s.text.length > 50);
}

/**
 * Chunk a section into smaller pieces if needed
 */
function chunkSection(section, maxChunkSize = 2000) {
  const { text } = section;

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Clear existing documentation embeddings
 */
async function clearDocumentationEmbeddings() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_embeddings?content_type=eq.documentation`,
    {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to clear embeddings: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.length;
}

/**
 * Insert embedding into database
 */
async function insertEmbedding(chunk, embedding) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/content_embeddings`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      content_type: 'documentation',
      content_id: null,
      user_id: null,
      embedding,
      text_chunk: chunk.content,
      metadata: {
        source: chunk.source,
        category: chunk.category,
        section: chunk.section,
        chunk_index: chunk.chunkIndex,
        total_chunks: chunk.totalChunks,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert embedding: ${response.status} - ${error}`);
  }
}

/**
 * Main embedding function
 */
async function embedAllDocumentation() {
  console.log('🚀 Starting documentation embedding...\n');

  const errors = [];
  let chunksCreated = 0;

  try {
    // Clear existing documentation embeddings
    console.log('[KNOWLEDGE BASE] Clearing existing documentation embeddings...');
    const cleared = await clearDocumentationEmbeddings();
    console.log(`[KNOWLEDGE BASE] Cleared ${cleared} existing embeddings\n`);

    // Process each documentation file
    for (const doc of DOCUMENTATION_SOURCES) {
      try {
        console.log(`[KNOWLEDGE BASE] Processing ${doc.filename}...`);

        // Load file
        if (!fs.existsSync(doc.path)) {
          errors.push(`File not found: ${doc.filename}`);
          continue;
        }

        const content = fs.readFileSync(doc.path, 'utf-8');

        // Split into sections
        const sections = splitIntoSections(content);

        // Chunk each section
        const allChunks = [];
        for (const section of sections) {
          const textChunks = chunkSection(section);
          textChunks.forEach((chunk, index) => {
            allChunks.push({
              source: doc.filename,
              category: doc.category,
              section: section.section,
              content: chunk,
              chunkIndex: index,
              totalChunks: textChunks.length,
            });
          });
        }

        console.log(`[KNOWLEDGE BASE] Created ${allChunks.length} chunks from ${doc.filename}`);

        // Embed each chunk
        for (const chunk of allChunks) {
          const embedding = await generateEmbedding(chunk.content);
          await insertEmbedding(chunk, embedding);
          chunksCreated++;

          // Show progress
          if (chunksCreated % 5 === 0) {
            process.stdout.write(`   Progress: ${chunksCreated} chunks embedded...\r`);
          }
        }

        console.log(`[KNOWLEDGE BASE] Embedded ${allChunks.length} chunks from ${doc.filename}`);
      } catch (error) {
        const errorMsg = `Failed to process ${doc.filename}: ${error.message}`;
        console.error(`[KNOWLEDGE BASE] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n✅ Embedding complete: ${chunksCreated} chunks created\n`);

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      errors.forEach(err => console.log(`   - ${err}`));
    }

    return {
      success: errors.length === 0,
      chunksCreated,
      errors,
    };
  } catch (error) {
    const errorMsg = `Fatal error during embedding: ${error.message}`;
    console.error(`[KNOWLEDGE BASE] ${errorMsg}`);
    return {
      success: false,
      chunksCreated,
      errors: [errorMsg, ...errors],
    };
  }
}

// Run the script
embedAllDocumentation()
  .then(result => {
    if (result.success) {
      console.log('🎉 All documentation successfully embedded!');
      process.exit(0);
    } else {
      console.error('❌ Embedding completed with errors');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
