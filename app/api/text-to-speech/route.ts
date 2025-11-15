import { NextRequest, NextResponse } from 'next/server';

/**
 * Text-to-Speech API endpoint
 * DISABLED: We no longer generate TTS audio - use only creator's original audio
 */
export async function POST(_request: NextRequest) {
  // DISABLED: No longer generating TTS audio - use only creator's original audio
  return NextResponse.json(
    {
      error: 'TTS generation disabled',
      message: 'TTS audio generation has been disabled. Use only original creator audio.',
      disabled: true,
    },
    { status: 410 }
  ); // 410 Gone - resource permanently removed
}
