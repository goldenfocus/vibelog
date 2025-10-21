import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateUserSlug } from '@/lib/seo';

export const runtime = 'nodejs';

interface ClaimVibelogRequest {
  sessionId: string;
  publicSlug: string;
}

/**
 * API endpoint to claim ownership of an anonymous VibeLog
 * Called after user signs in with the session ID and public slug
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔐 [CLAIM-VIBELOG] Starting ownership claim process...');

    // Parse request
    const body: ClaimVibelogRequest = await request.json();
    const { sessionId, publicSlug } = body;

    if (!sessionId || !publicSlug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId and publicSlug',
        },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'You must be logged in to claim a VibeLog',
        },
        { status: 401 }
      );
    }

    console.log('✅ [CLAIM-VIBELOG] User authenticated:', user.id);

    // Find the anonymous vibelog
    const { data: vibelog, error: findError } = await supabase
      .from('vibelogs')
      .select('*')
      .eq('public_slug', publicSlug)
      .eq('anonymous_session_id', sessionId)
      .is('user_id', null) // Must be anonymous
      .single();

    if (findError || !vibelog) {
      console.error('❌ [CLAIM-VIBELOG] VibeLog not found or already claimed:', findError);
      return NextResponse.json(
        {
          success: false,
          error: 'VibeLog not found, already claimed, or session ID mismatch',
        },
        { status: 404 }
      );
    }

    console.log('📝 [CLAIM-VIBELOG] Found anonymous VibeLog:', vibelog.id);

    // Get user's profile to generate username-based slug
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = profile?.username || user.email?.split('@')[0] || 'user';

    // Generate new user-based slug
    const userSlug = generateUserSlug(vibelog.title, vibelog.id);
    const newUrl = `/@${username}/${userSlug}`;

    // Update the vibelog with ownership
    const { error: updateError } = await supabase
      .from('vibelogs')
      .update({
        user_id: user.id,
        slug: userSlug,
        redirect_to: newUrl, // Set up 301 redirect from /v/[slug] to /@username/[slug]
        claimed_at: new Date().toISOString(),
        // Keep public_slug and anonymous_session_id for historical tracking
      })
      .eq('id', vibelog.id);

    if (updateError) {
      console.error('❌ [CLAIM-VIBELOG] Failed to update ownership:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to claim VibeLog. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log('✅ [CLAIM-VIBELOG] Ownership transferred successfully!');
    console.log('📍 [CLAIM-VIBELOG] New URL:', newUrl);

    // Update user's profile stats
    const { error: statsError } = await supabase.rpc('increment_vibelog_count', {
      user_id: user.id,
    });
    if (statsError) {
      console.warn('⚠️ [CLAIM-VIBELOG] Failed to update user stats:', statsError);
      // Non-critical, continue anyway
    }

    return NextResponse.json({
      success: true,
      message: 'VibeLog claimed successfully!',
      vibelogId: vibelog.id,
      newUrl: newUrl,
      oldUrl: `/v/${publicSlug}`,
      username: username,
    });
  } catch (error) {
    console.error('💥 [CLAIM-VIBELOG] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if a VibeLog is claimable
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const publicSlug = searchParams.get('publicSlug');
  const sessionId = searchParams.get('sessionId');

  if (!publicSlug || !sessionId) {
    return NextResponse.json(
      { success: false, error: 'Missing publicSlug or sessionId' },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: vibelog } = await supabase
    .from('vibelogs')
    .select('id, user_id, claimed_at')
    .eq('public_slug', publicSlug)
    .eq('anonymous_session_id', sessionId)
    .single();

  if (!vibelog) {
    return NextResponse.json({
      success: true,
      claimable: false,
      reason: 'VibeLog not found or session mismatch',
    });
  }

  const isClaimable = !vibelog.user_id && !vibelog.claimed_at;

  return NextResponse.json({
    success: true,
    claimable: isClaimable,
    alreadyClaimed: !!vibelog.user_id,
    vibelogId: vibelog.id,
  });
}
