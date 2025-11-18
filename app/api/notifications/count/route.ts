import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { NotificationCountResponse, NotificationType } from '@/types/notifications';

/**
 * GET /api/notifications/count
 * Get notification counts (total, unread, by type)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    // Get counts by type
    const { data: typeData } = await supabase
      .from('notifications')
      .select('type')
      .eq('user_id', user.id);

    // Count by type
    const byType: Record<NotificationType, number> = {
      comment: 0,
      reply: 0,
      reaction: 0,
      mention: 0,
      follow: 0,
      vibelog_like: 0,
      mini_vibelog_promoted: 0,
      comment_promoted: 0,
      system: 0,
    };

    if (typeData) {
      typeData.forEach((item: { type: NotificationType }) => {
        byType[item.type] = (byType[item.type] || 0) + 1;
      });
    }

    const response: NotificationCountResponse = {
      total: totalCount || 0,
      unread: unreadCount || 0,
      byType,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/notifications/count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
