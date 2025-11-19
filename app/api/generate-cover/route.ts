import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/generate-cover
 * AI cover generation has been disabled due to cost concerns
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'AI cover generation has been disabled',
      message:
        'Automatic cover image generation is temporarily unavailable due to cost concerns. Please upload a cover image manually.',
    },
    { status: 503 }
  );
}
