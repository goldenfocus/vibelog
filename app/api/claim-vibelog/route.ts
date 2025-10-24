import { NextRequest, NextResponse } from 'next/server';

import { generateUserSlug } from '@/lib/seo';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

interface ClaimVibelogRequest {
  sessionId: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔐 [CLAIM-VIBELOG] Starting claim process...');

    const body: ClaimVibelogRequest = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'Session ID required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 [CLAIM-VIBELOG] Claiming sessionId:', sessionId, 'for user:', user.id);

    const { data: anonymousVibelogs, error: fetchError } = await supabase
      .from('vibelogs')
      .select('id, title')
      .eq('anonymous_session_id', sessionId)
      .is('user_id', null);

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    if (!anonymousVibelogs || anonymousVibelogs.length === 0) {
      return NextResponse.json({ success: true, claimedCount: 0, message: 'No vibelogs to claim' });
    }

    console.log(`📦 [CLAIM-VIBELOG] Found ${anonymousVibelogs.length} vibelogs to claim`);

    const claimedIds: string[] = [];

    for (const vibelog of anonymousVibelogs) {
      const userSlug = generateUserSlug(vibelog.title, vibelog.id);

      const { error: updateError } = await supabase
        .from('vibelogs')
        .update({ user_id: user.id, slug: userSlug, public_slug: null })
        .eq('id', vibelog.id);

      if (!updateError) {
        claimedIds.push(vibelog.id);
      }
    }

    console.log(`✅ [CLAIM-VIBELOG] Claimed ${claimedIds.length} vibelogs`);

    return NextResponse.json({
      success: true,
      claimedCount: claimedIds.length,
      claimedIds,
      message: `Claimed ${claimedIds.length} vibelog${claimedIds.length === 1 ? '' : 's'}!`,
    });
  } catch (error) {
    console.error('❌ [CLAIM-VIBELOG] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
