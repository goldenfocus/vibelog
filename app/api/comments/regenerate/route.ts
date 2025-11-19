import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/comments/regenerate
 * AI comment regeneration has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI comment regeneration has been disabled',
      message:
        'Automatic comment regeneration is temporarily unavailable due to cost concerns. Please edit your comment manually.',
    },
    { status: 503 }
  );
}
