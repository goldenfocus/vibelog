import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type {
  Notification,
  NotificationFilter,
  NotificationSortOption,
  NotificationsListResponse,
} from '@/types/notifications';

/**
 * GET /api/notifications
 * Fetch user's notifications with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = (searchParams.get('sortBy') as NotificationSortOption) || 'newest';
    const isRead = searchParams.get('isRead');
    const types = searchParams.get('types')?.split(',');

    // Build filter
    const filter: NotificationFilter = {};
    if (isRead !== null) {
      filter.isRead = isRead === 'true';
    }
    if (types) {
      filter.types = types as NotificationFilter['types'];
    }

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply filters
    if (filter.isRead !== undefined) {
      query = query.eq('is_read', filter.isRead);
    }
    if (filter.types && filter.types.length > 0) {
      query = query.in('type', filter.types);
    }

    // Apply sorting
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'priority') {
      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    const response: NotificationsListResponse = {
      notifications: data as Notification[],
      unreadCount: unreadCount || 0,
      hasMore: count ? from + limit < count : false,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
