/**
 * Channel Vibelogs API
 *
 * GET /api/channels/[handle]/vibelogs - Get channel's vibelogs
 */

import { NextRequest, NextResponse } from 'next/server';

import { getChannelByHandle, getChannelVibelogs } from '@/lib/channels';
import { createClient } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ handle: string }>;
}

/**
 * GET /api/channels/[handle]/vibelogs
 *
 * Get vibelogs for a channel
 *
 * Query params:
 * - limit: number (default: 20, max: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { handle } = await params;

    // Get the channel
    const channel = await getChannelByHandle(handle);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if current user is the owner (can see private vibelogs)
    let isOwner = false;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && channel.owner_id === user.id) {
      isOwner = true;
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get vibelogs
    const { vibelogs, total } = await getChannelVibelogs(channel.id, {
      limit,
      offset,
      includePrivate: isOwner,
    });

    return NextResponse.json({
      vibelogs,
      total,
      has_more: offset + vibelogs.length < total,
    });
  } catch (error) {
    console.error('[GET /api/channels/[handle]/vibelogs] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
