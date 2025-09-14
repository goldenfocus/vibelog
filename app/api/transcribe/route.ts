import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('Transcribing audio file:', audioFile.name, audioFile.size, 'bytes');

    // Check if we have a real API key, otherwise return mock response for testing
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key') {
      console.log('🧪 Using mock transcription for development/testing');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return NextResponse.json({ 
        transcription: "Today I want to share some thoughts about the future of voice technology and how it's changing the way we create content. Speaking is our most natural form of communication and I believe we're moving toward a world where your voice becomes your pen."
      });
    }

    // Initialize OpenAI client only when we have a real API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Convert File to format OpenAI expects
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // Remove language parameter to enable auto-detection
      response_format: 'text',
    });

    console.log('Transcription completed:', transcription.substring(0, 100) + '...');

    return NextResponse.json({ 
      transcription,
      success: true 
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' }, 
      { status: 500 }
    );
  }
}