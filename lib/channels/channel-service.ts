import 'server-only';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

import type {
  Channel,
  ChannelMember,
  ChannelMemberWithUser,
  ChannelSubscription,
  ChannelSummary,
  CreateChannelRequest,
  UpdateChannelRequest,
} from './types';
import { isValidHandle, normalizeHandle } from './types';

// ============================================================================
// CHANNEL CRUD OPERATIONS
// ============================================================================

/**
 * Get a channel by handle
 */
export async function getChannelByHandle(handle: string): Promise<Channel | null> {
  const supabase = await createServerAdminClient();
  const normalizedHandle = normalizeHandle(handle);

  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('handle', normalizedHandle)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Channel;
}

/**
 * Get a channel by ID
 */
export async function getChannelById(id: string): Promise<Channel | null> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase.from('channels').select('*').eq('id', id).single();

  if (error || !data) {
    return null;
  }

  return data as Channel;
}

/**
 * Get user's default channel
 */
export async function getUserDefaultChannel(userId: string): Promise<Channel | null> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_default', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Channel;
}

/**
 * Get all channels owned by a user
 */
export async function getUserChannels(userId: string): Promise<ChannelSummary[]> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channels')
    .select('id, handle, name, avatar_url, subscriber_count, vibelog_count, is_default')
    .eq('owner_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ChannelSummary[];
}

/**
 * Create a new channel
 */
export async function createChannel(
  userId: string,
  request: CreateChannelRequest
): Promise<{ channel: Channel | null; error: string | null }> {
  const supabase = await createServerAdminClient();

  // Validate handle
  const normalizedHandle = normalizeHandle(request.handle);
  if (!isValidHandle(normalizedHandle)) {
    return {
      channel: null,
      error:
        'Invalid handle. Must be 3-30 characters, start with a letter or number, and contain only lowercase letters, numbers, underscores, or hyphens.',
    };
  }

  // Check if handle is already taken
  const existing = await getChannelByHandle(normalizedHandle);
  if (existing) {
    return { channel: null, error: 'This handle is already taken.' };
  }

  // Check if this is the user's first channel (make it default)
  const userChannels = await getUserChannels(userId);
  const isDefault = userChannels.length === 0;

  // Insert the channel
  const { data, error } = await supabase
    .from('channels')
    .insert({
      owner_id: userId,
      handle: normalizedHandle,
      name: request.name,
      bio: request.bio || null,
      avatar_url: request.avatar_url || null,
      header_image: request.header_image || null,
      primary_topic: request.primary_topic || null,
      topics: request.topics || [],
      tags: request.tags || [],
      persona: request.persona || {},
      is_default: isDefault,
      is_public: request.is_public ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating channel:', error);
    return { channel: null, error: 'Failed to create channel. Please try again.' };
  }

  return { channel: data as Channel, error: null };
}

/**
 * Update a channel
 */
export async function updateChannel(
  channelId: string,
  userId: string,
  request: UpdateChannelRequest
): Promise<{ channel: Channel | null; error: string | null }> {
  const supabase = await createServerAdminClient();

  // Verify ownership
  const existing = await getChannelById(channelId);
  if (!existing) {
    return { channel: null, error: 'Channel not found.' };
  }
  if (existing.owner_id !== userId) {
    return { channel: null, error: 'You do not have permission to update this channel.' };
  }

  // Build update object (only include provided fields)
  const updates: Record<string, unknown> = {};

  if (request.name !== undefined) {
    updates.name = request.name;
  }
  if (request.bio !== undefined) {
    updates.bio = request.bio;
  }
  if (request.avatar_url !== undefined) {
    updates.avatar_url = request.avatar_url;
  }
  if (request.header_image !== undefined) {
    updates.header_image = request.header_image;
  }
  if (request.website_url !== undefined) {
    updates.website_url = request.website_url;
  }
  if (request.twitter_url !== undefined) {
    updates.twitter_url = request.twitter_url;
  }
  if (request.instagram_url !== undefined) {
    updates.instagram_url = request.instagram_url;
  }
  if (request.youtube_url !== undefined) {
    updates.youtube_url = request.youtube_url;
  }
  if (request.tiktok_url !== undefined) {
    updates.tiktok_url = request.tiktok_url;
  }
  if (request.linkedin_url !== undefined) {
    updates.linkedin_url = request.linkedin_url;
  }
  if (request.github_url !== undefined) {
    updates.github_url = request.github_url;
  }
  if (request.facebook_url !== undefined) {
    updates.facebook_url = request.facebook_url;
  }
  if (request.threads_url !== undefined) {
    updates.threads_url = request.threads_url;
  }
  if (request.primary_topic !== undefined) {
    updates.primary_topic = request.primary_topic;
  }
  if (request.topics !== undefined) {
    updates.topics = request.topics;
  }
  if (request.tags !== undefined) {
    updates.tags = request.tags;
  }
  if (request.persona !== undefined) {
    updates.persona = request.persona;
  }
  if (request.is_public !== undefined) {
    updates.is_public = request.is_public;
  }
  if (request.allow_collabs !== undefined) {
    updates.allow_collabs = request.allow_collabs;
  }

  if (Object.keys(updates).length === 0) {
    return { channel: existing, error: null };
  }

  const { data, error } = await supabase
    .from('channels')
    .update(updates)
    .eq('id', channelId)
    .select()
    .single();

  if (error) {
    console.error('Error updating channel:', error);
    return { channel: null, error: 'Failed to update channel. Please try again.' };
  }

  return { channel: data as Channel, error: null };
}

/**
 * Delete a channel (cannot delete default channel)
 */
export async function deleteChannel(
  channelId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerAdminClient();

  // Verify ownership and check if default
  const existing = await getChannelById(channelId);
  if (!existing) {
    return { success: false, error: 'Channel not found.' };
  }
  if (existing.owner_id !== userId) {
    return { success: false, error: 'You do not have permission to delete this channel.' };
  }
  if (existing.is_default) {
    return { success: false, error: 'Cannot delete your default channel.' };
  }

  const { error } = await supabase.from('channels').delete().eq('id', channelId);

  if (error) {
    console.error('Error deleting channel:', error);
    return { success: false, error: 'Failed to delete channel. Please try again.' };
  }

  return { success: true, error: null };
}

/**
 * Check if a handle is available
 */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const normalizedHandle = normalizeHandle(handle);
  if (!isValidHandle(normalizedHandle)) {
    return false;
  }

  const existing = await getChannelByHandle(normalizedHandle);
  return existing === null;
}

