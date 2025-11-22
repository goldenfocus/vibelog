import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { embedAllDocumentation, getDocumentationStats } from '@/lib/vibe-brain/knowledge-base';

/**
 * GET /api/admin/documentation/embed
 * Get statistics about embedded documentation
 */
export async function GET() {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get stats
    const stats = await getDocumentationStats();

    return NextResponse.json({
      stats,
      message: 'Documentation embedding statistics retrieved successfully',
    });
  } catch (error) {
    console.error('[ADMIN DOCS API] Error getting stats:', error);
    return NextResponse.json({ error: 'Failed to get documentation stats' }, { status: 500 });
  }
}

/**
 * POST /api/admin/documentation/embed
 * Re-embed all platform documentation
 * This should be called when documentation files are updated
 */
export async function POST() {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log(`[ADMIN DOCS API] Starting documentation embedding for user ${user.id}`);

    // Embed all documentation
    const result = await embedAllDocumentation();

    if (!result.success) {
      console.error('[ADMIN DOCS API] Embedding completed with errors:', result.errors);
      return NextResponse.json(
        {
          success: false,
          chunksCreated: result.chunksCreated,
          errors: result.errors,
          message: `Embedding completed with ${result.errors.length} errors`,
        },
        { status: 207 } // Multi-Status
      );
    }

    console.log(`[ADMIN DOCS API] Embedding successful: ${result.chunksCreated} chunks created`);

    return NextResponse.json({
      success: true,
      chunksCreated: result.chunksCreated,
      errors: [],
      message: `Successfully embedded ${result.chunksCreated} documentation chunks`,
    });
  } catch (error) {
    console.error('[ADMIN DOCS API] Error embedding documentation:', error);
    return NextResponse.json(
      {
        error: 'Failed to embed documentation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
