import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase';

export type WritingTone =
  | 'authentic'
  | 'professional'
  | 'casual'
  | 'humorous'
  | 'inspiring'
  | 'analytical'
  | 'storytelling'
  | 'dramatic'
  | 'poetic';

export interface ToneSettings {
  tone: WritingTone;
}

export interface UseToneSettingsReturn extends ToneSettings {
  loading: boolean;
  error: string | null;
  setTone: (tone: WritingTone) => Promise<void>;
  updateSettings: (settings: Partial<ToneSettings>) => Promise<void>;
}

const STORAGE_KEY = 'vibelog_tone_settings';
const DEFAULT_SETTINGS: ToneSettings = {
  tone: 'authentic',
};

/**
 * Hook for managing user tone and content generation preferences
 *
 * Features:
 * - Logged-in users: Syncs with database profile
 * - Anonymous users: Stores in localStorage
 * - Provides optimistic updates
 * - Auto-syncs when user logs in
 *
 * @example
 * ```tsx
 * const { tone, setTone } = useToneSettings();
 *
 * // Change tone
 * await setTone('humorous');
 *
 * // Update multiple settings at once
 * await updateSettings({ tone: 'professional' });
 * ```
 */
export function useToneSettings(): UseToneSettingsReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ToneSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from localStorage for anonymous users
  const loadFromLocalStorage = useCallback((): ToneSettings => {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          tone: parsed.tone || DEFAULT_SETTINGS.tone,
        };
      }
    } catch (err) {
      console.warn('Failed to load tone settings from localStorage:', err);
    }

    return DEFAULT_SETTINGS;
  }, []);

  // Save settings to localStorage for anonymous users
  const saveToLocalStorage = useCallback((newSettings: ToneSettings) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.warn('Failed to save tone settings to localStorage:', err);
    }
  }, []);

  // Fetch settings from database for logged-in users
  useEffect(() => {
    let mounted = true;

    const fetchSettings = async () => {
      if (!user) {
        // Anonymous user - load from localStorage
        const localSettings = loadFromLocalStorage();
        if (mounted) {
          setSettings(localSettings);
          setLoading(false);
        }
        return;
      }

      // Logged-in user - fetch from database
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('default_writing_tone')
          .eq('id', user.id)
          .single();

        if (!mounted) {
          return;
        }

        if (fetchError) {
          console.warn('Failed to fetch tone settings:', fetchError);
          setError(fetchError.message);
          // Fallback to localStorage
          const localSettings = loadFromLocalStorage();
          setSettings(localSettings);
          setLoading(false);
          return;
        }

        if (data) {
          const dbSettings: ToneSettings = {
            tone: (data.default_writing_tone as WritingTone) || DEFAULT_SETTINGS.tone,
          };
          setSettings(dbSettings);
          setError(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch tone settings:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          // Fallback to localStorage
          const localSettings = loadFromLocalStorage();
          setSettings(localSettings);
          setLoading(false);
        }
      }
    };

    setLoading(true);
    fetchSettings();

    return () => {
      mounted = false;
    };
  }, [user, loadFromLocalStorage]);

  // Update settings (works for both logged-in and anonymous)
  const updateSettings = useCallback(
    async (newSettings: Partial<ToneSettings>) => {
      const updatedSettings = { ...settings, ...newSettings };

      // Optimistic update
      setSettings(updatedSettings);
      setError(null);

      if (!user) {
        // Anonymous user - save to localStorage only
        saveToLocalStorage(updatedSettings);
        return;
      }

      // Logged-in user - save to database
      try {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            ...(newSettings.tone && { default_writing_tone: newSettings.tone }),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to update tone settings:', updateError);
          setError(updateError.message);
          // Revert optimistic update on error
          setSettings(settings);
        } else {
          // Also sync to localStorage for consistency
          saveToLocalStorage(updatedSettings);
        }
      } catch (err) {
        console.error('Failed to update tone settings:', err);
        setError(err instanceof Error ? err.message : 'Update failed');
        // Revert optimistic update on error
        setSettings(settings);
      }
    },
    [settings, user, saveToLocalStorage]
  );

  // Individual setters for convenience
  const setTone = useCallback(
    async (tone: WritingTone) => {
      await updateSettings({ tone });
    },
    [updateSettings]
  );

  return {
    ...settings,
    loading,
    error,
    setTone,
    updateSettings,
  };
}
