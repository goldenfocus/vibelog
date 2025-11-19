import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime for better performance with larger payloads
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/transcribe
 * Transcription has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Transcription service has been disabled',
      message:
        'Audio transcription is temporarily unavailable due to cost concerns. Please type your content directly.',
    },
    { status: 503 }
  );
}
