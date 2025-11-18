import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { createServerSupabaseClient } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { vibelogId } = await request.json();

    if (!vibelogId) {
      return NextResponse.json({ error: 'Vibelog ID is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get the vibelog
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('id, title, content, audio_url, ai_audio_url')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Check if AI audio already exists
    if (vibelog.ai_audio_url) {
      return NextResponse.json({
        success: true,
        message: 'AI audio already exists',
        audioUrl: vibelog.ai_audio_url,
      });
    }

    // If original audio exists, we don't need to generate AI audio
    // (user can toggle between original and AI narration)
    // But for now, let's generate it anyway for comparison

    // Prepare the text content for TTS
    const textContent = `${vibelog.title}. ${vibelog.content}`;

    // Truncate if too long (OpenAI TTS has a 4096 character limit)
    const truncatedContent = textContent.slice(0, 4000);

    // Generate speech using OpenAI TTS
    console.log('🎙️ Generating AI narration for vibelog:', vibelog.id);

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // High-quality model
      voice: 'nova', // Natural, warm voice
      input: truncatedContent,
      speed: 1.0,
    });

    // Convert response to buffer
    const arrayBuffer = await mp3Response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `ai-narration-${vibelog.id}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage.from('audio').upload(fileName, buffer, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
    });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('audio').getPublicUrl(fileName);

    // Update vibelog with AI audio URL
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({ ai_audio_url: publicUrl })
      .eq('id', vibelogId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update vibelog' }, { status: 500 });
    }

    console.log('✅ AI narration generated successfully:', publicUrl);

    return NextResponse.json({
      success: true,
      message: 'AI audio generated successfully',
      audioUrl: publicUrl,
    });
  } catch (error) {
    console.error('❌ Error generating AI audio:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate AI audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
