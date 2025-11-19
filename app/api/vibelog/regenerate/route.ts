import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/vibelog/regenerate
 * AI vibelog regeneration has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI vibelog regeneration has been disabled',
      message:
        'Automatic vibelog regeneration is temporarily unavailable due to cost concerns. Please edit fields manually.',
    },
    { status: 503 }
  );
}
