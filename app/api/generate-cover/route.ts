import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { trackAICost, calculateImageCost, isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
// import { checkAndBlockBots } from '@/lib/botid-check'; // DISABLED: Blocking legit users
import { config } from '@/lib/config';
import { generateCoverPrompt } from '@/lib/cover-prompt-generator';
import { uploadCover } from '@/lib/cover-storage';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // DALL-E can take up to 60 seconds (cover images)

export async function POST(request: NextRequest) {
  try {
    // 🛡️ BOT PROTECTION: DISABLED - was blocking legitimate users
    // const botCheck = await checkAndBlockBots();
    // if (botCheck) {
    //   return botCheck;
    // }

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

    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Use rate limits from config (COST PROTECTION - Images are expensive!)
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

    // Accept title, teaser, or summary - any content to describe the image
    const contentForImage = title || teaser || summary;
    if (!contentForImage) {
      return NextResponse.json(
        { error: 'Title, teaser, or summary is required for cover generation' },
        { status: 400 }
      );
    }

    // Check for real API key
    if (
      !config.ai.openai.apiKey ||
      config.ai.openai.apiKey === 'dummy_key' ||
      config.ai.openai.apiKey === 'your_openai_api_key_here'
    ) {
      console.warn('🧪 Cover generation - no API key configured');
      return NextResponse.json(
        {
          error: 'Cover generation is not configured',
          message: 'The OpenAI API key is missing.',
        },
        { status: 503 }
      );
    }

    // Generate intelligent prompt based on content analysis
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

    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    // Generate image with DALL-E 3 using intelligent prompt
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024', // Wide format for blog covers
      quality: 'standard', // Use standard to save costs ($0.04 vs $0.08 for HD)
      style: 'vivid',
    });

    // 💰 COST TRACKING (DALL-E 3 Standard 1792x1024: $0.080)
    const cost = calculateImageCost();
    const { allowed } = await trackAICost(userId || null, 'dall-e-3', cost, {
      endpoint: '/api/generate-cover',
      vibelog_id: vibelogId,
      size: '1792x1024',
      quality: 'standard',
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
      console.log(`💰 Cover generation cost: $${cost.toFixed(4)}`);
    }

    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt;

    if (!imageUrl) {
      console.error('❌ No image URL in DALL-E response');
      return NextResponse.json({ error: 'Failed to generate cover image' }, { status: 500 });
    }

    console.log('✅ Cover image generated successfully');

    // Fallback OG image if storage fails (use relative path to avoid CORS issues)
    const FALLBACK_OG_IMAGE = '/og-image.png';

    // If no vibelogId, we can still generate but need to save somewhere
    // Generate a temporary ID for storage if vibelogId not provided
    const storageId = vibelogId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // ALWAYS download and save to Supabase Storage (OpenAI URLs expire in ~1 hour)
    let storedUrl: string;
    try {
      // Download the image from OpenAI
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();

      // Upload using modular cover storage utility
      const { url, error: uploadError } = await uploadCover(
        storageId,
        Buffer.from(imageBuffer),
        'image/png'
      );

      if (uploadError || !url) {
        console.error('❌ Failed to save cover to storage:', uploadError);
        storedUrl = FALLBACK_OG_IMAGE;
        console.log('🔄 Using fallback OG image');
      } else {
        storedUrl = url;
        console.log('💾 Cover saved to storage:', storedUrl);

        // Only update vibelog if we have a real vibelogId
        if (vibelogId) {
          await supa.from('vibelogs').update({ cover_image_url: storedUrl }).eq('id', vibelogId);
        }
      }
    } catch (storageErr) {
      console.error('❌ Storage error:', storageErr);
      storedUrl = FALLBACK_OG_IMAGE;
      console.log('🔄 Using fallback OG image');
    }

    return NextResponse.json({
      success: true,
      message: 'Cover image generated successfully',
      url: storedUrl, // Client expects 'url' not 'imageUrl'
      imageUrl: storedUrl, // Keep for backwards compatibility
      alt: `${contentForImage.substring(0, 100)} - cover image`,
      width: 1792,
      height: 1024,
      revisedPrompt, // DALL-E's interpretation of the prompt
      style: styleName, // The art style selected for this cover
      isTemporary: !vibelogId, // Flag if this was a temporary generation
    });
  } catch (error) {
    console.error('❌ Error generating cover:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isContentPolicy =
      errorMessage.includes('content_policy') ||
      errorMessage.includes('safety system') ||
      errorMessage.includes('rejected');

    // For content policy violations, return fallback image instead of error
    // This allows the vibelog to be saved with a default cover
    if (isContentPolicy) {
      console.log('⚠️ Content policy rejection - returning fallback image');
      return NextResponse.json({
        success: true,
        message: 'Using default cover (content policy)',
        url: '/og-image.png',
        imageUrl: '/og-image.png',
        alt: 'Default cover image',
        width: 1200,
        height: 630,
        isFallback: true,
        contentPolicyRejection: true,
      });
    }

    // For other errors, determine appropriate response
    let responseMessage = 'Failed to generate cover image';
    let statusCode = 500;

    if (errorMessage.includes('Invalid API key') || errorMessage.includes('invalid_api_key')) {
      responseMessage = 'API configuration error';
      statusCode = 401;
    } else if (errorMessage.includes('rate limit')) {
      responseMessage = 'OpenAI API rate limit exceeded';
      statusCode = 429;
    } else if (errorMessage.includes('quota') || errorMessage.includes('insufficient')) {
      responseMessage = 'OpenAI API quota exceeded';
      statusCode = 402;
    }

    return NextResponse.json(
      {
        error: responseMessage,
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}
