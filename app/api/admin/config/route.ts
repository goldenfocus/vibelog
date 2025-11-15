/**
 * Admin Config API
 * Manage application configuration (quotas, limits, alerts)
 */

import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin, logAdminAction, getClientIp, getUserAgent } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * GET /api/admin/config
 * Get all configuration settings
 */
export async function GET() {
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

    // Get all config with admin client
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient.from('app_config').select('*').order('key');

    if (error) {
      console.error('[Admin Config API] Error fetching config:', error);
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    // Convert array of key-value pairs to object
    const config: Record<string, unknown> = {};
    data.forEach(item => {
      config[item.key] = item.value;
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[Admin Config API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/config
 * Update configuration settings
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

    // Get config updates
    const updates: Record<string, unknown> = await request.json();

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update each config key with admin client (bypasses RLS)
    const adminClient = await createServerAdminClient();
    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      const { data, error } = await adminClient
        .from('app_config')
        .upsert(
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          }
        )
        .select()
        .single();

      if (error) {
        console.error(`[Admin Config API] Error updating ${key}:`, error);
        return NextResponse.json({ error: `Failed to update config key: ${key}` }, { status: 500 });
      }

      results.push(data);
    }

    // Log admin action
    await logAdminAction(user.id, 'config_update', {
      changes: updates,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      updated: results,
    });
  } catch (error) {
    console.error('[Admin Config API] Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
