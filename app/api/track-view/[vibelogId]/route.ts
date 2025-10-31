import { NextRequest, NextResponse } from 'next/server';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

// GET endpoint for tracking pixel - returns a 1x1 transparent pixel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vibelogId: string }> }
) {
  try {
    const { vibelogId } = await params;

    // Increment view count in background
    const adminSupabase = await createServerAdminClient();
    adminSupabase
      .rpc('increment_vibelog_view_count', {
        p_vibelog_id: vibelogId,
      })
      .then(({ error }) => {
        if (error) {
          console.error('❌ View tracking error:', error);
        } else {
          console.log('✅ View tracked for:', vibelogId);
        }
      })
      .catch(err => console.error('❌ View tracking exception:', err));

    // Return 1x1 transparent pixel immediately (don't wait for DB)
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('❌ Track view error:', error);
    // Still return a pixel even on error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    return new NextResponse(pixel, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
