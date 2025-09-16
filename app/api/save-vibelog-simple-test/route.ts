import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Use only columns that definitely exist
    const basicData = {
      title: body.title || 'Test Vibelog',
      content: body.content,
      transcription: body.transcription || '',
      language: 'en',
      word_count: body.content.split(' ').length,
      read_time: Math.max(1, Math.ceil(body.content.split(' ').length / 200)),
      tags: [],
      is_public: false,
      is_published: false,
      user_id: body.userId || null,
      session_id: body.sessionId || `test_${Date.now()}`, // Add session_id to satisfy constraint
      view_count: 0,
      share_count: 0,
      like_count: 0
    };

    console.log('🔍 [TEST-SAVE] Attempting insert with basic data:', Object.keys(basicData));

    const { data, error } = await supabase
      .from('vibelogs')
      .insert([basicData])
      .select('id')
      .single();

    if (error) {
      console.error('❌ [TEST-SAVE] Insert failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: error.hint,
        details: error.details
      }, { status: 500 });
    }

    console.log('✅ [TEST-SAVE] Success! Vibelog ID:', data.id);
    return NextResponse.json({
      success: true,
      vibelogId: data.id,
      message: 'Vibelog saved successfully!'
    });

  } catch (err) {
    console.error('❌ [TEST-SAVE] Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: 'Unexpected server error'
    }, { status: 500 });
  }
}