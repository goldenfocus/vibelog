/**
 * Vibe Brain Tool Executor
 *
 * Executes tool calls from GPT against Supabase and returns structured results.
 */

import { createServerAdminClient } from '@/lib/supabaseAdmin';

import type {
  VibelogResult,
  UserResult,
  CommentResult,
  PlatformStatsResult,
  RecentCommentResult,
  NewMemberResult,
} from './tools';

/**
 * Execute a tool call and return the result
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'searchVibelogs':
      return searchVibelogs(
        args.query as string,
        (args.limit as number) || 5,
        args.username as string | undefined
      );
    case 'getVibelog':
      return getVibelog(args.id as string);
    case 'searchUsers':
      return searchUsers(args.query as string, (args.limit as number) || 5);
    case 'getUserVibelogs':
      return getUserVibelogs(args.username as string, (args.limit as number) || 5);
    case 'getLatestVibelogs':
      return getLatestVibelogs((args.limit as number) || 5);
    case 'getTopCreators':
      return getTopCreators((args.limit as number) || 5);
    case 'getPlatformStats':
      return getPlatformStats();
    case 'getVibelogComments':
      return getVibelogComments(args.vibelogId as string, (args.limit as number) || 5);
    case 'getRecentComments':
      return getRecentComments((args.limit as number) || 5);
    case 'getNewMembers':
      return getNewMembers((args.limit as number) || 5);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Search vibelogs by keyword
 */
async function searchVibelogs(
  query: string,
  limit: number,
  username?: string
): Promise<VibelogResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  let queryBuilder = supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      teaser,
      content,
      created_at,
      user_id,
      profiles!inner(username)
    `
    )
    .eq('is_published', true)
    .or(`title.ilike.%${query}%,teaser.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  // Filter by username if provided
  if (username) {
    queryBuilder = queryBuilder.eq('profiles.username', username);
  }

  const { data: vibelogs, error } = await queryBuilder;

  if (error || !vibelogs) {
    console.error('[TOOL] searchVibelogs error:', error);
    return [];
  }

  // Get reaction counts
  const vibelogIds = vibelogs.map(v => v.id);
  const { data: reactions } = await supabase
    .from('reactions')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const reactionCountMap = new Map<string, number>();
  for (const r of reactions || []) {
    reactionCountMap.set(r.vibelog_id, (reactionCountMap.get(r.vibelog_id) || 0) + 1);
  }

  // Get comment counts
  const { data: comments } = await supabase
    .from('comments')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const commentCountMap = new Map<string, number>();
  for (const c of comments || []) {
    commentCountMap.set(c.vibelog_id, (commentCountMap.get(c.vibelog_id) || 0) + 1);
  }

  return vibelogs.map(v => {
    const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
    return {
      id: v.id,
      title: v.title || 'Untitled',
      teaser: v.teaser,
      content: v.content?.slice(0, 300) || null,
      username: (profile as { username: string })?.username || 'unknown',
      createdAt: v.created_at,
      reactionCount: reactionCountMap.get(v.id) || 0,
      commentCount: commentCountMap.get(v.id) || 0,
    };
  });
}

/**
 * Get a specific vibelog by ID
 */
