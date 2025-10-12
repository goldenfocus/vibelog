import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

// Branding guard: replace any word that starts with "blog" → "vibelog" variants
// Examples: blog -> vibelog, blogging -> vibelogging, blogger -> vibelogger
// Heuristic: do NOT modify URLs.
function applyBranding(content: string): string {
  if (!content) {
    return content;
  }

  // Temporarily protect URLs so replacements do not break links
  const urls: string[] = [];
  const urlPlaceholder = (i: number) => `__URL_${i}__`;
  const urlRegex = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
  const protectedText = content.replace(urlRegex, m => {
    urls.push(m);
    return urlPlaceholder(urls.length - 1);
  });

  // Replace words beginning with "blog" (case-insensitive), preserving suffix as lowercase
  const replaced = protectedText.replace(/\bblog(\w*)\b/gi, (_match, suffix: string) => {
    return `vibelog${(suffix || '').toLowerCase()}`;
  });

  // Restore URLs
  return replaced.replace(/__URL_(\d+)__/g, (_m, idx) => urls[Number(idx)] || _m);
}

function postProcessContent(content: string): string {
  const branded = applyBranding(content);
  // Remove placeholder brackets in H1 if any model returns e.g. "# [Engaging Title Here]"
  const fixedTitle = branded.replace(/^#\s*\[([^\]]+)\]/m, '# $1');
  return fixedTitle;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit per user if logged in; otherwise per IP
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Limits: logged-in 10000 per 15 minutes; anonymous 10000 per day
    // In development, loosen limits to avoid noisy 429s during iteration
    const isDev = process.env.NODE_ENV !== 'production';
    const baseOpts = userId
      ? { limit: 10000, window: '15 m' as const }
      : { limit: 10000, window: '24 h' as const };
    const opts = isDev ? { limit: 10000, window: '15 m' as const } : baseOpts;
    const rl = await rateLimit(request, 'generate-vibelog', opts, userId || undefined);
    if (!rl.success) {
      // Custom response for anonymous users to encourage signup
      if (!userId) {
        return NextResponse.json(
          {
            error: 'Daily limit reached',
            message:
              "You've used your 10000 free vibelog generations today. Sign in with Google to get 10000 requests every 15 minutes!",
            upgrade: {
              action: 'Sign in with Google',
              benefits: [
                '10000 requests every 15 minutes (vs 10000 per day)',
                'No daily limits',
                'Faster processing priority',
                'Save your vibelog posts',
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

    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    if (typeof transcription !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Limit transcription length to prevent abuse and reduce cost
    const MAX_CHARS = 10_000;
    if (transcription.length > MAX_CHARS) {
      return NextResponse.json({ error: 'Transcription too long' }, { status: 413 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        'Generating vibelog from transcription:',
        transcription.substring(0, 100) + '...'
      );
    }

    // Check if we have a real API key, otherwise return mock response for testing
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'dummy_key' ||
      process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
    ) {
      console.log('🧪 Using mock vibelog generation for development/testing');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      return NextResponse.json({
        vibelogTeaser:
          postProcessContent(`What if I told you there's a secret weapon that makes content creation 3-4 times faster, more authentic, and accessible to everyone? The answer might shock you.

Voice technology isn't just changing how we create content—it's revolutionizing the entire creative process. But here's what most people don't realize about what's coming next...`),
        vibelogContent:
          postProcessContent(`# The Future of Voice Technology: Transforming Content Creation

Voice technology is revolutionizing how we create and share content. As we move toward a more connected digital world, the ability to transform spoken words into polished, publishable content represents a fundamental shift in content creation.

## The Natural Evolution of Communication

Speaking is our most natural form of communication. When we remove the friction of typing and formatting, we can focus purely on our ideas and let technology handle the rest. This liberation allows creators to:

- **Express ideas more naturally** without the constraints of a keyboard
- **Capture inspiration in real-time** wherever they are
- **Reduce the barrier between thought and publication**

## Why Voice Matters in Content Creation

The implications for creators, writers, and content marketers are profound. We're moving toward a world where your voice becomes your pen, enabling:

### Faster Content Production
Voice-to-text technology can capture thoughts at the speed of speech, which is typically 3-4 times faster than typing.

### Improved Accessibility
Voice interfaces make content creation accessible to users with mobility challenges or those who prefer auditory interaction.

### Enhanced Authenticity
Content created through voice often retains a more conversational, authentic tone that resonates better with audiences.

## The Technology Behind the Magic

Modern voice technology combines several cutting-edge technologies:

- **Advanced speech recognition** powered by neural networks
- **Natural language processing** for context understanding
- **AI-driven content optimization** for SEO and readability
- **Automated formatting and structuring** for professional presentation

## Looking Forward

As voice technology continues to evolve, we can expect even more sophisticated features like real-time fact-checking, automatic citation generation, and multi-language content creation. The future of content creation is not just digital—it's conversational.

*Ready to try voice-powered content creation? Start speaking your ideas into existence today.*`),
        success: true,
      });
    }

    // Initialize OpenAI client only when we have a real API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an English vibelog writer creating content optimized for maximum engagement. Your task is to write posts in English only.

CRITICAL REQUIREMENTS:
- You MUST write in English language only - never use Spanish, German, French, or any other language
- All titles, headings, and content must be in English
- Ignore any perceived language patterns in the input - always respond in English
- The input is an English transcription that should be transformed into an English vibelog post
- Branding rule: replace any word that starts with "blog" with the "vibelog" family (blog→vibelog, blogging→vibelogging, blogger→vibelogger). Do NOT modify URLs or product/brand names that are already correct.

DUAL-CONTENT OUTPUT FORMAT (CRITICAL):
You MUST output TWO versions in this EXACT format:

---TEASER---
[Write a 2-3 paragraph addictive teaser (200-400 chars) using curiosity-gap psychology. This should be an IRRESISTIBLE hook that makes readers NEED to read more. Use techniques like: cliffhanger endings, intriguing questions, controversial statements, surprising facts, or promises of valuable insights. DO NOT just truncate the intro - craft a unique hook designed to maximize click-through.]
---FULL---
# [Compelling Title]

[Complete vibelog post with full content, proper structure, H2 sections, engaging writing]

TEASER WRITING TECHNIQUES:
- Start with a surprising statement or question
- Build curiosity without revealing the answer
- Use power words: "shocking", "secret", "truth", "never", "always"
- Create information gaps that beg to be filled
- End mid-thought or with a provocative question
- Promise specific value or transformation

FULL CONTENT REQUIREMENTS:
- Begin with a single H1 that is a concise, compelling title (no placeholders, no square brackets)
- Use ## for main sections
- Write in clear, engaging English
- Keep paragraphs short and readable
- Provide complete information and insights

Write a complete dual-content vibelog based on the transcription provided.`,
        },
        {
          role: 'user',
          content: `Transform this English transcription into a dual-content English vibelog post with both an addictive teaser and full content:

"${transcription}"

Remember: Output BOTH sections in the exact format:
---TEASER---
[irresistible hook content]
---FULL---
[complete vibelog with title and full content]`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const rawContent = completion.choices[0]?.message?.content || '';

    // Parse the dual-content response
    const teaserMatch = rawContent.match(/---TEASER---\s*([\s\S]*?)---FULL---/);
    const fullMatch = rawContent.match(/---FULL---\s*([\s\S]*?)$/);

    let teaser = '';
    let fullContent = '';

    if (teaserMatch && fullMatch) {
      // Successfully parsed both sections
      teaser = postProcessContent(teaserMatch[1].trim());
      fullContent = postProcessContent(fullMatch[1].trim());
    } else {
      // Fallback: if parsing fails, use the whole content as full and create a simple teaser
      console.warn('⚠️ [VIBELOG-GEN] Failed to parse dual-content format, using fallback');
      fullContent = postProcessContent(rawContent);

      // Create a simple teaser from the first 300 characters
      const firstParagraphs = fullContent.split('\n\n').slice(0, 2).join('\n\n');
      teaser = firstParagraphs.substring(0, 300) + (firstParagraphs.length > 300 ? '...' : '');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [VIBELOG-GEN] Teaser length:', teaser.length);
      console.log('🔍 [VIBELOG-GEN] Full content length:', fullContent.length);
      console.log('🔍 [VIBELOG-GEN] Teaser preview:', teaser.substring(0, 100) + '...');
      console.log('🔍 [VIBELOG-GEN] Full content preview:', fullContent.substring(0, 100) + '...');
    }

    // Ensure we always return valid content
    const finalTeaser = teaser || 'Content generation in progress...';
    const finalFullContent = fullContent || 'Content generation failed';

    return NextResponse.json({
      vibelogTeaser: finalTeaser,
      vibelogContent: finalFullContent,
      success: true,
    });
  } catch (error) {
    console.error('Vibelog generation error:', error);
    return NextResponse.json({ error: 'Failed to generate vibelog content' }, { status: 500 });
  }
}
