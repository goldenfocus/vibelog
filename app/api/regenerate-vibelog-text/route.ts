import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { config } from '@/lib/config';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vibelogId, currentContent, tone, prompt } = body;

    if (!vibelogId || !currentContent) {
      return NextResponse.json(
        { error: 'Vibelog ID and current content are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('user_id, title, content')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build tone instruction
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

    const toneInstruction = tone ? toneInstructions[tone] || `Use a ${tone} tone.` : '';
    const customPrompt = prompt ? `\n\nAdditional instructions: ${prompt}` : '';

    // Check if we have a real API key
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'dummy_key' ||
      process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
    ) {
      console.log('🧪 Using mock regeneration for development/testing');

      // Mock response
      const mockContent = currentContent + '\n\n[This would be regenerated with AI]';
      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        vibelogTeaser: mockContent.substring(0, 300) + '...',
        vibelogContent: postProcessContent(mockContent),
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
    });

    const systemPrompt = `You are an English vibelog writer. Your task is to regenerate/edit existing content.

CRITICAL REQUIREMENTS:
- Write in English only
- Maintain the core message and structure of the original content
- Output in the EXACT dual-content format:
---TEASER---
[2-3 paragraph addictive teaser (200-400 chars)]
---FULL---
# [Title from original or improved version]
[Complete regenerated content]

${toneInstruction}${customPrompt}

Preserve important information while applying the requested changes.`;

    const completion = await openai.chat.completions.create({
      model: config.ai.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Regenerate this vibelog content:\n\n"${currentContent}"\n\n${toneInstruction}${customPrompt}\n\nRemember: Output both TEASER and FULL sections in the exact format shown.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const teaserMatch = rawContent.match(/---TEASER---\s*([\s\S]*?)---FULL---/);
    const fullMatch = rawContent.match(/---FULL---\s*([\s\S]*?)$/);

    let teaser = '';
    let fullContent = '';

    if (teaserMatch && fullMatch) {
      teaser = postProcessContent(teaserMatch[1].trim());
      fullContent = postProcessContent(fullMatch[1].trim());
    } else {
      console.warn('⚠️ Failed to parse dual-content format, using fallback');
      fullContent = postProcessContent(rawContent);
      const firstParagraphs = fullContent.split('\n\n').slice(0, 2).join('\n\n');
      teaser = firstParagraphs.substring(0, 300) + (firstParagraphs.length > 300 ? '...' : '');
    }

    return NextResponse.json({
      success: true,
      vibelogTeaser: teaser || 'Content regeneration in progress...',
      vibelogContent: fullContent || currentContent,
    });
  } catch (error) {
    console.error('Error regenerating vibelog text:', error);
    return NextResponse.json({ error: 'Failed to regenerate content' }, { status: 500 });
  }
}
