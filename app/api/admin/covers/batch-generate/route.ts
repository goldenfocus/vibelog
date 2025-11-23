import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { calculateImageCost, isDailyLimitExceeded, trackAICost } from '@/lib/ai-cost-tracker';
import { logAdminAction, requireAdmin } from '@/lib/auth-admin';
import { config } from '@/lib/config';
import { generateCoverPrompt } from '@/lib/cover-prompt-generator';
import { uploadCover } from '@/lib/cover-storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max (Vercel limit)

interface BatchResult {
  total: number;
  generated: number;
  failed: number;
  skipped: number;
  errors: Array<{ vibelogId: string; title: string; error: string }>;
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 ADMIN AUTH: Require admin privileges
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireAdmin(user.id);

    // 🛡️ CIRCUIT BREAKER: Check if daily cost limit exceeded
    if (await isDailyLimitExceeded()) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message:
            'AI services have reached their daily cost limit ($50). Service will resume tomorrow.',
        },
        { status: 503 }
      );
    }

    // Parse request parameters
    const body = await request.json();
    const limit = Math.min(body.limit || 10, 50); // Max 50 at a time
    const dryRun = body.dryRun || false;

    console.log(`🎨 [Admin Batch Cover] Starting batch generation...`);
    console.log(`   Admin: ${user.email}`);
    console.log(`   Limit: ${limit}`);
    console.log(`   Dry Run: ${dryRun}`);

    // Fetch vibelogs without covers using admin client
    const adminClient = await createServerAdminClient();
    const { data: vibelogs, error: fetchError } = await adminClient
      .from('vibelogs')
      .select(
        `
        id,
        title,
        teaser,
        transcription,
        user_id,
        profiles!inner(username)
      `
      )
      .is('cover_image_url', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('[Admin Batch Cover] Fetch error:', fetchError);
      throw new Error(`Failed to fetch vibelogs: ${fetchError.message}`);
    }

    const results: BatchResult = {
      total: vibelogs?.length || 0,
      generated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    if (!vibelogs || vibelogs.length === 0) {
      console.log('[Admin Batch Cover] No vibelogs need covers');
      return NextResponse.json({
        success: true,
        message: 'All vibelogs already have covers',
        results,
      });
    }

    console.log(`📊 Found ${vibelogs.length} vibelogs without covers`);

    // Check for OpenAI API key
    if (
      !config.ai.openai.apiKey ||
      config.ai.openai.apiKey === 'dummy_key' ||
      config.ai.openai.apiKey === 'your_openai_api_key_here'
    ) {
      console.error('[Admin Batch Cover] No OpenAI API key configured');
      return NextResponse.json(
        {
          error: 'Cover generation is not configured',
          message: 'The OpenAI API key is missing.',
        },
        { status: 503 }
      );
    }

    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    // Process vibelogs sequentially
    for (const vibelog of vibelogs) {
      console.log(`\n📦 Processing: ${vibelog.title?.substring(0, 50) || 'Untitled'}...`);
      console.log(`   ID: ${vibelog.id}`);

      // Skip vibelogs without titles
      if (!vibelog.title) {
        console.log('   ⏭️  Skipping: No title');
        results.skipped++;
        continue;
      }

      // Dry run mode - just count
      if (dryRun) {
        console.log('   🧪 Would generate cover (dry run)');
        results.generated++;
        continue;
      }

      try {
        // Generate intelligent prompt based on content analysis
        const profile = Array.isArray(vibelog.profiles) ? vibelog.profiles[0] : vibelog.profiles;
        const { prompt, styleName, analysis } = generateCoverPrompt({
          title: vibelog.title,
          teaser: vibelog.teaser,
          transcript: vibelog.transcription,
          username: profile?.username,
        });

        console.log(`   🎨 Style: ${styleName}`);
        console.log(`   🎭 Tones: ${analysis.detectedTones.join(', ') || 'neutral'}`);

        // Generate image with DALL-E 3
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1792x1024', // Wide format for blog covers
          quality: 'standard', // Use standard to save costs ($0.08 vs $0.16 for HD)
          style: 'vivid',
        });

        // 💰 COST TRACKING
        const cost = calculateImageCost();
        await trackAICost(null, 'dall-e-3', cost, {
          endpoint: '/api/admin/covers/batch-generate',
          vibelog_id: vibelog.id,
          admin_user_id: user.id,
        });

        console.log(`   💰 Cost: $${cost.toFixed(4)}`);

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
          throw new Error('No image URL in DALL-E response');
        }

        // Download the image from OpenAI (URLs expire in ~1 hour)
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();

        // Upload to Supabase Storage
        const { url: storedUrl, error: uploadError } = await uploadCover(
          vibelog.id,
          Buffer.from(imageBuffer),
          'image/png'
        );

        if (uploadError || !storedUrl) {
          throw new Error(`Upload failed: ${uploadError || 'No URL returned'}`);
        }

        console.log(`   💾 Saved to storage: ${storedUrl}`);

        // Update vibelog with cover URL
        const { error: updateError } = await adminClient
          .from('vibelogs')
          .update({
            cover_image_url: storedUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vibelog.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log(`   ✅ Cover generated successfully`);
        results.generated++;

        // Wait 1 second between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`   ❌ Failed: ${errorMsg}`);
        results.failed++;
        results.errors.push({
          vibelogId: vibelog.id,
          title: vibelog.title,
          error: errorMsg,
        });

        // If we hit a rate limit, wait longer
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          console.log('   ⏸️  Rate limit hit, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }

    // Log admin action for audit trail
    await logAdminAction(user.id, 'batch_generate_covers', {
      changes: {
        limit,
        dryRun,
        results,
      },
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed:    ${results.total}`);
    console.log(`✅ Generated:       ${results.generated}`);
    console.log(`❌ Failed:          ${results.failed}`);
    console.log(`⏭️  Skipped:         ${results.skipped}`);
    console.log('='.repeat(60));

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach(({ vibelogId, title, error }) => {
        console.log(`   ${vibelogId} (${title}): ${error}`);
      });
    }

    // Check if there are more vibelogs to process
    const { count } = await adminClient
      .from('vibelogs')
      .select('id', { count: 'exact', head: true })
      .is('cover_image_url', null);

    const remaining = (count || 0) - results.generated;

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Batch generation completed',
      results,
      remaining,
      suggestion:
        remaining > 0 && !dryRun
          ? `${remaining} vibelogs still need covers. Run this endpoint again to generate the next batch.`
          : null,
    });
  } catch (error) {
    console.error('❌ [Admin Batch Cover] Error:', error);

    let errorMessage = 'Batch cover generation failed';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Forbidden') || error.message.includes('Admin')) {
        errorMessage = 'Admin privileges required';
        statusCode = 403;
      } else if (error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication required';
        statusCode = 401;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'OpenAI API rate limit exceeded';
        statusCode = 429;
      } else if (error.message.includes('quota') || error.message.includes('insufficient')) {
        errorMessage = 'OpenAI API quota exceeded';
        statusCode = 402;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: statusCode }
    );
  }
}
