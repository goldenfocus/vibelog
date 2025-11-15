import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Generate missing TTS audio for vibelogs that don't have audio_url
 * DISABLED: We no longer generate TTS audio - use only creator's original audio
 */
export async function POST(_request: NextRequest) {
  // DISABLED: No longer generating TTS audio
  return NextResponse.json({
    success: false,
    message: 'TTS audio generation has been disabled. Use only original creator audio.',
    disabled: true,
  });
}
