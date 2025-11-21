// Platform query functions for Vibe Brain
// These give the AI actual knowledge about the platform

import { createServerAdminClient } from '@/lib/supabaseAdmin';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  isAdmin: boolean;
  vibelogCount: number;
  createdAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalVibelogs: number;
  totalComments: number;
  recentVibelogsToday: number;
}

export interface TopCreator {
  username: string;
  displayName: string | null;
  vibelogCount: number;
}

export interface TrendingVibelog {
  id: string;
  title: string;
  teaser: string | null;
  username: string;
  createdAt: string;
  reactionCount: number;
}

/**
 * Get the current user's profile with their stats
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createServerAdminClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, is_admin, created_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[VIBE BRAIN] Failed to get user profile:', error);
    return null;
  }

  // Get vibelog count
  const { count: vibelogCount } = await supabase
    .from('vibelogs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    isAdmin: profile.is_admin || false,
    vibelogCount: vibelogCount || 0,
    createdAt: profile.created_at,
  };
}

/**
 * Get platform-wide statistics
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createServerAdminClient();

  const [usersResult, vibelogsResult, commentsResult, todayResult] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('vibelogs').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase
      .from('vibelogs')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('created_at', new Date().toISOString().split('T')[0]),
  ]);

  return {
    totalUsers: usersResult.count || 0,
    totalVibelogs: vibelogsResult.count || 0,
    totalComments: commentsResult.count || 0,
    recentVibelogsToday: todayResult.count || 0,
  };
}

/**
 * Get top creators by vibelog count
 */
export async function getTopCreators(limit: number = 5): Promise<TopCreator[]> {
  const supabase = await createServerAdminClient();

  // Get all published vibelogs grouped by user
  const { data: vibelogs } = await supabase
    .from('vibelogs')
    .select('user_id')
    .eq('is_published', true);

  if (!vibelogs || vibelogs.length === 0) {
    return [];
  }

  // Count vibelogs per user
  const countMap = new Map<string, number>();
  for (const v of vibelogs) {
    countMap.set(v.user_id, (countMap.get(v.user_id) || 0) + 1);
  }

  // Sort and get top users
  const topUserIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  // Get profiles for top users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', topUserIds);

  if (!profiles) {
    return [];
  }

  return topUserIds.map(userId => {
    const profile = profiles.find(p => p.id === userId);
    return {
      username: profile?.username || 'unknown',
      displayName: profile?.display_name,
      vibelogCount: countMap.get(userId) || 0,
    };
  });
}

/**
 * Get trending/recent vibelogs
 */
export async function getTrendingVibelogs(limit: number = 5): Promise<TrendingVibelog[]> {
  const supabase = await createServerAdminClient();

  const { data: vibelogs, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      teaser,
      created_at,
      user_id,
      profiles!inner(username)
    `
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !vibelogs) {
    console.error('[VIBE BRAIN] Failed to get trending vibelogs:', error);
    return [];
  }

  // Get reaction counts
  const vibelogIds = vibelogs.map(v => v.id);
  const { data: reactions } = await supabase
    .from('vibelog_reactions')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const reactionCountMap = new Map<string, number>();
  for (const r of reactions || []) {
    reactionCountMap.set(r.vibelog_id, (reactionCountMap.get(r.vibelog_id) || 0) + 1);
  }

  return vibelogs.map(v => {
    // profiles is an array from the join, get first element
    const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
    return {
      id: v.id,
      title: v.title || 'Untitled',
      teaser: v.teaser,
      username: (profile as { username: string })?.username || 'unknown',
      createdAt: v.created_at,
      reactionCount: reactionCountMap.get(v.id) || 0,
    };
  });
}

/**
 * Search for a creator by username
 */
export async function searchCreator(query: string): Promise<UserProfile | null> {
  const supabase = await createServerAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, is_admin, created_at')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(1)
    .single();

  if (!profile) {
    return null;
  }

  const { count: vibelogCount } = await supabase
    .from('vibelogs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_published', true);

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    isAdmin: profile.is_admin || false,
    vibelogCount: vibelogCount || 0,
    createdAt: profile.created_at,
  };
}
