'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [session, setSession] = useState<GodModeSession | null>(initialSession);

  useEffect(() => {
    // Update session if it changes
    setSession(initialSession);
  }, [initialSession]);

  const handleExitGodMode = async () => {
    try {
      const response = await fetch('/api/admin/god-mode', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to exit god mode');
      }

      toast.success('Exited God Mode');

      // Redirect to admin panel
      router.push('/admin/users');
      router.refresh();
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
