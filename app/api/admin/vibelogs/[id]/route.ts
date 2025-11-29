/**
 * Admin Vibelogs API
 * Edit and delete any vibelog (bypasses RLS)
 */

import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin, logAdminAction, getClientIp, getUserAgent } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * PATCH /api/admin/vibelogs/[id]
 * Edit any vibelog
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get vibelog ID from params
    const { id } = await params;

    // Get update data
    const updates = await request.json();

    // Update vibelog with admin client (bypasses RLS)
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient
      .from('vibelogs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Admin Vibelogs API] Error updating vibelog:', error);
      return NextResponse.json({ error: 'Failed to update vibelog' }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(user.id, 'vibelog_edit', {
      targetVibelogId: id,
      changes: updates,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      vibelog: data,
    });
  } catch (error) {
    console.error('[Admin Vibelogs API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to update vibelog' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/vibelogs/[id]
 * Delete any vibelog (admin only)
 *
 * Uses the centralized delete service for complete cleanup.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Admin Delete] Starting delete request');

    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('[Admin Delete] User fetched:', {
      userId: user?.id,
      email: user?.email,
    });

    // Require admin permissions
    await requireAdmin(user?.id);

    console.log('[Admin Delete] Admin check passed');

    if (!user) {
      console.error('[Admin Delete] No user after admin check (unexpected)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vibelog ID from params
    const { id: vibelogId } = await params;

    console.log('[Admin Delete] Calling delete service:', {
      vibelogId,
      userId: user.id,
      userIsAdmin: true,
    });

    // Import and use centralized delete service
    const { deleteVibelog } = await import('@/lib/services/vibelog-delete-service');

    // Call centralized delete service (handles all cleanup + audit logging)
    const result = await deleteVibelog({
      vibelogId,
      userId: user.id,
      userIsAdmin: true, // Already verified by requireAdmin()
      request,
    });

    console.log('[Admin Delete] Service result:', result);

    // Map result to HTTP response
    if (!result.success) {
      const statusCode =
        result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500;

      return NextResponse.json(
        {
          error: result.message,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      storageWarnings: result.storageWarnings,
    });
  } catch (error) {
    console.error('[Admin Vibelogs API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to delete vibelog' }, { status: 500 });
  }
}
