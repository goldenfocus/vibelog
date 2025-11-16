import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase';

type Profile = {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  header_image?: string;
  [key: string]: unknown;
} | null;

/**
 * Profile hook - fetches user profile
 * Separate from auth for performance
 * Only fetches when needed
 * Provides refetch function for manual refresh
 */
export function useProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(
          'id, username, display_name, avatar_url, bio, header_image, default_writing_tone, keep_filler_words, is_public, total_vibelogs, total_views, created_at, updated_at'
        )
        .eq('id', userId)
        .single();

      if (fetchError) {
        // Handle common errors gracefully
        const logContext = { userId, code: fetchError.code };

        if (fetchError.code === 'PGRST116') {
          logger.info('No profile found (normal for new users)', logContext);
        } else if (fetchError.code === '42501' || fetchError.code === 'PGRST204') {
          logger.warn('Profile restricted by RLS', logContext);
        } else {
          logger.error('Profile fetch error', { ...logContext, error: fetchError });
          setError(fetchError.message);
        }
        setProfile(null);
      } else {
        setProfile(data);
        setError(null);
      }

      setLoading(false);
    } catch (err) {
      logger.error('Profile fetch exception', { userId, error: err });
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProfile(null);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
