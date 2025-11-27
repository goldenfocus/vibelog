/**
 * Translation utilities for multi-language vibelog support
 *
 * Translates vibelogs to all 6 supported languages using GPT-4o-mini
 * for cost-effective batch translation.
 */

import OpenAI from 'openai';

import { calculateGPTCost, estimateTokens, trackAICost } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';

// Supported languages for translation
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'vi', 'zh'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Language display names
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  vi: 'Vietnamese',
  zh: 'Chinese',
};

// ISO 639-1 to full name for prompts
export const LANGUAGE_FULL_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  vi: 'Vietnamese (Tiếng Việt)',
  zh: 'Chinese Simplified (简体中文)',
};

// Translation result for a single language
export interface TranslatedContent {
  title: string;
  teaser: string;
  content: string;
  seo_title: string;
  seo_description: string;
}

// Full translations JSONB structure
export type TranslationsMap = Partial<Record<SupportedLanguage, TranslatedContent>>;

// Translation request
export interface TranslateVibelogRequest {
  vibelogId: string;
  sourceLanguage: SupportedLanguage;
  targetLanguages: SupportedLanguage[];
  title: string;
  teaser: string;
  content: string;
  seo_title: string;
  seo_description: string;
}

// Translation result
export interface TranslateVibelogResult {
  success: boolean;
  translations: TranslationsMap;
  translatedLanguages: SupportedLanguage[];
  errors: Array<{ language: SupportedLanguage; error: string }>;
  totalCost: number;
}

/**
 * Get languages that need translation (all except source)
 */
export function getTargetLanguages(sourceLanguage: SupportedLanguage): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang !== sourceLanguage);
}

/**
 * Validate that a language code is supported
 */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Translate a single piece of content to a target language
 */
