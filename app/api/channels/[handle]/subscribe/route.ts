/**
 * Channel Subscription API
 *
 * POST /api/channels/[handle]/subscribe - Subscribe to channel
 * DELETE /api/channels/[handle]/subscribe - Unsubscribe from channel
 */

import { NextRequest, NextResponse } from 'next/server';

import { getChannelByHandle, subscribeToChannel, unsubscribeFromChannel } from '@/lib/channels';
import { createClient } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ handle: string }>;
}

/**
 * POST /api/channels/[handle]/subscribe
 *
 * Subscribe to a channel
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { handle } = await params;

    // Get the channel
    const channel = await getChannelByHandle(handle);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Can't subscribe to your own channel
    if (channel.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot subscribe to your own channel' }, { status: 400 });
    }

    // Subscribe
    const { subscription, error } = await subscribeToChannel(channel.id, user.id);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Get updated subscriber count
    const updatedChannel = await getChannelByHandle(handle);

    // Create notification for the channel owner
    await supabase.from('notifications').insert({
      user_id: channel.owner_id,
      type: 'follow', // Reusing follow type for now
      actor_id: user.id,
      title: 'New Subscriber',
      message: `Someone subscribed to your channel @${handle}`,
      action_url: `/@${handle}`,
    });

    return NextResponse.json(
      {
        subscribed: true,
        subscriber_count: updatedChannel?.subscriber_count || channel.subscriber_count + 1,
        subscription,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/channels/[handle]/subscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/[handle]/subscribe
 *
 * Unsubscribe from a channel
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

    // Get the channel
    const channel = await getChannelByHandle(handle);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Unsubscribe
    const { success, error } = await unsubscribeFromChannel(channel.id, user.id);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Get updated subscriber count
    const updatedChannel = await getChannelByHandle(handle);

    return NextResponse.json({
      subscribed: false,
      subscriber_count:
        updatedChannel?.subscriber_count || Math.max(0, channel.subscriber_count - 1),
    });
  } catch (error) {
    console.error('[DELETE /api/channels/[handle]/subscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
