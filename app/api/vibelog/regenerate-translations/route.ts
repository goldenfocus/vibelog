/**
 * Regenerate Translations API
 * POST /api/vibelog/regenerate-translations
 *
 * Triggers translation regeneration for a specific vibelog.
 * Works by slug (for anonymous vibelogs) or vibelogId.
 *
 * Supports:
 * - User regenerating their own vibelog translations
 * - Anonymous vibelogs (any authenticated user can trigger)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';
import {
  getTargetLanguages,
  type SupportedLanguage,
  translateVibelog,
} from '@/lib/translation';

export const runtime = 'nodejs';
export const maxDuration = 120;

const RequestSchema = z.object({
  vibelogId: z.string().uuid().optional(),
  slug: z.string().optional(),
}).refine(data => data.vibelogId || data.slug, {
  message: 'Either vibelogId or slug must be provided',
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth check - any authenticated user can trigger translations
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    const supabaseAdmin = await createServerAdminClient();

    // Find the vibelog
    let vibelog;
    if (validated.vibelogId) {
      const { data, error } = await supabaseAdmin
        .from('vibelogs')
        .select('id, title, teaser, content, seo_title, seo_description, original_language, translations, user_id, is_published, is_public')
        .eq('id', validated.vibelogId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
      }
      vibelog = data;
    } else if (validated.slug) {
      // Try finding by public_slug first (anonymous vibelogs)
      let { data, error } = await supabaseAdmin
        .from('vibelogs')
        .select('id, title, teaser, content, seo_title, seo_description, original_language, translations, user_id, is_published, is_public')
        .eq('public_slug', validated.slug)
        .single();

      if (!data) {
        // Try by slug
        const result = await supabaseAdmin
          .from('vibelogs')
          .select('id, title, teaser, content, seo_title, seo_description, original_language, translations, user_id, is_published, is_public')
          .eq('slug', validated.slug)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
      }
      vibelog = data;
    }

    if (!vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Permission check: user must own the vibelog OR vibelog is anonymous/public
    const isOwner = vibelog.user_id === user.id;
    const isAnonymousOrPublic = !vibelog.user_id || vibelog.is_public;

    if (!isOwner && !isAnonymousOrPublic) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    console.log(`[REGENERATE-TRANSLATIONS] Processing vibelog ${vibelog.id}...`);

    // Determine source language
    const sourceLanguage = (vibelog.original_language || 'en') as SupportedLanguage;
    const targetLanguages = getTargetLanguages(sourceLanguage);

    if (targetLanguages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No translations needed',
        vibelogId: vibelog.id,
        sourceLanguage,
        translations: [],
      });
    }

    console.log(`[REGENERATE-TRANSLATIONS] Translating from ${sourceLanguage} to:`, targetLanguages);

    // Generate translations
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

    if (!result.success || Object.keys(result.translations).length === 0) {
      console.error('[REGENERATE-TRANSLATIONS] Translation failed:', result.errors);
      return NextResponse.json({
        success: false,
        error: 'Translation generation failed',
        details: result.errors,
      }, { status: 500 });
    }

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
      console.error('[REGENERATE-TRANSLATIONS] Failed to save:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save translations',
        details: updateError.message,
      }, { status: 500 });
    }

    console.log(`[REGENERATE-TRANSLATIONS] Success! Languages:`, availableLanguages);

    return NextResponse.json({
      success: true,
      vibelogId: vibelog.id,
      sourceLanguage,
      translatedLanguages: result.translatedLanguages,
      availableLanguages,
      totalCost: result.totalCost,
    });
  } catch (error) {
    console.error('[REGENERATE-TRANSLATIONS] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
