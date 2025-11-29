/**
 * Admin Authentication Utilities
 * Server-side only utilities for checking admin permissions
 */

import 'server-only';

import { createServerSupabaseClient } from './supabase';
import { createServerAdminClient } from './supabaseAdmin';

/**
 * Check if a user has admin privileges
 * @param userId The user ID to check
 * @returns true if the user is an admin, false otherwise
 *
 * IMPORTANT: Uses admin client to bypass RLS policies.
 * Admin checks must not be constrained by RLS since we need to know
 * if a user is an admin to make authorization decisions.
 */
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    // Use admin client to bypass RLS - admin status checks must be authoritative
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Admin] Error checking admin status:', error);
      return false;
    }

    const result = data?.is_admin === true;
    console.log('[Admin] Admin status check:', { userId, isAdmin: result });
    return result;
  } catch (error) {
    console.error('[Admin] Exception checking admin status:', error);
    return false;
  }
}

/**
 * Check if a user has admin privileges by email
 * Useful for initial setup before profiles are created
 *
 * IMPORTANT: Uses admin client to bypass RLS policies.
 */
export async function isAdminByEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) {
    return false;
  }

  try {
    // Use admin client to bypass RLS - admin status checks must be authoritative
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('email', email)
      .single();

    if (error) {
      console.error('[Admin] Error checking admin status by email:', error);
      return false;
    }

    const result = data?.is_admin === true;
    console.log('[Admin] Admin status check by email:', { email, isAdmin: result });
    return result;
  } catch (error) {
    console.error('[Admin] Exception checking admin status by email:', error);
    return false;
  }
}

/**
 * Require admin privileges or throw an error
 * Use this at the start of admin-only API routes
 * @param userId The user ID to check
 * @throws Error if user is not an admin
 */
export async function requireAdmin(userId: string | null | undefined): Promise<void> {
  if (!userId) {
    throw new Error('Unauthorized: No user ID provided');
  }

  const userIsAdmin = await isAdmin(userId);
  if (!userIsAdmin) {
    throw new Error('Forbidden: Admin privileges required');
  }
}

/**
 * Get admin profile with full details
 * @param userId The user ID to fetch
 * @returns Profile data if admin, null otherwise
 */
export async function getAdminProfile(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, header_image, default_writing_tone, keep_filler_words, is_public, total_vibelogs, total_views, created_at, updated_at'
    )
    .eq('id', userId)
    .eq('is_admin', true)
    .single();

  if (error) {
    console.error('[Admin] Error fetching admin profile:', error);
    return null;
  }

  return data;
}

/**
 * Log an admin action to the audit log
 * @param adminUserId The admin performing the action
 * @param action The action being performed
 * @param details Additional details about the action
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  details?: {
    targetUserId?: string;
    targetVibelogId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    const adminClient = await createServerAdminClient();

    // Use the database function to log the action
    const { data, error } = await adminClient.rpc('log_admin_action', {
      p_admin_user_id: adminUserId,
      p_action: action,
      p_target_user_id: details?.targetUserId || null,
      p_target_vibelog_id: details?.targetVibelogId || null,
      p_details: details?.changes ? JSON.stringify(details.changes) : null,
      p_ip_address: details?.ipAddress || null,
      p_user_agent: details?.userAgent || null,
    });

    if (error) {
      console.error('[Admin] Error logging admin action:', error);
      throw error;
    }

    console.log(`[Admin] Logged action: ${action} by ${adminUserId}`);
    return data;
  } catch (error) {
    console.error('[Admin] Exception logging admin action:', error);
    throw error;
  }
}

/**
 * Get recent admin actions for the audit log
 * @param limit Number of actions to fetch (default: 50)
 * @param adminUserId Optional: filter by specific admin user
 */
export async function getAdminAuditLog(limit: number = 50, adminUserId?: string) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('admin_audit_log')
      .select(
        `
        *,
        admin_user:profiles!admin_user_id(id, display_name, email),
        target_user:profiles!target_user_id(id, display_name, email),
        target_vibelog:vibelogs!target_vibelog_id(id, title)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Admin] Error fetching audit log:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[Admin] Exception fetching audit log:', error);
    throw error;
  }
}

/**
 * Helper to extract IP address from request
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Helper to get user agent from request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}
