'use client';

import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

interface ProfileActionsProps {
  profileUserId: string;
  username?: string;
}

export function ProfileActions({ profileUserId, username }: ProfileActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  // Don't show actions if viewing own profile or not logged in
  if (!user || user.id === profileUserId) {
    return null;
  }

  const handleMessage = async () => {
    // If we have the username, navigate directly to the human-friendly URL
    if (username) {
      router.push(`/messages/dm/${username}`);
      return;
    }

    // Fallback: fetch username first, then navigate
    try {
      setSending(true);

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dm',
          participant_id: profileUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url,
        });
        throw new Error(
          `API returned ${response.status}: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();
      const conversationId = data.conversation?.id;

      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      } else {
        console.error('❌ No conversation ID in response:', data);
        throw new Error('No conversation ID returned from server');
      }
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fadeInUp" style={{ animationDelay: '250ms' }}>
      <button
        onClick={handleMessage}
        disabled={sending}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2',
          'transition-all hover:bg-muted',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sending && 'animate-pulse bg-muted'
        )}
        title={sending ? 'Opening conversation...' : 'Send message'}
      >
        <MessageCircle className={cn('h-5 w-5 transition-transform', sending && 'animate-spin')} />
      </button>
    </div>
  );
}
