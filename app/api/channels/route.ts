/**
 * Channels API
 *
 * GET /api/channels - List channels (popular, by topic, or search)
 * POST /api/channels - Create a new channel
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  createChannel,
  getPopularChannels,
  getChannelsByTopic,
  searchChannels,
  isHandleAvailable,
} from '@/lib/channels';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/channels
 *
 * List channels with optional filtering
 *
 * Query params:
 * - type: "popular" | "topic" | "search" (default: "popular")
 * - topic: string (required if type="topic")
 * - q: string (required if type="search")
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'popular';
    const topic = searchParams.get('topic');
    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    let channels;

    switch (type) {
      case 'topic':
        if (!topic) {
          return NextResponse.json({ error: 'topic parameter is required' }, { status: 400 });
        }
        channels = await getChannelsByTopic(topic, limit);
        break;

      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
        }
        channels = await searchChannels(query, limit);
        break;

      case 'popular':
      default:
        channels = await getPopularChannels(limit);
        break;
    }

    return NextResponse.json({
      channels,
      total: channels.length,
    });
  } catch (error) {
    console.error('[GET /api/channels] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/channels
 *
 * Create a new channel
 *
 * Body:
 * {
 *   handle: string (required, 3-30 chars, lowercase alphanumeric + underscore/hyphen)
 *   name: string (required)
 *   bio?: string
 *   avatar_url?: string
 *   header_image?: string
 *   primary_topic?: string
 *   topics?: string[]
 *   tags?: string[]
 *   persona?: { voice_id, tone, style, formality, language }
 *   is_public?: boolean (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      handle,
      name,
      bio,
      avatar_url,
      header_image,
      primary_topic,
      topics,
      tags,
      persona,
      is_public,
    } = body;

    // Validate required fields
    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'handle is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Check handle availability first (fast check)
    const available = await isHandleAvailable(handle);
    if (!available) {
      return NextResponse.json(
        { error: 'This handle is already taken or invalid' },
        { status: 400 }
      );
    }

    // Create the channel
    const { channel, error } = await createChannel(user.id, {
      handle,
      name,
      bio,
      avatar_url,
      header_image,
      primary_topic,
      topics,
      tags,
      persona,
      is_public,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/channels] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
