import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/generate-vibelog
 * AI vibelog generation has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI vibelog generation has been disabled',
      message:
        'Automatic content generation is temporarily unavailable due to cost concerns. Please type your content directly or use the record audio feature.',
    },
    { status: 503 }
  );
}
