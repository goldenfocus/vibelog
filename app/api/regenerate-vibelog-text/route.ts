import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/regenerate-vibelog-text
 * AI text regeneration has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI text regeneration has been disabled',
      message:
        'Automatic text regeneration is temporarily unavailable due to cost concerns. Please edit your content manually.',
    },
    { status: 503 }
  );
}
