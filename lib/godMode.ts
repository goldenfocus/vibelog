/**
 * God Mode Utilities
 * Allows admins to view the site as another user for debugging and support
 */

import 'server-only';

import { cookies } from 'next/headers';

import { logAdminAction } from './auth-admin';
import { createServerAdminClient } from './supabaseAdmin';

const GOD_MODE_COOKIE = 'vibelog_god_mode';
const GOD_MODE_EXPIRY_HOURS = 1; // God mode sessions expire after 1 hour

interface GodModeSession {
  adminUserId: string; // The admin who entered god mode
  targetUserId: string; // The user being impersonated
  startedAt: number; // Timestamp when god mode was entered
  expiresAt: number; // Timestamp when god mode expires
}

/**
 * Enter God Mode as another user
 * @param adminUserId The admin user's ID
 * @param targetUserId The user to impersonate
 * @param ipAddress Optional IP address for audit log
 * @param userAgent Optional user agent for audit log
 */
export async function enterGodMode(
  adminUserId: string,
  targetUserId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Create god mode session
  const now = Date.now();
  const expiresAt = now + GOD_MODE_EXPIRY_HOURS * 60 * 60 * 1000;

  const session: GodModeSession = {
    adminUserId,
    targetUserId,
    startedAt: now,
    expiresAt,
  };

  // Set secure cookie (NOT httpOnly so client can read it)
  const cookieStore = await cookies();
  cookieStore.set(GOD_MODE_COOKIE, JSON.stringify(session), {
    httpOnly: false, // Allow client-side reading for AuthProvider
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GOD_MODE_EXPIRY_HOURS * 60 * 60, // 1 hour
    path: '/',
  });

  // Log admin action
  await logAdminAction(adminUserId, 'god_mode_enter', {
    targetUserId,
    ipAddress,
    userAgent,
    changes: {
      targetUserId,
      expiresAt: new Date(expiresAt).toISOString(),
    },
  });

  console.log(`[GodMode] Admin ${adminUserId} entered god mode as ${targetUserId}`);
}

/**
 * Exit God Mode and return to admin account
 * @param adminUserId The admin user's ID
 */
export async function exitGodMode(adminUserId: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GOD_MODE_COOKIE);

  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value) as GodModeSession;

      // Log admin action
      await logAdminAction(adminUserId, 'god_mode_exit', {
        targetUserId: session.targetUserId,
        changes: {
          duration: Date.now() - session.startedAt,
        },
      });
    } catch (error) {
      console.error('[GodMode] Error parsing session cookie:', error);
    }
  }

  // Delete cookie
  cookieStore.delete(GOD_MODE_COOKIE);

  console.log(`[GodMode] Admin ${adminUserId} exited god mode`);
}

/**
 * Check if currently in God Mode
 * @returns God mode session if active, null otherwise
 */
export async function getGodModeSession(): Promise<GodModeSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(GOD_MODE_COOKIE);

    if (!sessionCookie) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value) as GodModeSession;

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      console.log('[GodMode] Session expired, cleaning up');
      cookieStore.delete(GOD_MODE_COOKIE);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[GodMode] Error reading god mode session:', error);
    return null;
  }
}

/**
 * Check if currently in God Mode (boolean)
 */
export async function isInGodMode(): Promise<boolean> {
  const session = await getGodModeSession();
  return session !== null;
}

/**
 * Get the user being impersonated in God Mode
 * @returns Target user profile if in god mode, null otherwise
 */
export async function getGodModeTarget(): Promise<any | null> {
  const session = await getGodModeSession();
  if (!session) {
    return null;
  }

  try {
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select(
        'id, username, display_name, avatar_url, bio, header_image, website, twitter_handle, github_handle, default_writing_tone, keep_filler_words, twitter_post_format, twitter_custom_template, is_admin, is_public, total_vibelogs, total_views, created_at, updated_at'
      )
      .eq('id', session.targetUserId)
      .single();

    if (error) {
      console.error('[GodMode] Error fetching target user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[GodMode] Exception fetching target user:', error);
    return null;
  }
}

/**
 * Get the admin user who entered God Mode
 * @returns Admin user profile if in god mode, null otherwise
 */
export async function getGodModeAdmin(): Promise<any | null> {
  const session = await getGodModeSession();
  if (!session) {
    return null;
  }

  try {
    const adminClient = await createServerAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select(
        'id, username, display_name, avatar_url, bio, header_image, website, twitter_handle, github_handle, default_writing_tone, keep_filler_words, twitter_post_format, twitter_custom_template, is_admin, is_public, total_vibelogs, total_views, created_at, updated_at'
      )
      .eq('id', session.adminUserId)
      .single();

    if (error) {
      console.error('[GodMode] Error fetching admin user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[GodMode] Exception fetching admin user:', error);
    return null;
  }
}

/**
 * Get session duration in milliseconds
 */
export async function getGodModeSessionDuration(): Promise<number | null> {
  const session = await getGodModeSession();
  if (!session) {
    return null;
  }

  return Date.now() - session.startedAt;
}

/**
 * Get time remaining in session (milliseconds)
 */
export async function getGodModeTimeRemaining(): Promise<number | null> {
  const session = await getGodModeSession();
  if (!session) {
    return null;
  }

  const remaining = session.expiresAt - Date.now();
  return Math.max(0, remaining);
}
