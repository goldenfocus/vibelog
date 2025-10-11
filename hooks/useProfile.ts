import { useEffect, useState } from 'react';

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
 */
export function useProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!mounted) {
          return;
        }

        if (fetchError) {
          // Handle common errors gracefully
          if (fetchError.code === 'PGRST116') {
            console.log('No profile found (normal for new users)');
          } else if (fetchError.code === '42501' || fetchError.code === 'PGRST204') {
            console.log('Profile restricted by RLS');
          } else {
            console.warn('Profile fetch error:', fetchError);
            setError(fetchError.message);
          }
          setProfile(null);
        } else {
          setProfile(data);
          setError(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Profile fetch exception:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setProfile(null);
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { profile, loading, error };
}
