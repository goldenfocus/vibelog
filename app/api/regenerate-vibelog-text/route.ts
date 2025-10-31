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
      professional: 'Use a professional, formal tone with clear structure and authority.',
      casual: 'Use a casual, conversational tone that feels friendly and approachable.',
      humorous:
        'Make it funny and lighthearted while keeping the core message intact. Add humor naturally.',
      inspiring:
        'Make it inspirational and uplifting, focusing on positive outcomes and motivation.',
      analytical: 'Use an analytical, data-driven approach with clear insights and conclusions.',
      storytelling:
        'Transform it into a narrative with engaging characters, scenes, and progression.',
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
