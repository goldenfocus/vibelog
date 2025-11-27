/**
 * Translation API Route
 * POST /api/translate-vibelog
 *
 * Translates a vibelog to multiple target languages and stores
 * the translations in the database for SEO/AEO benefits.
 */

import { NextRequest, NextResponse } from 'next/server';

import { isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';
import {
  getTargetLanguages,
  isValidLanguage,
  SUPPORTED_LANGUAGES,
  translateVibelog,
  type SupportedLanguage,
  type TranslationsMap,
} from '@/lib/translation';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for batch translation

export async function POST(request: NextRequest) {
  try {
    // Circuit breaker check
    if (await isDailyLimitExceeded()) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'AI services have reached their daily cost limit. Try again tomorrow.',
        },
        { status: 503 }
      );
    }

    // Parse request
    const body = await request.json();
    const { vibelogId, targetLanguages: requestedTargets } = body;

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId is required' }, { status: 400 });
    }

    // Get user for rate limiting and cost tracking
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id || null;

    // Rate limiting - use generation limits as translation is similar cost
    const limits = config.rateLimits.generation;
    const opts = userId ? limits.authenticated : limits.anonymous;
    const rl = await rateLimit(request, 'translate-vibelog', opts, userId || undefined);

    if (!rl.success) {
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message: 'Translation limit reached. Sign in for more translations!',
            ...rl,
          },
          { status: 429 }
        );
      }
      return tooManyResponse(rl);
    }

    // Fetch vibelog data using admin client to bypass RLS
    const adminClient = await createServerAdminClient();
    const { data: vibelog, error: fetchError } = await adminClient
      .from('vibelogs')
      .select(
        'id, title, teaser, content, seo_title, seo_description, original_language, available_languages, translations'
      )
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Determine source and target languages
    const sourceLanguage = (vibelog.original_language as SupportedLanguage) || 'en';

    // Validate source language
    if (!isValidLanguage(sourceLanguage)) {
      console.warn(`Invalid source language "${sourceLanguage}", defaulting to "en"`);
    }

    // Determine target languages
    let targetLanguages: SupportedLanguage[];

    if (requestedTargets && Array.isArray(requestedTargets)) {
      // Use requested targets, filtering out invalid ones
      targetLanguages = requestedTargets.filter(
        (lang): lang is SupportedLanguage => isValidLanguage(lang) && lang !== sourceLanguage
      );
    } else {
      // Default: translate to all other languages
      targetLanguages = getTargetLanguages(sourceLanguage as SupportedLanguage);
    }

    // Skip if already translated
    const existingTranslations = (vibelog.translations as TranslationsMap) || {};
    const existingLanguages = Object.keys(existingTranslations) as SupportedLanguage[];
    const needsTranslation = targetLanguages.filter(lang => !existingLanguages.includes(lang));

    if (needsTranslation.length === 0) {
      console.log('⏭️ [TRANSLATION] All translations already exist for:', vibelogId);
      return NextResponse.json({
        success: true,
        message: 'All translations already exist',
        skipped: true,
        availableLanguages: [...new Set([sourceLanguage, ...existingLanguages])],
      });
    }

    console.log(
      `🌐 [TRANSLATION] Translating vibelog ${vibelogId} from ${sourceLanguage} to ${needsTranslation.join(', ')}`
    );

    // Perform translations
    const result = await translateVibelog(
      {
        vibelogId,
        sourceLanguage: sourceLanguage as SupportedLanguage,
        targetLanguages: needsTranslation,
        title: vibelog.title,
        teaser: vibelog.teaser,
        content: vibelog.content,
        seo_title: vibelog.seo_title,
        seo_description: vibelog.seo_description,
      },
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Translation failed',
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    // Merge new translations with existing
    const mergedTranslations: TranslationsMap = {
      ...existingTranslations,
      ...result.translations,
    };

    // Update available_languages array
    const availableLanguages = [
      ...new Set([
        sourceLanguage,
        ...existingLanguages,
        ...result.translatedLanguages,
      ] as SupportedLanguage[]),
    ].filter(lang => SUPPORTED_LANGUAGES.includes(lang));

    // Update database with translations
    const { error: updateError } = await adminClient
      .from('vibelogs')
      .update({
        translations: mergedTranslations,
        available_languages: availableLanguages,
      })
      .eq('id', vibelogId);

    if (updateError) {
      console.error('❌ [TRANSLATION] Failed to save translations:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to save translations',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    if (isDev) {
      console.log(
        `✅ [TRANSLATION] Complete for ${vibelogId}: ${result.translatedLanguages.join(', ')} ($${result.totalCost.toFixed(4)})`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Translated to ${result.translatedLanguages.length} languages`,
      translatedLanguages: result.translatedLanguages,
      availableLanguages,
      errors: result.errors.length > 0 ? result.errors : undefined,
      totalCost: result.totalCost,
    });
  } catch (error) {
    console.error('❌ [TRANSLATION] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Translation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
