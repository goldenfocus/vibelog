import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = await createServerAdminClient();

    // Get conversation stats
    const { count: conversationCount } = await adminSupabase
      .from('vibe_brain_conversations')
      .select('*', { count: 'exact', head: true });

    // Get message stats
    const { count: messageCount } = await adminSupabase
      .from('vibe_brain_messages')
      .select('*', { count: 'exact', head: true });

    // Get memory stats
    const { count: memoryCount } = await adminSupabase
      .from('user_memories')
      .select('*', { count: 'exact', head: true });

    // Get embedding stats
    const { count: embeddingCount } = await adminSupabase
      .from('content_embeddings')
      .select('*', { count: 'exact', head: true });

    // Get unique users with conversations
    const { data: uniqueUsers } = await adminSupabase
      .from('vibe_brain_conversations')
      .select('user_id')
      .limit(1000);

    const uniqueUserCount = new Set(uniqueUsers?.map(u => u.user_id) || []).size;

    // Get messages per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentMessages } = await adminSupabase
      .from('vibe_brain_messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Group by day
    const messagesByDay: Record<string, number> = {};
    for (const msg of recentMessages || []) {
      const day = new Date(msg.created_at).toISOString().split('T')[0];
      messagesByDay[day] = (messagesByDay[day] || 0) + 1;
    }

    // Get memory categories breakdown
    const { data: memoryCategories } = await adminSupabase.from('user_memories').select('category');

    const categoryCounts: Record<string, number> = {};
    for (const mem of memoryCategories || []) {
      categoryCounts[mem.category] = (categoryCounts[mem.category] || 0) + 1;
    }

    // Get embedding types breakdown
    const { data: embeddingTypes } = await adminSupabase
      .from('content_embeddings')
      .select('content_type');

    const embeddingTypeCounts: Record<string, number> = {};
    for (const emb of embeddingTypes || []) {
      embeddingTypeCounts[emb.content_type] = (embeddingTypeCounts[emb.content_type] || 0) + 1;
    }

    // Get AI cost data if available
    let totalCost = 0;
    const costByDay: Record<string, number> = {};

    try {
      const { data: costs } = await adminSupabase
        .from('ai_usage_log')
        .select('cost, created_at')
        .like('metadata->>endpoint', '%vibe-brain%');

      for (const cost of costs || []) {
        totalCost += cost.cost || 0;
        const day = new Date(cost.created_at).toISOString().split('T')[0];
        costByDay[day] = (costByDay[day] || 0) + (cost.cost || 0);
      }
    } catch {
      // ai_usage_log might not exist
    }

    return NextResponse.json({
      overview: {
        conversations: conversationCount || 0,
        messages: messageCount || 0,
        memories: memoryCount || 0,
        embeddings: embeddingCount || 0,
        uniqueUsers: uniqueUserCount,
        totalCost: Math.round(totalCost * 1000) / 1000,
      },
      messagesByDay,
      memoryCategoryCounts: categoryCounts,
      embeddingTypeCounts,
      costByDay,
    });
  } catch (error) {
    console.error('[ADMIN] Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
