/**
 * My Channels API
 *
 * GET /api/channels/me - Get current user's channels
 */

import { NextResponse } from 'next/server';

import { getUserChannels, getUserDefaultChannel } from '@/lib/channels';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/channels/me
 *
 * Get the current user's channels
 * Returns list of channels owned by the user, with default channel first
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's channels
    const channels = await getUserChannels(user.id);

    // Get default channel
    const defaultChannel = await getUserDefaultChannel(user.id);

    return NextResponse.json({
      channels,
      default_channel_id: defaultChannel?.id || null,
      total: channels.length,
    });
  } catch (error) {
    console.error('[GET /api/channels/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
