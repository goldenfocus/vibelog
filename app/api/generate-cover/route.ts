import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { trackAICost, calculateImageCost, isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { generateCoverPrompt } from '@/lib/cover-prompt-generator';
import { uploadCover } from '@/lib/cover-storage';
import { isDev } from '@/lib/env';
import { generateImage } from '@/lib/google-ai';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FALLBACK_OG_IMAGE = '/og-image.png';

interface GenerationResult {
  imageData: Buffer | string;
  provider: 'nano-banana' | 'dall-e-3';
  cost: number;
  isBase64: boolean;
}

/**
 * Try Nano Banana (Google Imagen) first
 */
async function tryNanoBanana(prompt: string): Promise<GenerationResult | null> {
  if (!config.ai.google?.apiKey) {
    console.log('⏭️ Skipping Nano Banana: No Google API key configured');
    return null;
  }

  try {
    console.log('🍌 Attempting Nano Banana (Google Imagen)...');
    const imageUrl = await generateImage({
      prompt,
      aspectRatio: '16:9',
    });

    if (!imageUrl) {
      throw new Error('No image returned');
    }

    // Nano Banana returns base64 data URI
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      console.log('✅ Nano Banana succeeded!');
      return {
        imageData: base64Data,
        provider: 'nano-banana',
        cost: 0.04,
        isBase64: true,
      };
    }

    // If it's a URL, we'll fetch it
    console.log('✅ Nano Banana succeeded (URL format)!');
    return {
      imageData: imageUrl,
      provider: 'nano-banana',
      cost: 0.04,
      isBase64: false,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Nano Banana failed:', msg);
    return null;
  }
}

/**
 * Fallback to DALL-E 3
 */
async function tryDallE(prompt: string): Promise<GenerationResult | null> {
  if (!config.ai.openai?.apiKey || config.ai.openai.apiKey === 'dummy_key') {
    console.log('⏭️ Skipping DALL-E: No OpenAI API key configured');
    return null;
  }

  try {
    console.log('🎨 Attempting DALL-E 3 fallback...');
    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

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
      throw new Error('No image URL in DALL-E response');
    }

    console.log('✅ DALL-E 3 succeeded!');
    return {
      imageData: imageUrl,
      provider: 'dall-e-3',
      cost: calculateImageCost(),
      isBase64: false,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ DALL-E failed:', msg);

    // Check for content policy - this is expected for some prompts
    if (msg.includes('content_policy') || msg.includes('safety') || msg.includes('rejected')) {
      console.log('⚠️ DALL-E content policy rejection');
    }

    return null;
  }
}

// Track in-progress generations to prevent duplicate concurrent calls
const generationInProgress = new Map<string, Promise<Response>>();

export async function POST(request: NextRequest) {
  try {
    // Circuit breaker check
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

    // Rate limiting
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    const limits = config.rateLimits.images;
    const opts = userId ? limits.authenticated : limits.anonymous;
    const rl = await rateLimit(request, 'generate-cover', opts, userId || undefined);
    if (!rl.success) {
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message: `You've used your ${opts.limit} free cover generations today. Sign in to get ${limits.authenticated.limit} per day!`,
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                `${limits.authenticated.limit} cover generations per day`,
                'Save your vibelogs',
                'Access to premium features',
              ],
            },
            ...rl,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(((rl.reset || 0) - Date.now()) / 1000)),
            },
          }
        );
      }
      return tooManyResponse(rl);
    }

    const { title, teaser, summary, transcript, vibelogId, username } = await request.json();

    // IDEMPOTENCY CHECK: If vibelogId provided, check if cover already exists
    if (vibelogId) {
      // Check for in-progress generation (prevents concurrent duplicate calls)
      if (generationInProgress.has(vibelogId)) {
        console.log('🔒 [COVER-GEN] Generation already in progress for:', vibelogId);
        // Wait for existing generation to complete and return its result
        try {
          const existingPromise = generationInProgress.get(vibelogId);
          if (existingPromise) {
            return existingPromise;
          }
        } catch {
          // If existing promise fails, continue with new generation
        }
      }

      // Check database for existing cover
      const adminClient = await createServerAdminClient();
      const { data: existing } = await adminClient
        .from('vibelogs')
        .select('cover_image_url')
        .eq('id', vibelogId)
        .single();

      // Skip if cover already exists (and not the fallback og-image)
      if (
        existing?.cover_image_url &&
        !existing.cover_image_url.includes('og-image') &&
        !existing.cover_image_url.includes('placeholder')
      ) {
        console.log('⏭️ [COVER-GEN] Cover already exists, skipping generation:', vibelogId);
        return NextResponse.json({
          success: true,
          message: 'Cover already exists',
          url: existing.cover_image_url,
          imageUrl: existing.cover_image_url,
          skipped: true,
          provider: 'existing',
        });
      }
    }

    const contentForImage = title || teaser || summary;
    if (!contentForImage) {
      return NextResponse.json(
        { error: 'Title, teaser, or summary is required for cover generation' },
        { status: 400 }
      );
    }

    // Generate prompt
    const { prompt, styleName, analysis } = generateCoverPrompt({
      title: title || contentForImage,
      teaser: teaser || summary,
      transcript,
      username,
    });

    console.log(
      '🎨 Generating cover image for:',
      title?.substring(0, 50) || teaser?.substring(0, 50)
    );
    console.log(`   Style: ${styleName}`);
    console.log(`   Detected tones: ${analysis.detectedTones.join(', ') || 'neutral'}`);

    // ============================================
    // FALLBACK CHAIN: Nano Banana → DALL-E → og-image
    // ============================================
    let result: GenerationResult | null = null;

    // 1. Try Nano Banana (Google Imagen) first
    result = await tryNanoBanana(prompt);

    // 2. If Nano Banana failed, try DALL-E
    if (!result) {
      result = await tryDallE(prompt);
    }

    // 3. If all AI generation failed, use og-image fallback
    if (!result) {
      console.log('🔄 All AI providers failed, using og-image.png fallback');
      return NextResponse.json({
        success: true,
        message: 'Using default cover (AI unavailable)',
        url: FALLBACK_OG_IMAGE,
        imageUrl: FALLBACK_OG_IMAGE,
        alt: 'Default cover image',
        width: 1200,
        height: 630,
        isFallback: true,
        provider: 'fallback',
      });
    }

    // Track cost
    const { allowed } = await trackAICost(userId || null, result.provider, result.cost, {
      endpoint: '/api/generate-cover',
      vibelog_id: vibelogId,
      size: '1792x1024',
      provider: result.provider,
    });

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Daily cost limit exceeded',
          message: 'AI services have reached their daily limit. Try again tomorrow.',
        },
        { status: 503 }
      );
    }

    if (isDev) {
      console.log(`💰 Cover generation cost: $${result.cost.toFixed(4)} (${result.provider})`);
    }

    // Store the image
    const storageId = vibelogId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    let storedUrl: string;
    try {
      let imageBuffer: Buffer;

      if (result.isBase64) {
        // Base64 data
        imageBuffer = Buffer.from(result.imageData as string, 'base64');
      } else {
        // URL - download it
        const imageResponse = await fetch(result.imageData as string);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      }

      const { url, error: uploadError } = await uploadCover(storageId, imageBuffer, 'image/png');

      if (uploadError || !url) {
        console.error('❌ Failed to save cover to storage:', uploadError);
        storedUrl = FALLBACK_OG_IMAGE;
        console.log('🔄 Storage failed, using fallback OG image');
      } else {
        storedUrl = url;
        console.log('💾 Cover saved to storage:', storedUrl);
      }
    } catch (storageErr) {
      console.error('❌ Storage error:', storageErr);
      storedUrl = FALLBACK_OG_IMAGE;
      console.log('🔄 Using fallback OG image');
    }

    // Always update the database with the cover URL (even if fallback)
    // Use admin client to bypass RLS for anonymous users
    if (vibelogId) {
      const adminClient = await createServerAdminClient();
      const { error: updateError } = await adminClient
        .from('vibelogs')
        .update({ cover_image_url: storedUrl })
        .eq('id', vibelogId);

      if (updateError) {
        console.error('❌ Failed to update cover_image_url in database:', updateError);
      } else {
        console.log('📝 Database updated with cover URL:', storedUrl);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cover image generated successfully',
      url: storedUrl,
      imageUrl: storedUrl,
      alt: `${contentForImage.substring(0, 100)} - cover image`,
      width: 1792,
      height: 1024,
      revisedPrompt: prompt,
      style: styleName,
      isTemporary: !vibelogId,
      provider: result.provider,
      isFallback: storedUrl === FALLBACK_OG_IMAGE,
    });
  } catch (error) {
    console.error('❌ Error generating cover:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isContentPolicy =
      errorMessage.includes('content_policy') ||
      errorMessage.includes('safety') ||
      errorMessage.includes('blocked');

    if (isContentPolicy) {
      console.log('⚠️ Content policy rejection - returning fallback image');
      return NextResponse.json({
        success: true,
        message: 'Using default cover (content policy)',
        url: FALLBACK_OG_IMAGE,
        imageUrl: FALLBACK_OG_IMAGE,
        alt: 'Default cover image',
        width: 1200,
        height: 630,
        isFallback: true,
        contentPolicyRejection: true,
      });
    }

    // Always return fallback on error rather than 500
    console.log('⚠️ Unexpected error - returning fallback image');
    return NextResponse.json({
      success: true,
      message: 'Using default cover (generation error)',
      url: FALLBACK_OG_IMAGE,
      imageUrl: FALLBACK_OG_IMAGE,
      alt: 'Default cover image',
      width: 1200,
      height: 630,
      isFallback: true,
      error: errorMessage,
    });
  }
}
