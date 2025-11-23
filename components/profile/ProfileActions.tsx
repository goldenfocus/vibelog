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

export function ProfileActions({ profileUserId }: ProfileActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  // Don't show actions if viewing own profile or not logged in
  if (!user || user.id === profileUserId) {
    return null;
  }

  const handleMessage = async () => {
    try {
      setSending(true);

      // Create or get existing DM conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dm',
          participant_id: profileUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      const conversationId = data.conversation?.id;

      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      } else {
        throw new Error('No conversation ID returned');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fadeInUp flex gap-3" style={{ animationDelay: '250ms' }}>
      <button
        onClick={handleMessage}
        disabled={sending}
        className={cn(
          'flex items-center gap-2 rounded-full px-6 py-2.5',
          'bg-gradient-to-br from-metallic-blue-500 to-metallic-blue-600',
          'text-sm font-medium text-white',
          'transition-all duration-200 hover:shadow-lg',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <MessageCircle size={16} />
        <span>{sending ? 'Opening...' : 'Message'}</span>
      </button>
    </div>
  );
}
