import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase';

import type { WritingTone } from '@/types/settings';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RegenerateRequestSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  tone: z.enum([
    'authentic',
    'professional',
    'casual',
    'humorous',
    'inspiring',
    'analytical',
    'storytelling',
    'dramatic',
    'poetic',
  ]),
  customInstructions: z.string().optional(),
});

// Tone-specific system prompts
const TONE_PROMPTS: Record<WritingTone, string> = {
  authentic:
    'Natural and genuine voice. Keep the authentic feel while making it clear and engaging.',
  professional: 'Polished and expert tone. Use professional language while staying approachable.',
  casual: 'Friendly and relaxed. Like chatting with a friend over coffee.',
  humorous: 'Light and playful. Add wit and charm while keeping the core message.',
  inspiring: 'Motivational and uplifting. Energize the reader with positive, empowering language.',
  analytical: 'Data-driven and logical. Use clear reasoning and structured thinking.',
  storytelling: 'Narrative and engaging. Weave a compelling story with vivid details.',
  dramatic: 'Intense and emotional. Build tension and create powerful impact.',
  poetic: 'Literary and artistic. Use beautiful, evocative language and imagery.',
};

/**
 * POST /api/comments/regenerate
 * Enhance a comment transcript with AI using specified tone
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = RegenerateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { transcript, tone, customInstructions } = validation.data;

    // Build the system prompt
    const toneGuidance = TONE_PROMPTS[tone];
    const systemPrompt = `You are a comment enhancement assistant. Your goal is to improve a comment transcript while maintaining its core message and authenticity.

TONE: ${tone.toUpperCase()}
Tone Guidance: ${toneGuidance}

${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}\n` : ''}
CONSTRAINTS:
- Keep it concise (2-4 sentences max for short comments, up to 6 for longer ones)
- Maintain the original intent and key points
- Make it engaging and natural
- Fix any grammar or clarity issues
- Remove filler words unless they add authentic personality
- Don't add information that wasn't in the original

OUTPUT: Just the enhanced comment text, nothing else.`;

    const userPrompt = `Original transcript:\n\n${transcript}\n\nEnhance this comment following the tone and guidelines above.`;

    // Generate enhanced content with GPT-4o-mini
    console.log('🎨 Regenerating comment with tone:', tone);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const enhancedContent = completion.choices[0]?.message?.content?.trim();

    if (!enhancedContent) {
      throw new Error('Failed to generate enhanced content');
    }

    console.log('✨ Comment regenerated successfully');

    return NextResponse.json({
      success: true,
      enhanced_content: enhancedContent,
      tone,
      original_length: transcript.length,
      enhanced_length: enhancedContent.length,
    });
  } catch (error) {
    console.error('Error in POST /api/comments/regenerate:', error);

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({ error: 'OpenAI API configuration error' }, { status: 500 });
    }

    return NextResponse.json(
      {
        error: 'Failed to regenerate comment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
