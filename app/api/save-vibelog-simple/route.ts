import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

interface SaveVibelogRequest {
  title: string;
  content: string;
  transcription?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveVibelogRequest = await request.json();
    const { title, content, transcription } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // For anonymous users, use NULL for user_id
    // In production, this should be the real user_id for logged-in users
    const userId = null; // NULL for anonymous users

    // Prepare the data for insertion - using only existing columns
    const vibelogData = {
      user_id: userId, // NULL for anonymous users
      title: title.trim(),
      content: content.trim(),
      transcription: transcription?.trim() || '',
      language: 'en',
      word_count: content.split(' ').length,
      read_time: Math.max(1, Math.ceil(content.split(' ').length / 200)), // 200 words per minute
      tags: ['auto-generated'],
      is_public: false,
      is_published: false,
      created_at: new Date().toISOString(),
    };

    console.log('Attempting to insert vibelog:', {
      title: vibelogData.title,
      contentLength: vibelogData.content.length,
      wordCount: vibelogData.word_count
    });

    // Insert into database
    const { data, error } = await supabase
      .from('vibelogs')
      .insert([vibelogData])
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save vibelog', details: error },
        { status: 500 }
      );
    }

    console.log('Vibelog saved successfully:', data.id);

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