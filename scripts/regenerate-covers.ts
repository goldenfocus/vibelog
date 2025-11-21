/**
 * Intelligent Cover Regeneration Script
 *
 * Regenerates cover images using content-aware style selection.
 * Each cover becomes a unique masterpiece tailored to the vibelog content.
 *
 * Run with: npx tsx scripts/regenerate-covers.ts [--all] [--limit N]
 *
 * Options:
 *   --all     Regenerate ALL covers (not just expired OpenAI URLs)
 *   --limit N Maximum number of vibelogs to process (default: 5)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

import { generateCoverPrompt } from '../lib/cover-prompt-generator';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Parse command line args
const args = process.argv.slice(2);
const regenerateAll = args.includes('--all');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 5;

interface Vibelog {
  id: string;
  title: string;
  teaser: string | null;
  transcript: string | null;
  cover_image_url: string | null;
  user_id: string | null;
}

async function getUsername(userId: string | null): Promise<string | undefined> {
  if (!userId) {
    return undefined;
  }
  const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
  return data?.username;
}

async function regenerateCovers() {
  console.log('🎨 Intelligent Cover Regeneration');
  console.log('================================\n');

  // Build query
  let query = supabase
    .from('vibelogs')
    .select('id, title, teaser, transcript, cover_image_url, user_id')
    .eq('is_published', true);

  if (!regenerateAll) {
    // Only get vibelogs with expired OpenAI URLs or no cover
    query = query.or(
      'cover_image_url.like.%oaidalleapiprodscus.blob.core.windows.net%,cover_image_url.is.null'
    );
    console.log('Mode: Regenerating expired/missing covers only');
  } else {
    console.log('Mode: Regenerating ALL covers');
  }

  const { data: vibelogs, error: fetchError } = await query.limit(limit);

  if (fetchError) {
    console.error('❌ Failed to fetch vibelogs:', fetchError);
    process.exit(1);
  }

  if (!vibelogs || vibelogs.length === 0) {
    console.log('✅ No vibelogs need cover regeneration!');
    process.exit(0);
  }

  console.log(`📋 Found ${vibelogs.length} vibelogs to process:\n`);
  vibelogs.forEach((v, i) => console.log(`  ${i + 1}. ${v.title}`));
  console.log(`\n💰 Estimated cost: $${(vibelogs.length * 0.08).toFixed(2)}`);
  console.log('\n🎨 Starting intelligent cover generation...\n');

  let successful = 0;
  let failed = 0;

  for (const vibelog of vibelogs as Vibelog[]) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 [${successful + failed + 1}/${vibelogs.length}] ${vibelog.title}`);

      // Get username for branding
      const username = await getUsername(vibelog.user_id);

      // Generate intelligent prompt
      const { prompt, styleName, analysis } = generateCoverPrompt({
        title: vibelog.title,
        teaser: vibelog.teaser || undefined,
        transcript: vibelog.transcript || undefined,
        username,
      });

      console.log(`🎨 Selected style: ${styleName}`);
      console.log(`📊 Detected tones: ${analysis.detectedTones.join(', ') || 'neutral'}`);
      console.log(
        `🔑 Matched keywords: ${analysis.detectedKeywords.slice(0, 5).join(', ') || 'none'}`
      );

      // Generate image with DALL-E 3
      console.log('⏳ Generating image with DALL-E 3...');
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      // Download the image
      console.log('📥 Downloading generated image...');
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      const fileName = `cover-${vibelog.id}.png`;

      // Delete old file if exists
      await supabase.storage.from('vibelog-covers').remove([fileName]);

      // Upload to Supabase Storage
      console.log('📤 Uploading to Supabase Storage...');
      const { error: uploadError } = await supabase.storage
        .from('vibelog-covers')
        .upload(fileName, Buffer.from(imageBuffer), {
          contentType: 'image/png',
          cacheControl: '31536000',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('vibelog-covers').getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from('vibelogs')
        .update({ cover_image_url: publicUrl })
        .eq('id', vibelog.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`✅ Success! Style: ${styleName}`);
      console.log(`   URL: ${publicUrl.substring(0, 60)}...`);
      successful++;

      // Delay between requests to avoid rate limiting
      if (successful + failed < vibelogs.length) {
        console.log('⏳ Waiting 2s before next request...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 COMPLETED');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`💰 Total cost: ~$${(successful * 0.08).toFixed(2)}`);
}

regenerateCovers().catch(console.error);
