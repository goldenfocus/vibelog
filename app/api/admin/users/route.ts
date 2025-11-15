/**
 * Admin Users API
 * List and manage all users
 */

import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin, logAdminAction, getClientIp, getUserAgent } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * GET /api/admin/users
 * List all users with stats
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Require admin permissions
    await requireAdmin(user?.id);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query users with admin client (bypasses RLS)
    const adminClient = await createServerAdminClient();
    let query = adminClient
      .from('profiles')
      .select(
        `
        id,
        username,
        display_name,
        email,
        avatar_url,
        is_admin,
        total_vibelogs,
        total_views,
        created_at,
        last_sign_in_at
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('[Admin Users API] Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get total count
    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      users,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Admin Users API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user (e.g., toggle admin status)
 */
export async function PATCH(request: NextRequest) {
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

    // Get update data
    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user with admin client
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Admin Users API] Error updating user:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(user.id, 'user_update', {
      targetUserId: userId,
      changes: updates,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error('[Admin Users API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
