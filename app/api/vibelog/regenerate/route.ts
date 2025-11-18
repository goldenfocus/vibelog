/**
 * Universal Vibelog Regeneration API Route
 * POST /api/vibelog/regenerate
 * Regenerates title, description, teaser, and/or slug for ANY vibelog type
 * Works with text, audio, and video vibelogs
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { config } from '@/lib/config';
import { createApiLogger } from '@/lib/logger';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { generateUserSlug } from '@/lib/seo';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute for regeneration

// Validation schema
const RegenerateSchema = z.object({
  vibelogId: z.string().uuid(),
  fields: z.array(z.enum(['title', 'description', 'teaser', 'slug'])).min(1),
  customSlug: z.string().optional(),
  tone: z
    .enum([
      'authentic',
      'professional',
      'casual',
      'humorous',
      'inspiring',
      'analytical',
      'storytelling',
      'dramatic',
      'poetic',
    ])
    .optional(),
});

export async function POST(request: NextRequest) {
  const apiLogger = createApiLogger(request.headers.get('x-request-id') || undefined);

  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    apiLogger.setContext({ userId: user.id, endpoint: '/api/vibelog/regenerate' });

    // Rate limiting - generous limits for regeneration
    const rl = await rateLimit(
      request,
      'vibelog-regenerate',
      { limit: 100, window: '15 m' },
      user.id
    );
    if (!rl.success) {
      return tooManyResponse(rl);
    }

    // Parse and validate request
    const body = await request.json();
    const validated = RegenerateSchema.parse(body);
    const { vibelogId, fields, customSlug, tone = 'authentic' } = validated;

    apiLogger.debug('Regenerating vibelog content', { vibelogId, fields, customSlug, tone });

    // Fetch vibelog with ownership verification
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, user_id, title, content, teaser, slug, audio_url, video_url')
      .eq('id', vibelogId)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to regenerate this vibelog' },
        { status: 403 }
      );
    }

    // Prepare current values for comparison
    const current = {
      title: vibelog.title || '',
      description: vibelog.content || '',
      teaser: vibelog.teaser || '',
      slug: vibelog.slug || '',
    };

    // If user provided custom slug, validate and use it
    if (customSlug) {
      // Sanitize custom slug
      const sanitized = customSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug is already taken (excluding current vibelog)
      const { data: existing } = await supabase
        .from('vibelogs')
        .select('id')
        .eq('user_id', user.id)
        .eq('slug', `${sanitized}-${vibelogId.slice(0, 8)}`)
        .neq('id', vibelogId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'This slug is already in use' }, { status: 400 });
      }

      const newSlug = generateUserSlug(sanitized, vibelogId);

      return NextResponse.json({
        success: true,
        suggestions: {
          slug: newSlug,
        },
        current,
        message: 'Custom slug validated',
      });
    }

    // AI-based regeneration for selected fields
    const needsAI = fields.some(f => ['title', 'description', 'teaser'].includes(f));

    if (!needsAI) {
      // Only slug regeneration requested (based on existing title)
      const newSlug = vibelog.title ? generateUserSlug(vibelog.title, vibelogId) : current.slug;

      return NextResponse.json({
        success: true,
        suggestions: {
          slug: newSlug,
        },
        current,
      });
    }

    // Use existing content as context for regeneration
    const contentForContext = vibelog.content || vibelog.teaser || 'No content available';

    // Determine content type for better prompts
    const contentType = vibelog.video_url ? 'video' : vibelog.audio_url ? 'audio' : 'text';

    apiLogger.debug('Generating AI suggestions', {
      contentType,
      contentLength: contentForContext.length,
    });

    // Generate using GPT-4o-mini
    const openai = new OpenAI({
      apiKey: config.ai.openai.apiKey,
      timeout: 60_000,
    });

    const completion = await openai.chat.completions.create({
      model: config.ai.openai.model, // gpt-4o-mini
      messages: [
        {
          role: 'system',
          content: `You are a vibelog content regenerator. Your task is to create fresh, engaging variations of existing content while maintaining the core message and tone.

TONE: ${tone}

CONTENT TYPE: ${contentType} vibelog

OUTPUT FORMAT (CRITICAL - EXACT FORMAT):
TITLE: [Compelling 5-10 word title]
DESCRIPTION: [Engaging 1-2 paragraph description that expands on the content]
TEASER: [2-3 sentence hook that creates curiosity]

GUIDELINES:
- Maintain the original message and key insights
- Make it fresh and engaging, not just a rewording
- Keep the tone consistent (${tone})
- For video/audio: focus on the spoken message
- Make titles clickable and SEO-friendly
- Descriptions should provide value
- Teasers should create curiosity without spoiling`,
        },
        {
          role: 'user',
          content: `Regenerate fresh content for this ${contentType} vibelog with ${tone} tone:

Current content:
"""
${contentForContext.substring(0, 2000)}
"""

${contentForContext.length > 2000 ? '\n[Content truncated for length]' : ''}

Generate new versions in the exact format:
TITLE: ...
DESCRIPTION: ...
TEASER: ...`,
        },
      ],
      temperature: 0.8, // Higher temperature for more variation
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Parse AI response
    const titleMatch = aiResponse.match(/TITLE:\s*(.+?)(?:\n|$)/i);
    const descriptionMatch = aiResponse.match(/DESCRIPTION:\s*([\s\S]+?)(?:\nTEASER:|$)/i);
    const teaserMatch = aiResponse.match(/TEASER:\s*([\s\S]+?)$/i);

    const suggestions: Record<string, string> = {};

    if (fields.includes('title') && titleMatch) {
      suggestions.title = titleMatch[1].trim();
    }

    if (fields.includes('description') && descriptionMatch) {
      suggestions.description = descriptionMatch[1].trim();
    }

    if (fields.includes('teaser') && teaserMatch) {
      suggestions.teaser = teaserMatch[1].trim();
    }

    if (fields.includes('slug') && suggestions.title) {
      suggestions.slug = generateUserSlug(suggestions.title, vibelogId);
    } else if (fields.includes('slug') && vibelog.title) {
      suggestions.slug = generateUserSlug(vibelog.title, vibelogId);
    }

    apiLogger.debug('AI regeneration complete', {
      suggestionsCount: Object.keys(suggestions).length,
    });

    return NextResponse.json({
      success: true,
      suggestions,
      current,
      tone,
      contentType,
    });
  } catch (error: unknown) {
    apiLogger.error('Regeneration failed', { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate content';
    return NextResponse.json(
      {
        error: 'Failed to regenerate content',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
