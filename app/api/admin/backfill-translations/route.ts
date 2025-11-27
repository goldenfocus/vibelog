import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';
import { getTargetLanguages, type SupportedLanguage, translateVibelog } from '@/lib/translation';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for batch processing

/**
 * Backfill translations for existing vibelogs
 * POST /api/admin/backfill-translations
 *
 * Query params:
 * - limit: number of vibelogs to process (default: 10)
 * - vibelogId: specific vibelog ID to translate (optional)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const specificVibelogId = searchParams.get('vibelogId');

    const supabaseAdmin = await createServerAdminClient();

    // Get vibelogs that need translation
    let query = supabaseAdmin
      .from('vibelogs')
      .select(
        'id, title, teaser, content, seo_title, seo_description, original_language, translations, user_id'
      )
      .eq('is_published', true)
      .eq('is_public', true);

    if (specificVibelogId) {
      query = query.eq('id', specificVibelogId);
    } else {
      // Get vibelogs without translations
      query = query.or('translations.is.null,available_languages.is.null').limit(limit);
    }

    const { data: vibelogs, error: fetchError } = await query;

    if (fetchError) {
      console.error('[BACKFILL] Failed to fetch vibelogs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch vibelogs' }, { status: 500 });
    }

    if (!vibelogs || vibelogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vibelogs need translation',
        processed: 0,
      });
    }

    console.log(`[BACKFILL] Processing ${vibelogs.length} vibelogs...`);

    const results: Array<{
      vibelogId: string;
      success: boolean;
      languages?: string[];
      error?: string;
    }> = [];

    for (const vibelog of vibelogs) {
      try {
        // Determine source language
        const sourceLanguage = (vibelog.original_language ||
          detectLanguage(vibelog.content) ||
          'en') as SupportedLanguage;

        // Get target languages
        const targetLanguages = getTargetLanguages(sourceLanguage);

        if (targetLanguages.length === 0) {
          results.push({
            vibelogId: vibelog.id,
            success: true,
            languages: [sourceLanguage],
          });
          continue;
        }

        console.log(
          `[BACKFILL] Translating ${vibelog.id} from ${sourceLanguage} to:`,
          targetLanguages
        );

        // Translate
        const result = await translateVibelog(
          {
            vibelogId: vibelog.id,
            title: vibelog.title,
            teaser: vibelog.teaser || '',
            content: vibelog.content,
            seo_title: vibelog.seo_title || vibelog.title,
            seo_description: vibelog.seo_description || vibelog.teaser || '',
            sourceLanguage,
            targetLanguages,
          },
          vibelog.user_id
        );

        if (result.translations && Object.keys(result.translations).length > 0) {
          // Save translations
          const availableLanguages = [sourceLanguage, ...Object.keys(result.translations)];

          const { error: updateError } = await supabaseAdmin
            .from('vibelogs')
            .update({
              translations: result.translations,
              available_languages: availableLanguages,
              original_language: sourceLanguage,
            })
            .eq('id', vibelog.id);

          if (updateError) {
            throw new Error(`Failed to save: ${updateError.message}`);
          }

          results.push({
            vibelogId: vibelog.id,
            success: true,
            languages: availableLanguages,
          });

          console.log(`[BACKFILL] ✅ Translated ${vibelog.id}:`, availableLanguages);
        } else {
          results.push({
            vibelogId: vibelog.id,
            success: false,
            error: 'No translations generated',
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[BACKFILL] ❌ Failed ${vibelog.id}:`, error);
        results.push({
          vibelogId: vibelog.id,
          success: false,
          error,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${vibelogs.length} vibelogs, ${successCount} successful`,
      processed: vibelogs.length,
      successful: successCount,
      results,
    });
  } catch (error) {
    console.error('[BACKFILL] Uncaught error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Simple language detection based on character patterns
 */
function detectLanguage(text: string): SupportedLanguage {
  // Check for Chinese characters
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh';
  }

  // Check for Vietnamese diacritics
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) {
    return 'vi';
  }

  // Check for German specific characters
  if (/[äöüß]/i.test(text)) {
    return 'de';
  }

  // Check for French specific patterns
  if (/[éèêëàâîïôùûç]/i.test(text) && /\b(le|la|les|de|du|des|et|est|un|une)\b/i.test(text)) {
    return 'fr';
  }

  // Check for Spanish specific patterns
  if (/[áéíóúüñ¿¡]/i.test(text) && /\b(el|la|los|las|de|del|y|es|un|una)\b/i.test(text)) {
    return 'es';
  }

  // Default to English
  return 'en';
}
