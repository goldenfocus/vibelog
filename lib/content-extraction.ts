/**
 * Content Extraction Utility
 *
 * Extracts SEO-friendly metadata from vibelog content including:
 * - Topics/tags (replaces hardcoded 'auto-generated')
 * - Named entities (people, places, organizations)
 * - SEO keywords
 * - Primary topic classification
 */

import OpenAI from 'openai';

import { calculateGPTCost, estimateTokens, trackAICost } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';

export interface ContentMetadata {
  /** Primary topic/category (e.g., "technology", "personal-growth") */
  primaryTopic: string;
  /** Array of relevant tags/subtopics (3-7 items) */
  tags: string[];
  /** Named entities extracted from content */
  entities: {
    people: string[];
    places: string[];
    organizations: string[];
    products: string[];
  };
  /** SEO-optimized keywords (5-10 items) */
  seoKeywords: string[];
  /** Content sentiment/mood */
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  /** Confidence score (0-1) */
  confidence: number;
}

const TOPIC_CATEGORIES = [
  'technology',
  'business',
  'personal-growth',
  'lifestyle',
  'health-wellness',
  'creativity',
  'education',
  'entertainment',
  'travel',
  'food-cooking',
  'relationships',
  'career',
  'finance',
  'parenting',
  'sports',
  'science',
  'politics',
  'culture',
  'spirituality',
  'other',
] as const;

/**
 * Extract rich metadata from vibelog content using GPT
 */
export async function extractContentMetadata(
  title: string,
  content: string,
  userId: string | null
): Promise<ContentMetadata | null> {
  // Check for real API key
  if (
    !config.ai.openai.apiKey ||
    config.ai.openai.apiKey === 'dummy_key' ||
    config.ai.openai.apiKey === 'your_openai_api_key_here'
  ) {
    if (isDev) {
      console.log('🧪 Using mock content extraction for development');
    }
    return getMockMetadata(title, content);
  }

  try {
    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 30_000,
    });

    // Truncate content if too long (keep it efficient)
    const truncatedContent = content.length > 3000 ? content.substring(0, 3000) + '...' : content;

    const prompt = `Analyze this vibelog content and extract metadata.

Title: ${title}

Content:
${truncatedContent}

Return a JSON object with:
{
  "primaryTopic": one of [${TOPIC_CATEGORIES.map(t => `"${t}"`).join(', ')}],
  "tags": [3-7 specific tags as lowercase-kebab-case],
  "entities": {
    "people": [names mentioned],
    "places": [locations mentioned],
    "organizations": [companies/orgs mentioned],
    "products": [products/tools mentioned]
  },
  "seoKeywords": [5-10 SEO keywords],
  "sentiment": one of ["positive", "negative", "neutral", "mixed"],
  "confidence": number 0-1
}

Rules:
- Tags should be specific and searchable (e.g., "voice-technology", "content-creation")
- Only include entities that are explicitly mentioned
- SEO keywords should be phrases users might search for
- Return ONLY valid JSON, no markdown`;

    const inputTokens = estimateTokens(prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are a content analysis expert. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Low temp for consistent extraction
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    const outputTokens = estimateTokens(rawResponse);

    // Track cost
    const cost = calculateGPTCost(inputTokens, outputTokens);
    await trackAICost(userId, 'gpt-4o-mini', cost, {
      endpoint: 'content-extraction',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

    if (isDev) {
      console.log(`💰 Content extraction cost: $${cost.toFixed(4)}`);
    }

    const parsed = JSON.parse(rawResponse);

    // Validate and normalize response
    return {
      primaryTopic: TOPIC_CATEGORIES.includes(parsed.primaryTopic) ? parsed.primaryTopic : 'other',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.slice(0, 7).map((t: string) => normalizeTag(t))
        : [],
      entities: {
        people: Array.isArray(parsed.entities?.people) ? parsed.entities.people : [],
        places: Array.isArray(parsed.entities?.places) ? parsed.entities.places : [],
        organizations: Array.isArray(parsed.entities?.organizations)
          ? parsed.entities.organizations
          : [],
        products: Array.isArray(parsed.entities?.products) ? parsed.entities.products : [],
      },
      seoKeywords: Array.isArray(parsed.seoKeywords) ? parsed.seoKeywords.slice(0, 10) : [],
      sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(parsed.sentiment)
        ? parsed.sentiment
        : 'neutral',
      confidence:
        typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    };
  } catch (error) {
    console.error('[CONTENT-EXTRACTION] Failed to extract metadata:', error);
    return getMockMetadata(title, content);
  }
}

/**
 * Normalize tag to kebab-case
 */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Generate mock metadata for development/fallback
 */
function getMockMetadata(title: string, content: string): ContentMetadata {
  // Simple keyword extraction from title and content
  const words = `${title} ${content}`
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 4);

  const uniqueWords = [...new Set(words)].slice(0, 5);
  const tags = uniqueWords.map(w => normalizeTag(w)).filter(t => t.length > 2);

  return {
    primaryTopic: 'other',
    tags: tags.length > 0 ? tags : ['vibelog', 'content'],
    entities: {
      people: [],
      places: [],
      organizations: [],
      products: [],
    },
    seoKeywords: tags,
    sentiment: 'neutral',
    confidence: 0.3,
  };
}

/**
 * Lightweight tag extraction (no API call)
 * Use when you just need basic tags without full analysis
 */
export function extractBasicTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();

  // Common topic indicators
  const topicPatterns: [RegExp, string][] = [
    [/\b(ai|artificial intelligence|machine learning|gpt|chatgpt)\b/i, 'ai'],
    [/\b(voice|speech|audio|recording|podcast)\b/i, 'voice'],
    [/\b(content|writing|creator|creation|publish)\b/i, 'content-creation'],
    [/\b(tech|technology|software|app|digital)\b/i, 'technology'],
    [/\b(business|startup|entrepreneur|company)\b/i, 'business'],
    [/\b(personal|growth|self|improve|mindset)\b/i, 'personal-growth'],
    [/\b(health|fitness|wellness|mental)\b/i, 'health'],
    [/\b(travel|trip|adventure|destination)\b/i, 'travel'],
    [/\b(food|recipe|cooking|restaurant)\b/i, 'food'],
    [/\b(career|job|work|professional)\b/i, 'career'],
  ];

  const tags: string[] = [];
  for (const [pattern, tag] of topicPatterns) {
    if (pattern.test(text) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  // Add "vibelog" as default if no tags found
  if (tags.length === 0) {
    tags.push('vibelog');
  }

  return tags.slice(0, 5);
}
