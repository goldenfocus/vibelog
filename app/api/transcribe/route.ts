import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('Transcribing audio file:', audioFile.name, audioFile.size, 'bytes');

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