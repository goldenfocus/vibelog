import { NextResponse } from 'next/server';

import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * Pre-fetch data for Vibe Brain suggestion buttons
 * This ensures we always have real data to show instantly
 */
export async function GET() {
  try {
    const supabase = await createServerAdminClient();

    // Fetch latest vibelogs - simple query without join first
    const { data: vibelogsData, error: vibelogsError } = await supabase
      .from('vibelogs')
      .select('id, title, teaser, created_at, user_id')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(8);

    if (vibelogsError) {
      console.error('[SUGGESTIONS] Vibelogs query error:', vibelogsError);
    }

    // Fetch profiles separately to avoid join issues
    const userIds = [...new Set((vibelogsData || []).map(v => v.user_id))];
    const { data: profilesData } =
      userIds.length > 0
        ? await supabase.from('profiles').select('id, username, display_name').in('id', userIds)
        : { data: [] };

    const profileMap = new Map((profilesData || []).map(p => [p.id, p]));

    // Fetch creators and stats in parallel
    const [creatorsResult, statsResult] = await Promise.all([
      // All profiles (we'll filter by vibelog count)
      supabase.from('profiles').select(`
          id,
          username,
          display_name,
          bio
        `),

      // Platform stats
      Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('vibelogs')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true),
      ]),
    ]);

    // Process vibelogs with profile data from map
    const vibelogs = (vibelogsData || []).map(v => {
      const profile = profileMap.get(v.user_id);
      return {
        id: v.id,
        title: v.title || 'Untitled',
        teaser: v.teaser?.slice(0, 100) || '',
        username: profile?.username || 'anonymous',
        displayName: profile?.display_name || null,
        createdAt: v.created_at,
      };
    });

    // Get vibelog counts per user to find top creators
    const { data: vibelogCounts } = await supabase
      .from('vibelogs')
      .select('user_id')
      .eq('is_published', true);

    const countMap = new Map<string, number>();
    for (const v of vibelogCounts || []) {
      countMap.set(v.user_id, (countMap.get(v.user_id) || 0) + 1);
    }

    // Match profiles with their counts and sort
    const creators = (creatorsResult.data || [])
      .map(p => ({
        id: p.id,
        username: p.username,
        displayName: p.display_name,
        bio: p.bio?.slice(0, 80) || null,
        vibelogCount: countMap.get(p.id) || 0,
      }))
      .filter(c => c.vibelogCount > 0)
      .sort((a, b) => b.vibelogCount - a.vibelogCount)
      .slice(0, 5);

    // Stats
    const stats = {
      totalUsers: statsResult[0].count || 0,
      totalVibelogs: statsResult[1].count || 0,
    };

    return NextResponse.json({
      vibelogs,
      creators,
      stats,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[VIBE BRAIN SUGGESTIONS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
