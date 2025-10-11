import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

interface SaveVibelogRequest {
  title: string;
  content: string;
  transcription?: string;
  coverImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  sessionId?: string; // For anonymous users ONLY - never trust userId from client
}

/**
 * Generate teaser from markdown content (first 2-3 paragraphs)
 */
function generateTeaser(content: string): string {
  // Split by double newlines to get paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

  // Take first 2-3 paragraphs (aim for ~300 chars minimum)
  let teaser = '';
  let paraCount = 0;

  for (const para of paragraphs) {
    teaser += para + '\n\n';
    paraCount++;

    // Stop after 2-3 paragraphs or ~400 chars
    if (paraCount >= 2 && teaser.length >= 300) {
      break;
    }
    if (paraCount >= 3) {
      break;
    }
  }

  return teaser.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveVibelogRequest = await request.json();
    const { title, content, transcription, coverImage, sessionId } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // SECURITY: Get user from session, NEVER trust client-supplied userId
    const supabaseClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    let userId: string | null = null;
    let supabase;

    if (user) {
      // Authenticated user - use their verified ID from session
      userId = user.id;
      supabase = supabaseClient;
      console.log('✅ Authenticated save for user:', userId);
    } else if (sessionId) {
      // Anonymous user - use admin client to bypass RLS for session-based saves
      supabase = await createServerAdminClient();
      console.log('✅ Anonymous save with session:', sessionId);
    } else {
      return NextResponse.json(
        { error: 'Must be authenticated or provide a valid session' },
        { status: 401 }
      );
    }

    // Generate teaser from content
    const teaser = generateTeaser(content);

    // Prepare the data for insertion
    const vibelogData = {
      title: title.trim(),
      content: content.trim(),
      teaser: teaser,
      transcription: transcription?.trim() || '',
      cover_image_url: coverImage?.url || null,
      user_id: userId, // SECURITY: Only use server-verified userId
      session_id: sessionId || null,
      // Auto-publish all vibelogs to community
      is_published: true,
      is_public: true,
      published_at: new Date().toISOString(),
      language: 'en', // TODO: detect from content or pass from client
      word_count: content.split(/\s+/).length,
      read_time: Math.ceil(content.split(/\s+/).length / 200), // ~200 words per minute
      tags: [], // TODO: extract from content or pass from client
    };

    // Insert into database
    const { data, error } = await supabase
      .from('vibelogs')
      .insert([vibelogData])
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save vibelog', details: error.message },
        { status: 500 }
      );
    }

    // Return success with the saved vibelog data
    return NextResponse.json({
      success: true,
      vibelog: data,
      message: 'Vibelog saved and published successfully',
    });
  } catch (error) {
    console.error('Save vibelog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
