import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { config } from '@/lib/config';
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

    const { transcription, stream, tone, keepFillerWords, detectedLanguage } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    if (typeof transcription !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Use detected language or default to English
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

    // Validate tone if provided
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
      console.log('Target language:', languageName, `(${targetLanguage})`);
      console.log('Selected tone:', selectedTone);
      console.log('Keep filler words:', keepFillerWords);
    }

    // Check if we have a real API key, otherwise return mock response for testing
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'dummy_key' ||
      process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
    ) {
      console.log('🧪 Using mock vibelog generation for development/testing');

      // OPTIMIZATION 2: Support streaming for mock responses too
      if (stream) {
        const mockContent = `---TEASER---
What if I told you there's a secret weapon that makes content creation 3-4 times faster, more authentic, and accessible to everyone? The answer might shock you.

Voice technology isn't just changing how we create content—it's revolutionizing the entire creative process. But here's what most people don't realize about what's coming next...
---FULL---
# The Future of Voice Technology: Transforming Content Creation

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

*Ready to try voice-powered content creation? Start speaking your ideas into existence today.*`;

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            // Simulate streaming by sending chunks
            const words = mockContent.split(' ');
            for (let i = 0; i < words.length; i++) {
              const chunk = (i === 0 ? '' : ' ') + words[i];
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 30)); // Simulate delay
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

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
        originalLanguage: targetLanguage, // ISO 639-1 code for the original content
        success: true,
      });
    }

    // Initialize OpenAI client only when we have a real API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
    });

    // Tone-specific instructions
    const toneInstructions: Record<string, string> = {
      authentic:
        "Keep the speaker's natural voice. Make minimal edits - only fix obvious grammar errors and remove excessive repetition (same phrase/sentence repeated 3+ times). Preserve their vocabulary, sentence structure, speech patterns, and speaking style. Preserve natural pauses, informal expressions, and personal idioms. Only fix clarity issues that completely obscure meaning. Don't make it more dramatic or polished than the original. The goal is to sound like the person actually talks, just cleaned up slightly.",
      professional:
        'Use a professional, formal tone with clear structure and authority appropriate for a business or expert audience. Employ industry-standard terminology when appropriate, but simplify technical jargon for general audiences. Maintain objectivity and present ideas with confidence and expertise. Structure content logically with strong topic sentences. Balance formality with approachability - avoid being stiff or condescending. Do not use casual language, slang, humor, or overly personal anecdotes.',
      casual:
        "Use a casual, conversational tone that feels friendly and approachable. Write like you're chatting with a friend - use contractions, simple words, and a relaxed style. Keep it warm and personable with natural flow. Maintain clear structure and readability despite the casual tone - avoid rambling or stream-of-consciousness. This is friendly and accessible, not comedic (that's humorous tone). Do not use formal or technical language unless necessary, and avoid humor that would belong in the humorous tone.",
      humorous:
        "Make it funny and lighthearted while keeping the core message intact. Use appropriate humor types: wit, wordplay, amusing observations, or playful language. Avoid sarcasm, mockery, or potentially offensive humor. Maintain respect for the subject matter and audience. Don't force jokes - let humor emerge naturally from the content itself. This tone is explicitly comedic - do not confuse with poetic (contemplative), dramatic (intense), or casual (friendly but not funny) tones.",
      inspiring:
        'Make it inspirational and uplifting, focusing on positive outcomes and motivation. Use empowering language, highlight possibilities, emphasize growth and transformation. Make readers feel capable and excited about taking action. Maintain an optimistic, forward-looking perspective while staying grounded in reality - avoid false promises or unrealistic expectations. Write with genuine enthusiasm and avoid clichéd motivational phrases like "think outside the box", "reach for the stars", or "dream big". Make inspiration feel authentic and specific rather than generic.',
      analytical:
        'Use an analytical, data-driven approach with clear insights and conclusions. Structure content logically: present hypothesis/question, provide evidence (data, examples, patterns), and draw evidence-based conclusions. Break down complex ideas systematically, identify patterns, and use precise language. Include concrete examples to illustrate points, but prioritize data and logical reasoning. Maintain readability despite technical content - explain complex concepts clearly. Do not use emotional language, dramatic flourishes, or persuasive techniques - focus on objective facts and logical analysis.',
      storytelling:
        "Transform it into a narrative with clear structure: setup (introduce characters/scenario), conflict (challenge or tension), and resolution (outcome or insight). Use engaging characters, vivid scenes, and progression through a story arc. Create concrete scenes from abstract concepts - if the original is theoretical, find the human story within it. Stay true to the original content's core message while using creative license to enhance narrative flow. Focus on plot and character development rather than literary flourishes. Do not invent facts or significantly alter the original meaning.",
      dramatic:
        'Heighten the emotional impact and intensity with vivid imagery, tension, and emphasis on stakes and consequences. Make moments feel significant and emotionally charged. Create suspense and anticipation. Maintain believable intensity - dramatic but not melodramatic or over-the-top. Ground dramatic moments in real stakes and consequences. This is about emotional intensity and high stakes - distinct from poetic (contemplative and serene), humorous (comedic), or storytelling (narrative focus). Do not sacrifice believability for dramatic effect.',
      poetic:
        'Transform into contemplative literary prose with a serious, reflective tone. Use metaphors, rich imagery, and lyrical language to create depth and meaning. Employ literary devices like alliteration, symbolism, and evocative descriptions. Maintain a thoughtful, introspective mood - this is NOT humorous or comedic. Focus on beauty, meaning, and emotional resonance rather than entertainment or jokes. The tone should be serene and profound, not dramatic or lighthearted. Avoid excessive ornamentation - subtle literary devices are more effective than heavy-handed poetic language.',
    };

    const toneInstruction = toneInstructions[selectedTone] || toneInstructions.authentic;

    // OPTIMIZATION 2: Enable streaming for real-time content delivery
    // OPTIMIZATION 4: Use GPT-4o-mini for faster, better, cheaper generation
    const completion = await openai.chat.completions.create({
      model: config.ai.openai.model, // gpt-4o-mini: 3-4x faster than gpt-3.5-turbo
      messages: [
        {
          role: 'system',
          content: `You are a vibelog writer creating content based on the user's preferred tone. Your task is to write posts in ${languageName} (language code: ${targetLanguage}).

TONE INSTRUCTION (CRITICAL - APPLY THIS STYLE):
${toneInstruction}

CRITICAL REQUIREMENTS:
- You MUST write in ${languageName} language only - preserve the original language of the speaker
- All titles, headings, and content must be in ${languageName}
- The input is a ${languageName} transcription that should be transformed into a ${languageName} vibelog post
- Keep the content in the SAME language as the transcription - do NOT translate
- Branding rule: replace any word that starts with "blog" with the "vibelog" family (blog→vibelog, blogging→vibelogging, blogger→vibelogger). Do NOT modify URLs or product/brand names that are already correct.

DUAL-CONTENT OUTPUT FORMAT (CRITICAL):
You MUST output TWO versions in this EXACT format:

---TEASER---
[Write a 2-3 paragraph addictive teaser (200-400 chars) that creates curiosity and makes readers want to sign up. Keep the author's natural style and vocabulary, but enhance it with engagement techniques. DO NOT just truncate the intro - craft a unique hook.]
---FULL---
# [Compelling Title]

[Complete vibelog post with full content, proper structure, H2 sections, using the specified tone style above]

TEASER WRITING TECHNIQUES (keep their style, add engagement):
- Preserve the author's voice and vocabulary
- Start with a surprising statement or question from their content
- Build curiosity without revealing the answer
- Use power words naturally: "shocking", "secret", "truth", "never", "always"
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
          content: `Transform this ${languageName} transcription into a dual-content ${languageName} vibelog post with both an addictive teaser and full content:

"${transcription}"

Remember:
- Write EVERYTHING in ${languageName} language
- Output BOTH sections in the exact format:
---TEASER---
[irresistible hook content in ${languageName}]
---FULL---
[complete vibelog with title and full content in ${languageName}]`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: stream === true, // Enable streaming if requested
    });

    // OPTIMIZATION 2: Return streaming response if requested
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion as any) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming response (backward compatible)
    const rawContent = (completion as any).choices[0]?.message?.content || '';

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
      originalLanguage: targetLanguage, // ISO 639-1 code for the original content
      success: true,
    });
  } catch (error) {
    console.error('Vibelog generation error:', error);
    return NextResponse.json({ error: 'Failed to generate vibelog content' }, { status: 500 });
  }
}