// ============================================================================
// SUBSCRIPTION OPERATIONS
// ============================================================================

/**
 * Subscribe to a channel
 */
export async function subscribeToChannel(
  channelId: string,
  userId: string
): Promise<{ subscription: ChannelSubscription | null; error: string | null }> {
  const supabase = await createServerAdminClient();

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('channel_subscriptions')
    .select('*')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { subscription: existing as ChannelSubscription, error: null };
  }

  const { data, error } = await supabase
    .from('channel_subscriptions')
    .insert({
      channel_id: channelId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error subscribing to channel:', error);
    return { subscription: null, error: 'Failed to subscribe. Please try again.' };
  }

  return { subscription: data as ChannelSubscription, error: null };
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeFromChannel(
  channelId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerAdminClient();

  const { error } = await supabase
    .from('channel_subscriptions')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unsubscribing from channel:', error);
    return { success: false, error: 'Failed to unsubscribe. Please try again.' };
  }

  return { success: true, error: null };
}

/**
 * Check if user is subscribed to a channel
 */
export async function isSubscribedToChannel(channelId: string, userId: string): Promise<boolean> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channel_subscriptions')
    .select('id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

/**
 * Get user's subscriptions
 */
export async function getUserSubscriptions(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ subscriptions: ChannelSubscription[]; total: number }> {
  const supabase = await createServerAdminClient();

  // Get total count
  const { count } = await supabase
    .from('channel_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get subscriptions
  const { data, error } = await supabase
    .from('channel_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching subscriptions:', error);
    return { subscriptions: [], total: 0 };
  }

  return {
    subscriptions: (data || []) as ChannelSubscription[],
    total: count || 0,
  };
}

/**
 * Get channel's subscribers (with pagination)
 */
export async function getChannelSubscribers(
  channelId: string,
  limit = 50,
  offset = 0
): Promise<{ subscribers: ChannelSubscription[]; total: number }> {
  const supabase = await createServerAdminClient();

  // Get total count
  const { count } = await supabase
    .from('channel_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId);

  // Get subscribers
  const { data, error } = await supabase
    .from('channel_subscriptions')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching subscribers:', error);
    return { subscribers: [], total: 0 };
  }

  return {
    subscribers: (data || []) as ChannelSubscription[],
    total: count || 0,
  };
}

// ============================================================================
// MEMBER OPERATIONS
// ============================================================================

/**
 * Add a member to a channel
 */
export async function addChannelMember(
  channelId: string,
  userId: string,
  role: 'admin' | 'editor' | 'viewer',
  invitedBy: string
): Promise<{ member: ChannelMember | null; error: string | null }> {
  const supabase = await createServerAdminClient();

  // Verify inviter is owner or admin
  const channel = await getChannelById(channelId);
  if (!channel) {
    return { member: null, error: 'Channel not found.' };
  }

  const isOwner = channel.owner_id === invitedBy;
  if (!isOwner) {
    const { data: inviterMember } = await supabase
      .from('channel_members')
      .select('role')
      .eq('channel_id', channelId)
      .eq('user_id', invitedBy)
      .single();

    if (!inviterMember || !['owner', 'admin'].includes(inviterMember.role)) {
      return { member: null, error: 'You do not have permission to add members.' };
    }
  }

  // Check if user is already a member
  const { data: existing } = await supabase
    .from('channel_members')
    .select('*')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { member: null, error: 'User is already a member of this channel.' };
  }

  // Default permissions based on role
  const permissions = {
    admin: {
      can_post: true,
      can_edit: true,
      can_delete: true,
      can_analytics: true,
      can_settings: true,
      can_members: true,
    },
    editor: {
      can_post: true,
      can_edit: true,
      can_delete: false,
      can_analytics: false,
      can_settings: false,
      can_members: false,
    },
    viewer: {
      can_post: false,
      can_edit: false,
      can_delete: false,
      can_analytics: true,
      can_settings: false,
      can_members: false,
    },
  };

  const { data, error } = await supabase
    .from('channel_members')
    .insert({
      channel_id: channelId,
      user_id: userId,
      role,
      permissions: permissions[role],
      invited_by: invitedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding channel member:', error);
    return { member: null, error: 'Failed to add member. Please try again.' };
  }

  return { member: data as ChannelMember, error: null };
}

/**
 * Remove a member from a channel
 */
export async function removeChannelMember(
  channelId: string,
  userId: string,
  removedBy: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerAdminClient();

  // Verify remover is owner or admin
  const channel = await getChannelById(channelId);
  if (!channel) {
    return { success: false, error: 'Channel not found.' };
  }

  const isOwner = channel.owner_id === removedBy;
  if (!isOwner) {
    const { data: removerMember } = await supabase
      .from('channel_members')
      .select('role')
      .eq('channel_id', channelId)
      .eq('user_id', removedBy)
      .single();

    if (!removerMember || !['owner', 'admin'].includes(removerMember.role)) {
      return { success: false, error: 'You do not have permission to remove members.' };
    }
  }

  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing channel member:', error);
    return { success: false, error: 'Failed to remove member. Please try again.' };
  }

  return { success: true, error: null };
}

