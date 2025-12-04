import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase';

import ConversationClient from './ConversationClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  // Check if this is a UUID (conversation ID) for a DM
  // If so, redirect to the human-friendly /messages/dm/[username] URL
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(id)) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if this conversation is a DM
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id, type')
          .eq('id', id)
          .single();

        if (conversation?.type === 'dm') {
          // Get the other participant's username
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', id);

          const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id;

          if (otherUserId) {
            const { data: otherUser } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', otherUserId)
              .single();

            if (otherUser?.username) {
              // Redirect to the human-friendly URL
              const basePath = locale && locale !== 'en' ? `/${locale}` : '';
              redirect(`${basePath}/messages/dm/${otherUser.username}`);
            }
          }
        }
      }
    } catch (error) {
      // If redirect fails, fall through to render the conversation client
      console.error('Redirect lookup failed:', error);
    }
  }

  return <ConversationClient />;
}
