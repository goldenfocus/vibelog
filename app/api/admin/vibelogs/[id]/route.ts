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
 * Delete any vibelog
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get vibelog details before deleting (for audit log)
    const adminClient = await createServerAdminClient();
    const { data: vibelog } = await adminClient
      .from('vibelogs')
      .select('user_id, title, slug')
      .eq('id', id)
      .single();

    // Delete vibelog with admin client (bypasses RLS)
    const { error } = await adminClient.from('vibelogs').delete().eq('id', id);

    if (error) {
      console.error('[Admin Vibelogs API] Error deleting vibelog:', error);
      return NextResponse.json({ error: 'Failed to delete vibelog' }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(user.id, 'vibelog_delete', {
      targetVibelogId: id,
      targetUserId: vibelog?.user_id,
      changes: {
        title: vibelog?.title,
        slug: vibelog?.slug,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Vibelog deleted successfully',
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
