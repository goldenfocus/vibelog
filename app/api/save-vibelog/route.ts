import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

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
  userId?: string; // Optional - for logged-in users
  sessionId?: string; // For anonymous users
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveVibelogRequest = await request.json();
    const { title, content, transcription, coverImage, userId, sessionId } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Prepare the data for insertion
    const vibelogData = {
      title: title.trim(),
      content: content.trim(),
      transcription: transcription?.trim() || null,
      cover_image_url: coverImage?.url || null,
      cover_image_alt: coverImage?.alt || null,
      cover_image_width: coverImage?.width || null,
      cover_image_height: coverImage?.height || null,
      user_id: userId || null,
      session_id: sessionId || null,
      created_at: new Date().toISOString(),
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
        { error: 'Failed to save vibelog' },
        { status: 500 }
      );
    }

    // Return success with the saved vibelog data
    return NextResponse.json({
      success: true,
      vibelog: data,
      message: 'Vibelog saved successfully'
    });

  } catch (error) {
    console.error('Save vibelog error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}