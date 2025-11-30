#!/usr/bin/env npx tsx
/**
 * Batch Regenerate Translations
 *
 * This script finds all vibelogs with missing or empty translations
 * and regenerates them using the translation API.
 *
 * Usage:
 *   npx tsx scripts/regenerate-all-translations.ts
 *   npx tsx scripts/regenerate-all-translations.ts --dry-run
 *   npx tsx scripts/regenerate-all-translations.ts --limit 10
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    console.error('Could not load .env.local file');
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

// Supported languages (excluding source)
const ALL_LANGUAGES = ['en', 'es', 'fr', 'de', 'vi', 'zh'];

interface Vibelog {
  id: string;
  title: string;
  teaser: string;
  content: string;
  original_language: string | null;
  translations: Record<string, unknown> | null;
  available_languages: string[] | null;
  is_published: boolean;
  user_id: string | null;
}

async function getVibelogsNeedingTranslations(): Promise<Vibelog[]> {
  console.log('🔍 Finding vibelogs with missing translations...\n');

  // Get all published vibelogs
  let query = supabase
    .from('vibelogs')
    .select(
      'id, title, teaser, content, original_language, translations, available_languages, is_published, user_id'
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: vibelogs, error } = await query;

  if (error) {
    console.error('Failed to fetch vibelogs:', error);
    process.exit(1);
  }

  // Filter to those with missing/incomplete translations
  const needsTranslation = vibelogs.filter((v: Vibelog) => {
    const sourceLanguage = v.original_language || 'en';
    const expectedLanguages = ALL_LANGUAGES.filter(lang => lang !== sourceLanguage);

    // Check if translations object exists and has all expected languages
    if (!v.translations || typeof v.translations !== 'object') {
      return true;
    }

    const existingTranslations = Object.keys(v.translations);
    const missingLanguages = expectedLanguages.filter(lang => !existingTranslations.includes(lang));

    return missingLanguages.length > 0;
  });

  return needsTranslation;
}

async function regenerateTranslations(vibelog: Vibelog): Promise<boolean> {
  const sourceLanguage = vibelog.original_language || 'en';
  const targetLanguages = ALL_LANGUAGES.filter(lang => lang !== sourceLanguage);

  console.log(`  🌍 Translating from ${sourceLanguage} to: ${targetLanguages.join(', ')}`);

  try {
    // Call the OpenAI API directly for translation
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.error('  ❌ Missing OPENAI_API_KEY');
      return false;
    }

    const translations: Record<string, { title: string; teaser: string; content: string }> = {};

    for (const targetLang of targetLanguages) {
      const langName =
        {
          en: 'English',
          es: 'Spanish',
          fr: 'French',
          de: 'German',
          vi: 'Vietnamese',
          zh: 'Chinese (Simplified)',
        }[targetLang] || targetLang;

      console.log(`    → Translating to ${langName}...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following content to ${langName}. Maintain the same tone, style, and markdown formatting. Return a JSON object with keys: title, teaser, content.`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                title: vibelog.title,
                teaser: vibelog.teaser,
                content: vibelog.content,
              }),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error(`    ❌ OpenAI API error for ${targetLang}:`, await response.text());
        continue;
      }

      const data = await response.json();
      const translated = JSON.parse(data.choices[0].message.content);
      translations[targetLang] = {
        title: translated.title || vibelog.title,
        teaser: translated.teaser || vibelog.teaser,
        content: translated.content || vibelog.content,
      };
    }

    if (Object.keys(translations).length === 0) {
      console.error(`  ❌ No translations generated`);
      return false;
    }

    // Save translations
    const availableLanguages = [sourceLanguage, ...Object.keys(translations)];

    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        translations: translations,
        available_languages: availableLanguages,
        original_language: sourceLanguage,
      })
      .eq('id', vibelog.id);

    if (updateError) {
      console.error(`  ❌ Failed to save translations:`, updateError);
      return false;
    }

    console.log(`  ✅ Saved translations: ${availableLanguages.join(', ')}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error:`, error);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📚 Batch Translation Regeneration');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔵 DRY RUN MODE - No changes will be made\n');
  }

  const vibelogs = await getVibelogsNeedingTranslations();

  console.log(`Found ${vibelogs.length} vibelogs needing translation regeneration\n`);

  if (vibelogs.length === 0) {
    console.log('✅ All vibelogs have complete translations!');
    return;
  }

  // Show summary
  console.log('Vibelogs to process:');
  vibelogs.forEach((v, i) => {
    const existingLangs = v.translations ? Object.keys(v.translations).length : 0;
    console.log(
      `  ${i + 1}. "${v.title?.substring(0, 50)}..." (${existingLangs} existing translations)`
    );
  });
  console.log('');

  if (isDryRun) {
    console.log('🔵 Dry run complete. Run without --dry-run to execute.');
    return;
  }

  // Process each vibelog with a delay to avoid rate limits
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < vibelogs.length; i++) {
    const vibelog = vibelogs[i];
    console.log(
      `\n[${i + 1}/${vibelogs.length}] Processing: "${vibelog.title?.substring(0, 50)}..."`
    );
    console.log(`  ID: ${vibelog.id}`);

    const success = await regenerateTranslations(vibelog);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Add delay between requests to avoid rate limits (2 seconds)
    if (i < vibelogs.length - 1) {
      console.log('  ⏳ Waiting 2s before next...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📊 Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📝 Total: ${vibelogs.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
