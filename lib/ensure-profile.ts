/**
 * App-Level Profile Safeguard
 *
 * This utility ensures that every authenticated user has a profile.
 * Call this after user signs in to catch any users whose profiles
 * failed to create during the signup trigger.
 *
 * Usage:
 * ```typescript
 * import { ensureProfileExists } from '@/lib/ensure-profile';
 *
 * // In AuthProvider after sign-in:
 * const user = await supabase.auth.getUser();
 * if (user) {
 *   await ensureProfileExists(supabase, user.id);
 * }
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface EnsureProfileResult {
  success: boolean;
  profileExists: boolean;
  created: boolean;
  error?: string;
}

/**
 * Ensures a profile exists for the given user ID.
 * If the profile is missing, attempts to create it via database function.
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's UUID
 * @returns Result object with success status and details
 */
export async function ensureProfileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<EnsureProfileResult> {
  try {
    // Check if profile exists
    const { data: profile, error: checkError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [PROFILE-CHECK] Error checking profile:', checkError);
      return {
        success: false,
        profileExists: false,
        created: false,
        error: checkError.message,
      };
    }

    if (profile) {
      // Profile exists
      if (profile.username === null) {
        console.warn('⚠️ [PROFILE-CHECK] Profile exists but username is NULL for user:', userId);
        // Could call a fix function here, but for now just log
      }
      return {
        success: true,
        profileExists: true,
        created: false,
      };
    }

    // Profile doesn't exist - try to create it via database function
    console.warn(
      '⚠️ [PROFILE-CHECK] Profile missing for user:',
      userId,
      '- attempting to create...'
    );

    const { data: created, error: createError } = await supabase.rpc('ensure_profile_exists', {
      user_id: userId,
    });

    if (createError) {
      console.error('❌ [PROFILE-CHECK] Failed to create profile:', createError);
      return {
        success: false,
        profileExists: false,
        created: false,
        error: createError.message,
      };
    }

    if (created) {
      console.log('✅ [PROFILE-CHECK] Successfully created missing profile for user:', userId);
      return {
        success: true,
        profileExists: true,
        created: true,
      };
    } else {
      console.error('❌ [PROFILE-CHECK] Database function returned false');
      return {
        success: false,
        profileExists: false,
        created: false,
        error: 'Database function failed to create profile',
      };
    }
  } catch (err) {
    console.error('❌ [PROFILE-CHECK] Unexpected error:', err);
    return {
      success: false,
      profileExists: false,
      created: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Lightweight check - just verifies profile exists without creating.
 * Use this for fast checks where you don't want to trigger profile creation.
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's UUID
 * @returns True if profile exists, false otherwise
 */
export async function checkProfileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[PROFILE-CHECK] Error:', error);
      return false;
    }

    return data !== null;
  } catch (err) {
    console.error('[PROFILE-CHECK] Unexpected error:', err);
    return false;
  }
}
