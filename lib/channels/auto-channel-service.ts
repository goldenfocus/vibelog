import 'server-only';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

import { generateChannelName, getTopicDisplayName } from './ai-name-generator';
import type { Channel } from './types';

/**
 * Result of ensuring a channel exists for a topic
 */
export interface AutoChannelResult {
  channel: Channel;
  wasCreated: boolean;
  aiName: string | null;
}

/**
 * Get a user's channel for a specific topic
 */
export async function getUserChannelByTopic(
  userId: string,
  topic: string
): Promise<Channel | null> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('owner_id', userId)
    .eq('primary_topic', topic)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Channel;
}

/**
 * Ensure a channel exists for a user's topic
 *
 * This is the core auto-channel function. It:
 * 1. Checks if user already has a channel for this topic
 * 2. If not, creates one with an AI-generated name
 * 3. Returns the channel (existing or newly created)
 *
 * @param userId - The user's ID
 * @param username - The user's username (for handle generation)
 * @param topic - The topic detected from the vibelog
 * @param vibelogContent - Optional content for AI name generation
 */
export async function ensureChannelForTopic(
  userId: string,
  username: string,
  topic: string,
  vibelogContent?: string
): Promise<AutoChannelResult> {
  const supabase = await createServerAdminClient();

  // 1. Check if user already has a channel for this topic
  const existingChannel = await getUserChannelByTopic(userId, topic);
  if (existingChannel) {
    return {
      channel: existingChannel,
      wasCreated: false,
      aiName: existingChannel.ai_display_name,
    };
  }

  // 2. Generate AI creative name (optional, with fallback)
  let aiName: string | null = null;
  if (vibelogContent) {
    aiName = await generateChannelName(topic, vibelogContent);
  }

  // 3. Generate handle: {username}-{topic}
  const handle = `${username}-${topic}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // 4. Get friendly topic name as fallback
  const topicDisplayName = getTopicDisplayName(topic);

  // 5. Check if this is user's first channel (make it default)
  const { count } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId);

  const isFirstChannel = (count || 0) === 0;

  // 6. Create the channel
  const { data: newChannel, error } = await supabase
    .from('channels')
    .insert({
      owner_id: userId,
      handle,
      name: topicDisplayName,
      ai_display_name: aiName,
      primary_topic: topic,
      auto_generated: true,
      is_default: isFirstChannel,
      is_public: true,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate handle (rare edge case - user might have manually created)
    if (error.code === '23505') {
      // Unique constraint violation
      console.warn(
        `[auto-channel-service] Handle ${handle} already exists, fetching existing channel`
      );
      const existing = await getUserChannelByTopic(userId, topic);
      if (existing) {
        return {
          channel: existing,
          wasCreated: false,
          aiName: existing.ai_display_name,
        };
      }
    }

    console.error('[auto-channel-service] Error creating channel:', error);
    throw new Error(`Failed to create auto-channel: ${error.message}`);
  }

  console.log(
    `[auto-channel-service] Created auto-channel: @${handle} ("${aiName || topicDisplayName}") for topic: ${topic}`
  );

  return {
    channel: newChannel as Channel,
    wasCreated: true,
    aiName,
  };
}

/**
 * Update a vibelog's channel_id to match its detected topic
 *
 * Called after content metadata extraction when primary_topic is known
 */
export async function assignVibelogToTopicChannel(
  vibelogId: string,
  userId: string,
  username: string,
  topic: string,
  vibelogContent?: string
): Promise<{ channelId: string; wasChannelCreated: boolean }> {
  // Ensure channel exists
  const { channel, wasCreated } = await ensureChannelForTopic(
    userId,
    username,
    topic,
    vibelogContent
  );

  // Update the vibelog's channel_id
  const supabase = await createServerAdminClient();
  const { error } = await supabase
    .from('vibelogs')
    .update({ channel_id: channel.id })
    .eq('id', vibelogId);

  if (error) {
    console.error('[auto-channel-service] Error updating vibelog channel_id:', error);
    // Don't throw - the vibelog is still saved, just not linked to the topic channel
  }

  return {
    channelId: channel.id,
    wasChannelCreated: wasCreated,
  };
}
