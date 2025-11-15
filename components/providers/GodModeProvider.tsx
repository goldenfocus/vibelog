'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import GodModeBanner from '@/components/admin/GodModeBanner';

interface GodModeSession {
  adminUserId: string;
  targetUserId: string;
  targetUserName: string;
  startedAt: number;
  expiresAt: number;
}

interface GodModeProviderProps {
  initialSession: GodModeSession | null;
}

export function GodModeProvider({ initialSession }: GodModeProviderProps) {
  const [session, setSession] = useState<GodModeSession | null>(initialSession);

  useEffect(() => {
    // Update session if it changes
    setSession(initialSession);
  }, [initialSession]);

  // Add padding to body when god mode is active to prevent banner from covering content
  useEffect(() => {
    if (session) {
      document.body.style.paddingTop = '56px'; // Height of the banner
    } else {
      document.body.style.paddingTop = '0';
    }

    return () => {
      document.body.style.paddingTop = '0';
    };
  }, [session]);

  const handleExitGodMode = async () => {
    try {
      const response = await fetch('/api/admin/god-mode', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to exit god mode');
      }

      toast.success('Exited God Mode');

      // Force full page reload to ensure all state is cleared
      window.location.href = '/admin/users';
    } catch (error) {
      console.error('Error exiting god mode:', error);
      toast.error('Failed to exit god mode');
    }
  };

  if (!session) {
    return null;
  }

  return (
    <GodModeBanner
      targetUserName={session.targetUserName}
      targetUserId={session.targetUserId}
      onExit={handleExitGodMode}
      expiresAt={session.expiresAt}
    />
  );
}
