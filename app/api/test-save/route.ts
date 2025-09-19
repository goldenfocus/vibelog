import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  try {
    console.log('Test save API called');

    const supabase = await createServerSupabaseClient();
    console.log('Supabase client created');

    // Test connection by selecting from a simple table
    const { data: testData, error: testError } = await supabase
      .from('rate_limits')
      .select('*')
      .limit(1);

    console.log('Test query result:', { testData, testError });

    // Try to insert a simple vibelog
    const testVibelog = {
      title: 'Test Vibelog',
      content: '# Test\n\nThis is a test vibelog content.',
      transcription: 'This is a test vibelog content.',
      session_id: 'test_session_' + Date.now(),
      language: 'en',
      word_count: 6,
      read_time: 1,
      tags: ['test'],
      is_public: false,
      is_published: false,
      created_at: new Date().toISOString(),
    };

    console.log('Attempting to insert:', testVibelog);

    const { data, error } = await supabase
      .from('vibelogs')
      .insert([testVibelog])
      .select('*')
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Test save successful'
    });

  } catch (error) {
    console.error('Test save error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}