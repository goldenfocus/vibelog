import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import {
  trackAICost,
  calculateGPTCost,
  isDailyLimitExceeded,
  estimateTokens,
} from '@/lib/ai-cost-tracker';
import { checkAndBlockBots } from '@/lib/botid-check';
import { config } from '@/lib/config';
import { isDev } from '@/lib/env';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Branding guard: replace "blog" → "vibelog" variants
function applyBranding(content: string): string {
  if (!content) {
    return content;
  }

  const urls: string[] = [];
  const urlPlaceholder = (i: number) => `__URL_${i}__`;
  const urlRegex = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
  const protectedText = content.replace(urlRegex, m => {
    urls.push(m);
    return urlPlaceholder(urls.length - 1);
  });

  const replaced = protectedText.replace(/\bblog(\w*)\b/gi, (_match, suffix: string) => {
    return `vibelog${(suffix || '').toLowerCase()}`;
  });

  return replaced.replace(/__URL_(\d+)__/g, (_m, idx) => urls[Number(idx)] || _m);
}

function postProcessContent(content: string): string {
  const branded = applyBranding(content);
  return branded.replace(/^#\s*\[([^\]]+)\]/m, '# $1');
}

export async function POST(request: NextRequest) {
  try {
    // 🛡️ BOT PROTECTION: Block automated bots
    const botCheck = await checkAndBlockBots();
    if (botCheck) {
      return botCheck;
    }

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

    // Use rate limits from config (COST PROTECTION)
    const limits = config.rateLimits.generation;
    const opts = userId ? limits.authenticated : limits.anonymous;
    const rl = await rateLimit(request, 'generate-vibelog', opts, userId || undefined);
    if (!rl.success) {
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message: `You've used your ${opts.limit} free generations today. Sign in to get ${limits.authenticated.limit} per day!`,
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                `${limits.authenticated.limit} generations per day`,
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

    const { transcription, tone, detectedLanguage } = await request.json();

    if (!transcription || typeof transcription !== 'string') {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    // Language setup
    const targetLanguage = detectedLanguage || 'en';
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      vi: 'Vietnamese',
      zh: 'Chinese',
    };
    const languageName = languageNames[targetLanguage] || 'English';

    // Validate tone
    const validTones = [
      'authentic',
      'professional',
      'casual',
      'humorous',
      'inspiring',
      'analytical',
      'storytelling',
      'dramatic',
      'poetic',
    ];
    const selectedTone = tone && validTones.includes(tone) ? tone : 'authentic';

    // Limit transcription length to prevent abuse
    const MAX_CHARS = 10_000;
    if (transcription.length > MAX_CHARS) {
      return NextResponse.json({ error: 'Transcription too long' }, { status: 413 });
    }

    // Check for real API key
    if (
      !config.ai.openai.apiKey ||
      config.ai.openai.apiKey === 'dummy_key' ||
      config.ai.openai.apiKey === 'your_openai_api_key_here'
    ) {
      console.warn('🧪 Using mock vibelog generation for development/testing');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return NextResponse.json({
        vibelogTeaser:
          "What if I told you there's a secret weapon that makes content creation 3-4 times faster? Voice technology is revolutionizing how we create...",
        vibelogContent: `# The Future of Voice Technology

Voice technology is revolutionizing how we create and share content. Speaking is our most natural form of communication.

## The Natural Evolution

When we remove the friction of typing, we can focus purely on our ideas.

## Why Voice Matters

The implications for creators are profound. We're moving toward a world where your voice becomes your pen.`,
        originalLanguage: targetLanguage,
        success: true,
      });
    }

    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    // Tone instructions
    const toneInstructions: Record<string, string> = {
      authentic:
        "Keep the speaker's natural voice. Make minimal edits - only fix grammar errors and remove excessive repetition. Preserve their vocabulary and speaking style.",
      professional:
        'Use a professional, formal tone with clear structure and authority. Maintain objectivity and present ideas with confidence.',
      casual:
        "Use a casual, conversational tone. Write like you're chatting with a friend - use contractions and simple words.",
      humorous:
        'Make it funny and lighthearted while keeping the core message intact. Use wit and playful language.',
      inspiring:
        'Make it inspirational and uplifting. Use empowering language and emphasize growth and transformation.',
      analytical:
        'Use an analytical approach with clear insights. Structure content logically with evidence and conclusions.',
      storytelling:
        'Transform it into a narrative with setup, conflict, and resolution. Create engaging scenes.',
      dramatic:
        'Heighten the emotional impact with vivid imagery and tension. Make moments feel significant.',
      poetic: 'Transform into contemplative literary prose with metaphors and rich imagery.',
    };

    const toneInstruction = toneInstructions[selectedTone] || toneInstructions.authentic;

    // Estimate input tokens for cost tracking
    const inputTokens = estimateTokens(transcription) + 500; // +500 for system prompt

    // Streaming not supported with cost tracking - use non-streaming
    const completion = await openai.chat.completions.create({
      model: config.ai.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are a vibelog writer. Write posts in ${languageName}.

TONE: ${toneInstruction}

CRITICAL:
- Write in ${languageName} only
- Replace "blog" with "vibelog" variants

OUTPUT FORMAT:
---TEASER---
[2-3 paragraph hook (200-400 chars) that creates curiosity]
---FULL---
# [Title]
[Complete vibelog with H2 sections]`,
        },
        {
          role: 'user',
          content: `Transform this ${languageName} transcription into a vibelog:

"${transcription}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: false,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const outputTokens = estimateTokens(rawContent);

    // 💰 COST TRACKING
    const cost = calculateGPTCost(inputTokens, outputTokens);
    const { allowed } = await trackAICost(userId || null, 'gpt-4o-mini', cost, {
      endpoint: '/api/generate-vibelog',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      tone: selectedTone,
      language: targetLanguage,
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
      console.log(
        `💰 Generate vibelog cost: $${cost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`
      );
    }

    // Parse dual-content response
    const teaserMatch = rawContent.match(/---TEASER---\s*([\s\S]*?)---FULL---/);
    const fullMatch = rawContent.match(/---FULL---\s*([\s\S]*?)$/);

    let teaser = '';
    let fullContent = '';

    if (teaserMatch && fullMatch) {
      teaser = postProcessContent(teaserMatch[1].trim());
      fullContent = postProcessContent(fullMatch[1].trim());
    } else {
      // Fallback
      fullContent = postProcessContent(rawContent);
      const firstParagraphs = fullContent.split('\n\n').slice(0, 2).join('\n\n');
      teaser = firstParagraphs.substring(0, 300) + (firstParagraphs.length > 300 ? '...' : '');
    }

    return NextResponse.json({
      vibelogTeaser: teaser || 'Content generation in progress...',
      vibelogContent: fullContent || 'Content generation failed',
      originalLanguage: targetLanguage,
      success: true,
    });
  } catch (error) {
    console.error('Vibelog generation error:', error);

    let errorMessage = 'Failed to generate vibelog content';
    let statusCode = 500;
    let errorDetails = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      if (error.message.includes('Invalid API key') || error.message.includes('invalid_api_key')) {
        errorMessage = 'API configuration error';
        statusCode = 401;
      } else if (error.message.includes('insufficient_quota')) {
        errorMessage = 'API quota exceeded';
        statusCode = 402;
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
