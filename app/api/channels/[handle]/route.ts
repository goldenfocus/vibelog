/**
 * Channel by Handle API
 *
 * GET /api/channels/[handle] - Get channel details
 * PATCH /api/channels/[handle] - Update channel
 * DELETE /api/channels/[handle] - Delete channel
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  getChannelByHandle,
  updateChannel,
  deleteChannel,
  isSubscribedToChannel,
} from '@/lib/channels';
import { createClient } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ handle: string }>;
}

/**
 * GET /api/channels/[handle]
 *
 * Get channel details by handle
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { handle } = await params;
    const channel = await getChannelByHandle(handle);

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if current user is subscribed
    let isSubscribed = false;
    let isOwner = false;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isSubscribed = await isSubscribedToChannel(channel.id, user.id);
      isOwner = channel.owner_id === user.id;
    }

    return NextResponse.json({
      channel,
      isSubscribed,
      isOwner,
    });
  } catch (error) {
    console.error('[GET /api/channels/[handle]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/channels/[handle]
 *
 * Update channel (owner only)
 *
 * Body: Partial channel data
 * {
 *   name?: string
 *   bio?: string
 *   avatar_url?: string
 *   header_image?: string
 *   website_url?: string
 *   twitter_url?: string
 *   ... other social links
 *   primary_topic?: string
 *   topics?: string[]
 *   tags?: string[]
 *   persona?: { voice_id, tone, style, formality, language }
 *   is_public?: boolean
 *   allow_collabs?: boolean
 * }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handle } = await params;

    // Get the channel to verify ownership
    const existingChannel = await getChannelByHandle(handle);
    if (!existingChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const body = await request.json();

    // Update the channel
    const { channel, error } = await updateChannel(existingChannel.id, user.id, body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('[PATCH /api/channels/[handle]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/[handle]
 *
 * Delete channel (owner only, cannot delete default channel)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handle } = await params;

    // Get the channel to verify ownership
    const existingChannel = await getChannelByHandle(handle);
    if (!existingChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Delete the channel
    const { success, error } = await deleteChannel(existingChannel.id, user.id);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/channels/[handle]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
