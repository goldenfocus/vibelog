import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vibelog/generate-ai-audio
 * AI audio generation has been disabled due to cost concerns
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI audio generation has been disabled',
      message:
        'This feature is temporarily unavailable due to cost concerns. Please use the record audio feature instead.',
    },
    { status: 503 }
  );
}
