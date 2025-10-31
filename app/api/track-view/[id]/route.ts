import { NextRequest } from 'next/server';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

// 1x1 transparent PNG pixel
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Increment view count using admin client (fire and forget)
    const adminSupabase = await createServerAdminClient();
    // Fire and forget - don't wait for response
    (async () => {
      try {
        const { error } = await adminSupabase.rpc('increment_vibelog_view_count', {
          p_vibelog_id: id,
        });
        if (error) {
          console.error('❌ Failed to increment view count:', error);
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('❌ Exception incrementing view count:', error);
      }
    })();

    // Return 1x1 transparent PNG pixel
    return new Response(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    // Even on error, return the pixel so the image loads
    console.error('❌ Error in track-view:', error);
    return new Response(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  }
}
