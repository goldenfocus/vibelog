import { useEffect, useState } from 'react';

import { clearSessionId, getSessionId } from '@/lib/session';
import { createClient } from '@/lib/supabase';

/**
 * Hook to transfer anonymous vibelogs to authenticated user
 * Runs in background on dashboard after sign-in
 * Non-blocking for UI performance
 */
export function useVibelogTransfer(userId: string | null | undefined) {
  const [transferred, setTransferred] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || transferred) {
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) {
      setTransferred(true);
      return;
    }

    let mounted = true;

    const transfer = async () => {
      try {
        console.log('🔄 Transferring anonymous vibelogs...');
        const supabase = createClient();

        const { data, error: transferError } = await supabase.rpc('transfer_session_vibelogs', {
          p_session_id: sessionId,
          p_user_id: userId,
        });

        if (!mounted) {
          return;
        }

        if (transferError) {
          console.warn('⚠️  Vibelog transfer failed:', transferError);
          setError(transferError.message);
        } else {
          const transferredCount = data || 0;
          console.log(`✅ Transferred ${transferredCount} vibelogs`);
          setCount(transferredCount);
          clearSessionId();
        }

        setTransferred(true);
      } catch (err) {
        console.error('Vibelog transfer exception:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Transfer failed');
          setTransferred(true);
        }
      }
    };

    transfer();

    return () => {
      mounted = false;
    };
  }, [userId, transferred]);

  return { transferred, count, error };
}
