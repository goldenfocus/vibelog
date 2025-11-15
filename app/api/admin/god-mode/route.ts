/**
 * God Mode API Route
 * Allows admins to enter/exit god mode (viewing site as another user)
 */

import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin, getClientIp, getUserAgent } from '@/lib/auth-admin';
import { enterGodMode, exitGodMode } from '@/lib/godMode';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/admin/god-mode
 * Enter god mode as another user
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Require admin permissions
    await requireAdmin(user?.id);

    // Get target user ID from request
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Enter god mode
    await enterGodMode(user.id, targetUserId, getClientIp(request), getUserAgent(request));

    return NextResponse.json({
      success: true,
      message: `Entered God Mode as user ${targetUserId}`,
    });
  } catch (error) {
    console.error('[GodMode API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to enter God Mode' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/god-mode
 * Exit god mode and return to admin account
 */
export async function DELETE() {
  try {
    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Require admin permissions
    await requireAdmin(user?.id);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Exit god mode
    await exitGodMode(user.id);

    return NextResponse.json({
      success: true,
      message: 'Exited God Mode',
    });
  } catch (error) {
    console.error('[GodMode API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to exit God Mode' }, { status: 500 });
  }
}