/**
 * Get channel members
 */
export async function getChannelMembers(channelId: string): Promise<ChannelMemberWithUser[]> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channel_members')
    .select(
      `
      *,
      user:profiles!channel_members_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        email
      )
    `
    )
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching channel members:', error);
    return [];
  }

  return (data || []) as unknown as ChannelMemberWithUser[];
}

// ============================================================================
// CHANNEL VIBELOGS
// ============================================================================

/**
 * Get vibelogs for a channel
 */
export async function getChannelVibelogs(
  channelId: string,
  options: {
    limit?: number;
    offset?: number;
    includePrivate?: boolean;
  } = {}
): Promise<{
  vibelogs: Array<{
    id: string;
    title: string;
    teaser: string | null;
    slug: string;
    cover_image_url: string | null;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string | null;
    created_at: string;
  }>;
  total: number;
}> {
  const supabase = await createServerAdminClient();
  const { limit = 20, offset = 0, includePrivate = false } = options;

  // Build query
  let query = supabase
    .from('vibelogs')
    .select(
      'id, title, teaser, slug, cover_image_url, view_count, like_count, comment_count, published_at, created_at',
      {
        count: 'exact',
      }
    )
    .eq('channel_id', channelId);

  if (!includePrivate) {
    query = query.eq('is_published', true).eq('is_public', true);
  }

  const { data, error, count } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching channel vibelogs:', error);
    return { vibelogs: [], total: 0 };
  }

  return {
    vibelogs: data || [],
    total: count || 0,
  };
}

// ============================================================================
// DISCOVERY
// ============================================================================

/**
 * Get popular channels
 */
export async function getPopularChannels(limit = 10): Promise<ChannelSummary[]> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channels')
    .select('id, handle, name, avatar_url, subscriber_count, vibelog_count, is_default')
    .eq('is_public', true)
    .order('subscriber_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular channels:', error);
    return [];
  }

  return (data || []) as ChannelSummary[];
}

/**
 * Get channels by topic
 */
export async function getChannelsByTopic(topic: string, limit = 20): Promise<ChannelSummary[]> {
  const supabase = await createServerAdminClient();

  const { data, error } = await supabase
    .from('channels')
    .select('id, handle, name, avatar_url, subscriber_count, vibelog_count, is_default')
    .eq('is_public', true)
    .or(`primary_topic.eq.${topic},topics.cs.{${topic}}`)
    .order('subscriber_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching channels by topic:', error);
    return [];
  }

  return (data || []) as ChannelSummary[];
}

/**
 * Search channels by name or handle
 */
export async function searchChannels(query: string, limit = 20): Promise<ChannelSummary[]> {
  const supabase = await createServerAdminClient();
  const searchTerm = `%${query.toLowerCase()}%`;

  const { data, error } = await supabase
    .from('channels')
    .select('id, handle, name, avatar_url, subscriber_count, vibelog_count, is_default')
    .eq('is_public', true)
    .or(`handle.ilike.${searchTerm},name.ilike.${searchTerm}`)
    .order('subscriber_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching channels:', error);
    return [];
  }

  return (data || []) as ChannelSummary[];
}