async function getVibelog(id: string): Promise<VibelogResult | null> {
  const supabase = await createServerAdminClient();

  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      teaser,
      content,
      created_at,
      user_id,
      profiles!inner(username)
    `
    )
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error || !vibelog) {
    return null;
  }

  // Get counts
  const { count: reactionCount } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('vibelog_id', id);

  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('vibelog_id', id);

  const profile = Array.isArray(vibelog.profiles) ? vibelog.profiles[0] : vibelog.profiles;

  return {
    id: vibelog.id,
    title: vibelog.title || 'Untitled',
    teaser: vibelog.teaser,
    content: vibelog.content,
    username: (profile as { username: string })?.username || 'unknown',
    createdAt: vibelog.created_at,
    reactionCount: reactionCount || 0,
    commentCount: commentCount || 0,
  };
}

/**
 * Search users by username or display name
 */
async function searchUsers(query: string, limit: number): Promise<UserResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, is_admin')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(safeLimit);

  if (error || !profiles) {
    console.error('[TOOL] searchUsers error:', error);
    return [];
  }

  // Get vibelog counts for each user
  const results: UserResult[] = [];
  for (const profile of profiles) {
    const { count } = await supabase
      .from('vibelogs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_published', true);

    results.push({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio,
      vibelogCount: count || 0,
      isAdmin: profile.is_admin || false,
    });
  }

  return results;
}

/**
 * Get vibelogs by a specific user
 */
async function getUserVibelogs(username: string, limit: number): Promise<VibelogResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  // First get the user ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (!profile) {
    return [];
  }

  const { data: vibelogs, error } = await supabase
    .from('vibelogs')
    .select('id, title, teaser, content, created_at')
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error || !vibelogs) {
    return [];
  }

  // Get reaction/comment counts
  const vibelogIds = vibelogs.map(v => v.id);
  const { data: reactions } = await supabase
    .from('reactions')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const reactionCountMap = new Map<string, number>();
  for (const r of reactions || []) {
    reactionCountMap.set(r.vibelog_id, (reactionCountMap.get(r.vibelog_id) || 0) + 1);
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const commentCountMap = new Map<string, number>();
  for (const c of comments || []) {
    commentCountMap.set(c.vibelog_id, (commentCountMap.get(c.vibelog_id) || 0) + 1);
  }

  return vibelogs.map(v => ({
    id: v.id,
    title: v.title || 'Untitled',
    teaser: v.teaser,
    content: v.content?.slice(0, 300) || null,
    username,
    createdAt: v.created_at,
    reactionCount: reactionCountMap.get(v.id) || 0,
    commentCount: commentCountMap.get(v.id) || 0,
  }));
}

/**
 * Get latest vibelogs - simple, always returns the newest content
 */
async function getLatestVibelogs(limit: number): Promise<VibelogResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  const { data: vibelogs, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      teaser,
      content,
      created_at,
      user_id,
      profiles!inner(username)
    `
    )
    .eq('is_published', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error || !vibelogs || vibelogs.length === 0) {
    console.log('[TOOL] getLatestVibelogs: No vibelogs found');
    return [];
  }

  // Get reaction counts
  const vibelogIds = vibelogs.map(v => v.id);
  const { data: reactions } = await supabase
    .from('reactions')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const reactionCountMap = new Map<string, number>();
  for (const r of reactions || []) {
    reactionCountMap.set(r.vibelog_id, (reactionCountMap.get(r.vibelog_id) || 0) + 1);
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('vibelog_id')
    .in('vibelog_id', vibelogIds);

  const commentCountMap = new Map<string, number>();
  for (const c of comments || []) {
    commentCountMap.set(c.vibelog_id, (commentCountMap.get(c.vibelog_id) || 0) + 1);
  }

  return vibelogs.map(v => {
    const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
    return {
      id: v.id,
      title: v.title || 'Untitled',
      teaser: v.teaser,
      content: v.content?.slice(0, 300) || null,
      username: (profile as { username: string })?.username || 'unknown',
      createdAt: v.created_at,
      reactionCount: reactionCountMap.get(v.id) || 0,
      commentCount: commentCountMap.get(v.id) || 0,
    };
  });
}

/**
 * Get top creators by vibelog count
 */
async function getTopCreators(limit: number): Promise<UserResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  // Get vibelog counts grouped by user
  const { data: vibelogs } = await supabase
    .from('vibelogs')
    .select('user_id')
    .eq('is_published', true);

  if (!vibelogs) {
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
    .slice(0, safeLimit)
    .map(([id]) => id);

  if (topUserIds.length === 0) {
    return [];
  }

  // Get profiles for top users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, is_admin')
    .in('id', topUserIds);

  if (!profiles) {
    return [];
  }

  return topUserIds.map(userId => {
    const profile = profiles.find(p => p.id === userId);
    return {
      id: userId,
      username: profile?.username || 'unknown',
      displayName: profile?.display_name || null,
      bio: profile?.bio || null,
      vibelogCount: countMap.get(userId) || 0,
      isAdmin: profile?.is_admin || false,
    };
  });
}

/**
 * Get platform statistics
 */
async function getPlatformStats(): Promise<PlatformStatsResult> {
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
    vibelogsToday: todayResult.count || 0,
  };
}

/**
 * Get comments on a vibelog
 */
async function getVibelogComments(vibelogId: string, limit: number): Promise<CommentResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 20);

  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      id,
      content,
      created_at,
      user_id,
      profiles!inner(username)
    `
    )
    .eq('vibelog_id', vibelogId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error || !comments) {
    return [];
  }

  return comments.map(c => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    return {
      id: c.id,
      content: c.content,
      username: (profile as { username: string })?.username || 'unknown',
      createdAt: c.created_at,
    };
  });
}

/**
 * Get recent comments across all vibelogs
 */
async function getRecentComments(limit: number): Promise<RecentCommentResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      id,
      content,
      created_at,
      vibelog_id,
      profiles!inner(username),
      vibelogs!inner(id, title)
    `
    )
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error || !comments) {
    console.error('[TOOL] getRecentComments error:', error);
    return [];
  }

  return comments.map(c => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    const vibelog = Array.isArray(c.vibelogs) ? c.vibelogs[0] : c.vibelogs;
    return {
      id: c.id,
      content: c.content?.slice(0, 200) || '',
      username: (profile as { username: string })?.username || 'unknown',
      vibelogId: c.vibelog_id,
      vibelogTitle: (vibelog as { title: string })?.title || 'Untitled',
      createdAt: c.created_at,
    };
  });
}

/**
 * Get newest members on the platform
 */
async function getNewMembers(limit: number): Promise<NewMemberResult[]> {
  const supabase = await createServerAdminClient();
  const safeLimit = Math.min(limit, 10);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, created_at')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error || !profiles) {
    console.error('[TOOL] getNewMembers error:', error);
    return [];
  }

  return profiles.map(p => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    bio: p.bio?.slice(0, 100) || null,
    joinedAt: p.created_at,
  }));
}
