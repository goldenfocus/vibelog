import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { config } from '@/lib/config';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

// Branding guard: replace any word that starts with "blog" → "vibelog" variants
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
  const fixedTitle = branded.replace(/^#\s*\[([^\]]+)\]/m, '# $1');
  return fixedTitle;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    const isDev = process.env.NODE_ENV !== 'production';
    const baseOpts = userId
      ? { limit: 10000, window: '15 m' as const }
      : { limit: 10000, window: '24 h' as const };
    const opts = isDev ? { limit: 10000, window: '15 m' as const } : baseOpts;
    const rl = await rateLimit(request, 'regenerate-vibelog', opts, userId || undefined);

    if (!rl.success) {
      return tooManyResponse(rl);
    }

    const { transcription, tone } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
    }

    if (typeof transcription !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

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

    const MAX_CHARS = 10_000;
    if (transcription.length > MAX_CHARS) {
      return NextResponse.json({ error: 'Transcription too long' }, { status: 413 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Regenerating vibelog with tone:', selectedTone);
      console.log('Transcription:', transcription.substring(0, 100) + '...');
    }

    // Check for real API key
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'dummy_key' ||
      process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
    ) {
      console.log('🧪 Using mock regeneration for development/testing');
      return NextResponse.json({
        vibelogTeaser: postProcessContent(
          'This is a regenerated teaser with your selected tone. It keeps your natural style while enhancing engagement.'
        ),
        vibelogContent: postProcessContent(
          `# Regenerated Content\n\nThis vibelog has been regenerated with the ${selectedTone} tone. The content preserves your original message while adapting the writing style to match your preference.`
        ),
        success: true,
      });
    }

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

    const completion = await openai.chat.completions.create({
      model: config.ai.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are an English vibelog writer creating content based on the user's preferred tone. Your task is to write posts in English only.

TONE INSTRUCTION (CRITICAL - APPLY THIS STYLE):
${toneInstruction}

CRITICAL REQUIREMENTS:
- You MUST write in English language only
- All titles, headings, and content must be in English
- The input is an English transcription that should be transformed into an English vibelog post
- Branding rule: replace any word that starts with "blog" with the "vibelog" family (blog→vibelog, blogging→vibelogging, blogger→vibelogger)

DUAL-CONTENT OUTPUT FORMAT (CRITICAL):
You MUST output TWO versions in this EXACT format:

---TEASER---
[Write a 2-3 paragraph addictive teaser (200-400 chars) that creates curiosity. Keep the author's natural style and vocabulary, but enhance it with engagement techniques.]
---FULL---
# [Compelling Title]

[Complete vibelog post with full content, proper structure, H2 sections, using the specified tone style above]

TEASER WRITING TECHNIQUES (keep their style, add engagement):
- Preserve the author's voice and vocabulary
- Start with a surprising statement or question from their content
- Build curiosity without revealing the answer
- Create information gaps that beg to be filled
- End mid-thought or with a provocative question

FULL CONTENT REQUIREMENTS:
- Begin with a single H1 that is a concise, compelling title
- Use ## for main sections
- Write in clear, engaging English using the specified tone
- Keep paragraphs short and readable
- Provide complete information and insights

Write a complete dual-content vibelog based on the transcription provided.`,
        },
        {
          role: 'user',
          content: `Transform this English transcription into a dual-content English vibelog post with the ${selectedTone} tone:

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

    const rawContent = (completion as any).choices[0]?.message?.content || '';

    // Parse the dual-content response
    const teaserMatch = rawContent.match(/---TEASER---\s*([\s\S]*?)---FULL---/);
    const fullMatch = rawContent.match(/---FULL---\s*([\s\S]*?)$/);

    let teaser = '';
    let fullContent = '';

    if (teaserMatch && fullMatch) {
      teaser = postProcessContent(teaserMatch[1].trim());
      fullContent = postProcessContent(fullMatch[1].trim());
    } else {
      console.warn('⚠️ [REGENERATE] Failed to parse dual-content format, using fallback');
      fullContent = postProcessContent(rawContent);
      const firstParagraphs = fullContent.split('\n\n').slice(0, 2).join('\n\n');
      teaser = firstParagraphs.substring(0, 300) + (firstParagraphs.length > 300 ? '...' : '');
    }

    const finalTeaser = teaser || 'Content regeneration in progress...';
    const finalFullContent = fullContent || 'Content regeneration failed';

    return NextResponse.json({
      vibelogTeaser: finalTeaser,
      vibelogContent: finalFullContent,
      success: true,
    });
  } catch (error) {
    console.error('Vibelog regeneration error:', error);
    return NextResponse.json({ error: 'Failed to regenerate vibelog content' }, { status: 500 });
  }
}
