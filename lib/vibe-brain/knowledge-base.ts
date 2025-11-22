/**
 * Knowledge Base - Platform Documentation Loading and Embedding
 *
 * This module handles loading, chunking, and embedding platform documentation
 * for use in Vibe Brain's RAG (Retrieval Augmented Generation) system.
 *
 * Supported documents:
 * - README.md - Quick start and project overview
 * - evolution.md - Platform evolution and current state
 * - living-web-2026.md - Long-term vision and philosophy
 * - branding.md - Voice, tone, and brand identity
 * - CLAUDE.md - Development guidelines
 */

import fs from 'fs/promises';
import path from 'path';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { generateEmbedding } from './embedding-service';

/**
 * Documentation source files
 */
export const DOCUMENTATION_SOURCES = [
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
] as const;

export interface DocumentChunk {
  source: string;
  category: string;
  section: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Load a single documentation file
 */
export async function loadDocumentationFile(
  filePath: string
): Promise<{ content: string; exists: boolean }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { content, exists: true };
  } catch (error) {
    console.warn(`[KNOWLEDGE BASE] Failed to load ${filePath}:`, error);
    return { content: '', exists: false };
  }
}

/**
 * Split markdown document into logical sections
 * Preserves headings and context
 */
function splitIntoSections(
  content: string,
  _filename: string
): Array<{ section: string; text: string }> {
  const lines = content.split('\n');
  const sections: Array<{ section: string; text: string }> = [];
  let currentSection = 'Introduction';
  let currentText: string[] = [];

  for (const line of lines) {
    // Check if line is a heading (## or # at start)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section if it has content
      if (currentText.length > 0) {
        sections.push({
          section: currentSection,
          text: currentText.join('\n').trim(),
        });
      }

      // Start new section
      currentSection = headingMatch[2];
      currentText = [line]; // Include the heading in the section
    } else {
      currentText.push(line);
    }
  }

  // Add final section
  if (currentText.length > 0) {
    sections.push({
      section: currentSection,
      text: currentText.join('\n').trim(),
    });
  }

  return sections.filter(s => s.text.length > 50); // Filter out tiny sections
}

/**
 * Chunk a section into smaller pieces if needed (target ~500 tokens = ~2000 chars)
 */
function chunkSection(section: { section: string; text: string }, maxChunkSize = 2000): string[] {
  const { text } = section;

  // If section is small enough, return as-is
  if (text.length <= maxChunkSize) {
    return [text];
  }

  // Split by paragraphs (double newline)
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    // If adding this paragraph exceeds max size, save current chunk
    if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Chunk a document into semantically meaningful pieces
 * Returns array of chunks with metadata
 */
export function chunkDocumentation(
  content: string,
  source: string,
  category: string
): DocumentChunk[] {
  const sections = splitIntoSections(content, source);
  const allChunks: DocumentChunk[] = [];

  for (const section of sections) {
    const textChunks = chunkSection(section);

    textChunks.forEach((chunk, index) => {
      allChunks.push({
        source,
        category,
        section: section.section,
        content: chunk,
        chunkIndex: index,
        totalChunks: textChunks.length,
      });
    });
  }

  return allChunks;
}

/**
 * Embed a single documentation chunk and store in database
 */
export async function embedDocumentationChunk(chunk: DocumentChunk): Promise<void> {
  const supabase = await createServerAdminClient();

  // Generate embedding
  const embedding = await generateEmbedding(chunk.content);

  // Store in content_embeddings table
  const { error } = await supabase.from('content_embeddings').insert({
    content_type: 'documentation',
    content_id: null, // Documentation doesn't have a specific content_id
    user_id: null, // Documentation is global, not user-specific
    embedding,
    text_chunk: chunk.content,
    metadata: {
      source: chunk.source,
      category: chunk.category,
      section: chunk.section,
      chunk_index: chunk.chunkIndex,
      total_chunks: chunk.totalChunks,
    },
  });

  if (error) {
    console.error('[KNOWLEDGE BASE] Failed to embed chunk:', error);
    throw error;
  }
}

/**
 * Clear all existing documentation embeddings
 */
export async function clearDocumentationEmbeddings(): Promise<number> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('content_embeddings')
    .delete()
    .eq('content_type', 'documentation')
    .select('id');

  if (error) {
    console.error('[KNOWLEDGE BASE] Failed to clear documentation embeddings:', error);
    throw error;
  }

  return data?.length || 0;
}

/**
 * Embed all platform documentation
 * This is the main function to call when updating documentation
 */
export async function embedAllDocumentation(): Promise<{
  success: boolean;
  chunksCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let chunksCreated = 0;

  try {
    console.log('[KNOWLEDGE BASE] Clearing existing documentation embeddings...');
    const cleared = await clearDocumentationEmbeddings();
    console.log(`[KNOWLEDGE BASE] Cleared ${cleared} existing embeddings`);

    console.log('[KNOWLEDGE BASE] Loading and embedding documentation...');

    for (const doc of DOCUMENTATION_SOURCES) {
      try {
        console.log(`[KNOWLEDGE BASE] Processing ${doc.filename}...`);

        // Load file
        const { content, exists } = await loadDocumentationFile(doc.path);

        if (!exists) {
          errors.push(`File not found: ${doc.filename}`);
          continue;
        }

        // Chunk content
        const chunks = chunkDocumentation(content, doc.filename, doc.category);
        console.log(`[KNOWLEDGE BASE] Created ${chunks.length} chunks from ${doc.filename}`);

        // Embed each chunk
        for (const chunk of chunks) {
          await embedDocumentationChunk(chunk);
          chunksCreated++;
        }

        console.log(`[KNOWLEDGE BASE] Embedded ${chunks.length} chunks from ${doc.filename}`);
      } catch (error) {
        const errorMsg = `Failed to process ${doc.filename}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[KNOWLEDGE BASE] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[KNOWLEDGE BASE] Embedding complete: ${chunksCreated} chunks created`);

    return {
      success: errors.length === 0,
      chunksCreated,
      errors,
    };
  } catch (error) {
    const errorMsg = `Fatal error during embedding: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[KNOWLEDGE BASE] ${errorMsg}`);
    return {
      success: false,
      chunksCreated,
      errors: [errorMsg, ...errors],
    };
  }
}

/**
 * Get statistics about embedded documentation
 */
export async function getDocumentationStats(): Promise<{
  totalChunks: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  lastUpdated: string | null;
}> {
  const supabase = await createServerAdminClient();

  const { data: chunks, error } = await supabase
    .from('content_embeddings')
    .select('metadata, created_at')
    .eq('content_type', 'documentation');

  if (error) {
    console.error('[KNOWLEDGE BASE] Failed to get documentation stats:', error);
    throw error;
  }

  const bySource: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let lastUpdated: string | null = null;

  for (const chunk of chunks || []) {
    const metadata = chunk.metadata as { source?: string; category?: string };
    const source = metadata?.source || 'unknown';
    const category = metadata?.category || 'unknown';

    bySource[source] = (bySource[source] || 0) + 1;
    byCategory[category] = (byCategory[category] || 0) + 1;

    if (!lastUpdated || chunk.created_at > lastUpdated) {
      lastUpdated = chunk.created_at;
    }
  }

  return {
    totalChunks: chunks?.length || 0,
    bySource,
    byCategory,
    lastUpdated,
  };
}