async function translateToLanguage(
  openai: OpenAI,
  content: {
    title: string;
    teaser: string;
    content: string;
    seo_title: string;
    seo_description: string;
  },
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage,
  userId: string | null
): Promise<{ translation: TranslatedContent; cost: number }> {
  const sourceName = LANGUAGE_FULL_NAMES[sourceLanguage];
  const targetName = LANGUAGE_FULL_NAMES[targetLanguage];

  // Combine all content for efficient single-call translation
  const prompt = `Translate the following vibelog content from ${sourceName} to ${targetName}.
Maintain the original tone, style, and markdown formatting.
Keep any code blocks, links, and special formatting intact.

IMPORTANT:
- Translate naturally, not literally
- Preserve the author's voice and personality
- Keep markdown headers (# ## ###) intact
- Preserve any URLs unchanged
- For SEO fields, optimize for the target language

OUTPUT FORMAT (JSON):
{
  "title": "translated title",
  "teaser": "translated teaser",
  "content": "translated full content with markdown",
  "seo_title": "SEO optimized title for ${targetName}",
  "seo_description": "SEO optimized description for ${targetName}"
}

SOURCE CONTENT:
---
Title: ${content.title}
---
Teaser: ${content.teaser}
---
Content: ${content.content}
---
SEO Title: ${content.seo_title}
---
SEO Description: ${content.seo_description}
---`;

  const inputTokens = estimateTokens(prompt);

  const completion = await openai.chat.completions.create({
    model: config.ai.openai.model, // gpt-4o-mini
    messages: [
      {
        role: 'system',
        content: `You are a professional translator specializing in blog/vibelog content. You translate to ${targetName} while maintaining the original style and tone. Always respond with valid JSON.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3, // Lower temperature for more consistent translations
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const rawResponse = completion.choices[0]?.message?.content || '{}';
  const outputTokens = estimateTokens(rawResponse);
  const cost = calculateGPTCost(inputTokens, outputTokens);

  // Track cost
  await trackAICost(userId, 'gpt-4o-mini', cost, {
    endpoint: '/api/translate-vibelog',
    source_language: sourceLanguage,
    target_language: targetLanguage,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });

  // Parse response
  try {
    const translation = JSON.parse(rawResponse) as TranslatedContent;
    return { translation, cost };
  } catch (parseError) {
    console.error(`Failed to parse translation response for ${targetLanguage}:`, parseError);
    throw new Error(`Invalid translation response for ${targetLanguage}`);
  }
}

/**
 * Translate a vibelog to multiple target languages
 */
export async function translateVibelog(
  request: TranslateVibelogRequest,
  userId: string | null
): Promise<TranslateVibelogResult> {
  const translations: TranslationsMap = {};
  const translatedLanguages: SupportedLanguage[] = [];
  const errors: Array<{ language: SupportedLanguage; error: string }> = [];
  let totalCost = 0;

  // Check for API key
  if (
    !config.ai.openai.apiKey ||
    config.ai.openai.apiKey === 'dummy_key' ||
    config.ai.openai.apiKey === 'your_openai_api_key_here'
  ) {
    console.warn('🧪 [TRANSLATION] Skipping translation - no valid API key');
    return {
      success: false,
      translations: {},
      translatedLanguages: [],
      errors: [{ language: request.sourceLanguage, error: 'No API key configured' }],
      totalCost: 0,
    };
  }

  const openai = new OpenAI({
    apiKey: config.ai.openai.apiKey,
    timeout: 60_000,
  });

  const content = {
    title: request.title,
    teaser: request.teaser,
    content: request.content,
    seo_title: request.seo_title,
    seo_description: request.seo_description,
  };

  // Translate to each target language in parallel (with concurrency limit)
  const CONCURRENCY_LIMIT = 3; // Process 3 languages at a time
  const targetLanguages = request.targetLanguages.filter(lang => lang !== request.sourceLanguage);

  for (let i = 0; i < targetLanguages.length; i += CONCURRENCY_LIMIT) {
    const batch = targetLanguages.slice(i, i + CONCURRENCY_LIMIT);

    const results = await Promise.allSettled(
      batch.map(targetLang =>
        translateToLanguage(openai, content, request.sourceLanguage, targetLang, userId).then(
          result => ({
            language: targetLang,
            ...result,
          })
        )
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { language, translation, cost } = result.value;
        translations[language] = translation;
        translatedLanguages.push(language);
        totalCost += cost;
        console.log(`✅ [TRANSLATION] Translated to ${language} ($${cost.toFixed(4)})`);
      } else {
        const failedLang = batch[results.indexOf(result)] || 'unknown';
        const errorMsg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        errors.push({ language: failedLang as SupportedLanguage, error: errorMsg });
        console.error(`❌ [TRANSLATION] Failed to translate to ${failedLang}:`, errorMsg);
      }
    }
  }

  return {
    success: translatedLanguages.length > 0,
    translations,
    translatedLanguages,
    errors,
    totalCost,
  };
}

/**
 * Get the best available translation for a vibelog
 * Falls back to original content if translation not available
 */
export function getTranslatedContent(
  vibelog: {
    title: string;
    teaser: string;
    content: string;
    seo_title: string;
    seo_description: string;
    original_language?: string;
    translations?: TranslationsMap;
  },
  preferredLanguage: SupportedLanguage
): TranslatedContent & { language: SupportedLanguage; isTranslated: boolean } {
  const originalLang = (vibelog.original_language as SupportedLanguage) || 'en';

  // If preferred language matches original, return original content
  if (preferredLanguage === originalLang) {
    return {
      title: vibelog.title,
      teaser: vibelog.teaser,
      content: vibelog.content,
      seo_title: vibelog.seo_title,
      seo_description: vibelog.seo_description,
      language: originalLang,
      isTranslated: false,
    };
  }

  // Check if translation exists for preferred language
  const translation = vibelog.translations?.[preferredLanguage];
  if (translation) {
    return {
      ...translation,
      language: preferredLanguage,
      isTranslated: true,
    };
  }

  // Fallback to original content
  return {
    title: vibelog.title,
    teaser: vibelog.teaser,
    content: vibelog.content,
    seo_title: vibelog.seo_title,
    seo_description: vibelog.seo_description,
    language: originalLang,
    isTranslated: false,
  };
}
