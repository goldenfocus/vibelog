import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/video/analyze
 * AI video analysis has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI video analysis has been disabled',
      message:
        'Automatic video analysis is temporarily unavailable due to cost concerns. Please add title and description manually.',
    },
    { status: 503 }
  );
}
