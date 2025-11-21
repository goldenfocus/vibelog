import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { trackAICost, calculateImageCost, isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // DALL-E can take up to 60 seconds

export async function POST(request: NextRequest) {
  try {
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

    const { title, teaser, summary, vibelogId } = await request.json();

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

    console.log(
      '🎨 Generating cover image for:',
      title?.substring(0, 50) || teaser?.substring(0, 50)
    );

    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    // Create a prompt for DALL-E based on the vibelog content
    const prompt = `Create an artistic, visually striking cover image for a blog post titled "${contentForImage.substring(0, 200)}".
Style: Modern, minimalist, abstract with subtle gradients.
Colors: Vibrant but professional, suitable for a tech/lifestyle blog.
No text in the image. Focus on abstract shapes, patterns, or symbolic imagery that captures the essence of the content.
The image should work well as a social media preview and blog header.`;

    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
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

    // ALWAYS download and save to Supabase Storage (OpenAI URLs expire in ~1 hour)
    let storedUrl = imageUrl;

          await supa.from('vibelogs').update({ cover_image_url: storedUrl }).eq('id', vibelogId);
        }
      }
    } catch (storageErr) {
      console.warn('⚠️ Storage error:', storageErr);
      // Continue with OpenAI URL
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
    });
  } catch (error) {
    console.error('❌ Error generating cover:', error);

    let errorMessage = 'Failed to generate cover image';
    let statusCode = 500;
    let errorDetails = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.message.includes('Invalid API key') || error.message.includes('invalid_api_key')) {
        errorMessage = 'API configuration error';
        statusCode = 401;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'OpenAI API rate limit exceeded';
        statusCode = 429;
      } else if (error.message.includes('quota') || error.message.includes('insufficient')) {
        errorMessage = 'OpenAI API quota exceeded';
        statusCode = 402;
      } else if (error.message.includes('content_policy')) {
        errorMessage = 'Content policy violation - please try different content';
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails || 'Unknown error',
      },
      { status: statusCode }
    );
  }
}
