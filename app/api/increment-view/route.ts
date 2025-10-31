import { NextRequest, NextResponse } from 'next/server';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { vibelogId } = await request.json();

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId required' }, { status: 400 });
    }

    const adminSupabase = await createServerAdminClient();
    const { error } = await adminSupabase.rpc('increment_vibelog_view_count', {
      p_vibelog_id: vibelogId,
    });

    if (error) {
      console.error('❌ RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ View count incremented for vibelog:', vibelogId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Exception incrementing view:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
