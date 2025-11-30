import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export const runtime = 'nodejs';

const DEFAULT_VIBELOG_LIMIT = 12;
const DEFAULT_MEMBER_LIMIT = 12;
const DEFAULT_COMMENT_LIMIT = 12;

type RawFeedVibelog = {
  id: string;
  title: string;
  slug?: string | null;
  public_slug?: string | null;
  teaser?: string | null;
  content: string;
  cover_image_url?: string | null;
  audio_url?: string | null;
  created_at: string;
  published_at: string;
  read_time?: number | null;
  like_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
  user_id?: string | null;
  original_language?: string | null;
  available_languages?: string[] | null;
  translations?: Record<string, { title?: string; teaser?: string; content?: string }> | null;
};

type RawMemberVibelog = {
  id: string;
  title: string;
  teaser?: string | null;
  slug?: string | null;
  public_slug?: string | null;
  user_id?: string | null;
  published_at?: string | null;
  audio_url?: string | null;
};

type SimplifiedMemberVibelog = {
  id: string;
  title: string;
  teaser: string | null;
  slug: string | null;
  public_slug: string | null;
  published_at: string | null;
  audio_url: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const latestLimit = Math.min(
      parseInt(searchParams.get('vibelogLimit') || `${DEFAULT_VIBELOG_LIMIT}`, 10),
      30
    );
    const memberLimit = Math.min(
      parseInt(searchParams.get('memberLimit') || `${DEFAULT_MEMBER_LIMIT}`, 10),
      30
    );
    const commentLimit = Math.min(
      parseInt(searchParams.get('commentLimit') || `${DEFAULT_COMMENT_LIMIT}`, 10),
      30
    );

    // Run ALL primary queries in parallel for maximum speed
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [vibelogsResult, membersResult, commentsResult, vibesStatsResult, membersStatsResult] =
      await Promise.all([
        // 1. Latest public vibelogs
        supabase
          .from('vibelogs')
          .select(
            `
          id,
          title,
          slug,
          public_slug,
          teaser,
          content,
          cover_image_url,
          audio_url,
          video_url,
          created_at,
          published_at,
          read_time,
          like_count,
          share_count,
          view_count,
          user_id,
          original_language,
          available_languages,
          translations
        `
          )
          .eq('is_public', true)
          .eq('is_published', true)
          .neq('title', 'Video vibelog')
          .not('title', 'ilike', '%processing%')
          .order('published_at', { ascending: false })
          .limit(latestLimit),

        // 2. Newest public members
        supabase
          .from('profiles')
          .select(
            `
          id,
          username,
          display_name,
          avatar_url,
          header_image,
          bio,
          total_vibelogs,
          created_at
        `
          )
          .eq('is_public', true)
          .not('username', 'is', null)
          .order('created_at', { ascending: false })
          .limit(memberLimit),

        // 3. Recent comments
        supabase
          .from('comments')
          .select('id, content, audio_url, video_url, slug, created_at, user_id, vibelog_id')
          .eq('is_public', true)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(commentLimit),

        // 4. Stats: vibes last 24h
        supabase
          .from('vibelogs')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true)
          .eq('is_published', true)
          .gte('published_at', since),

        // 5. Stats: members last 24h
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true)
          .gte('created_at', since),
      ]);

    if (vibelogsResult.error) {
      throw vibelogsResult.error;
    }
    if (membersResult.error) {
      throw membersResult.error;
    }

    const rawVibelogs = (vibelogsResult.data || []) as RawFeedVibelog[];
    const rawMembers = (membersResult.data || []) as Array<
      Pick<
        Profile,
        | 'id'
        | 'username'
        | 'display_name'
        | 'avatar_url'
        | 'header_image'
        | 'bio'
        | 'total_vibelogs'
        | 'created_at'
      >
    >;
    const comments = commentsResult.data || [];

    // Collect all user IDs we need profiles for (deduplicated)
    const vibelogUserIds = rawVibelogs.map(v => v.user_id).filter(Boolean) as string[];
    const memberIds = rawMembers.map(m => m.id);
    const commentUserIds = comments.map(c => c.user_id).filter(Boolean) as string[];
    const vibelogIds = [...new Set(comments.map(c => c.vibelog_id).filter(Boolean))];

    // Run secondary queries in parallel (author profiles, member vibelogs, comment data)
    const [
      vibelogProfilesResult,
      memberVibelogsResult,
      commentProfilesResult,
      commentVibelogsResult,
    ] = await Promise.all([
      // Vibelog author profiles
      vibelogUserIds.length > 0
        ? supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', [...new Set(vibelogUserIds)])
        : Promise.resolve({ data: [] }),

      // Latest vibelog per member (for member cards)
      memberIds.length > 0
        ? supabase
            .from('vibelogs')
            .select('id, title, teaser, slug, public_slug, user_id, published_at, audio_url')
            .in('user_id', memberIds)
            .eq('is_public', true)
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .limit(memberIds.length * 3)
        : Promise.resolve({ data: [] }),

      // Commentator profiles
      commentUserIds.length > 0
        ? supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', [...new Set(commentUserIds)])
        : Promise.resolve({ data: [] }),

      // Vibelogs mentioned in comments (with author)
      vibelogIds.length > 0
        ? supabase
            .from('vibelogs')
            .select('id, title, public_slug, cover_image_url, video_url, user_id')
            .in('id', vibelogIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build vibelog author map
    const authorMap = new Map<
      string,
      { username: string; display_name: string; avatar_url: string | null }
    >();
    if (vibelogProfilesResult.data) {
      (vibelogProfilesResult.data as Profile[]).forEach(profile => {
        authorMap.set(profile.id, {
          username: profile.username || 'user',
          display_name: profile.display_name || 'Vibelogger',
          avatar_url: profile.avatar_url || null,
        });
      });
    }

    const latestVibelogs = rawVibelogs.map(v => ({
      ...v,
      author: v.user_id
        ? {
            username: authorMap.get(v.user_id)?.username ?? 'user',
            display_name: authorMap.get(v.user_id)?.display_name ?? 'Vibelogger',
            avatar_url: authorMap.get(v.user_id)?.avatar_url ?? null,
          }
        : {
            username: 'anonymous',
            display_name: 'Anonymous',
            avatar_url: null,
          },
    }));

    // Build member's latest vibelog map
    const latestByMember = new Map<string, SimplifiedMemberVibelog>();
    if (memberVibelogsResult.data) {
      for (const entry of memberVibelogsResult.data as RawMemberVibelog[]) {
        if (!entry.user_id) continue;
        if (!latestByMember.has(entry.user_id)) {
          latestByMember.set(entry.user_id, {
            id: entry.id,
            title: entry.title,
            teaser: entry.teaser ?? null,
            slug: entry.slug ?? null,
            public_slug: entry.public_slug ?? null,
            published_at: entry.published_at ?? null,
            audio_url: entry.audio_url ?? null,
          });
        }
      }
    }

    const newestMembers = rawMembers.map(member => ({
      ...member,
      latest_vibelog: latestByMember.get(member.id) || null,
    }));

    // Process comments - need one more query for vibelog authors
    let recentComments: Array<{
      id: string;
      content: string | null;
      audioUrl: string | null;
      videoUrl: string | null;
      slug: string | null;
      createdAt: string;
      commentator: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      vibelog: {
        id: string;
        title: string;
        slug: string | null;
        coverImageUrl: string | null;
        videoUrl: string | null;
        author: { username: string; displayName: string };
      };
    }> = [];

    if (comments.length > 0 && commentVibelogsResult.data) {
      // Fetch vibelog author profiles
      const vibelogAuthorIds = [
        ...new Set(
          (commentVibelogsResult.data || []).map(v => v.user_id).filter(Boolean) as string[]
        ),
      ];

      const { data: vibelogAuthorProfiles } =
        vibelogAuthorIds.length > 0
          ? await supabase.from('profiles').select('id, username, full_name').in('id', vibelogAuthorIds)
          : { data: [] };

      // Create lookup maps
      const profileMap = new Map((commentProfilesResult.data || []).map(p => [p.id, p]));
      const vibelogMap = new Map((commentVibelogsResult.data || []).map(v => [v.id, v]));
      const commentAuthorMap = new Map((vibelogAuthorProfiles || []).map(a => [a.id, a]));

      // Transform comments
      recentComments = comments.map(comment => {
        const profile = profileMap.get(comment.user_id);
        const vibelog = vibelogMap.get(comment.vibelog_id);
        const author = vibelog?.user_id ? commentAuthorMap.get(vibelog.user_id) : null;

        return {
          id: comment.id,
          content: comment.content,
          audioUrl: comment.audio_url,
          videoUrl: comment.video_url,
          slug: comment.slug,
          createdAt: comment.created_at,
          commentator: {
            id: profile?.id || '',
            username: profile?.username || 'anonymous',
            displayName: profile?.full_name || profile?.username || 'Anonymous',
            avatarUrl: profile?.avatar_url || null,
          },
          vibelog: {
            id: vibelog?.id || '',
            title: vibelog?.title || 'Untitled',
            slug: vibelog?.public_slug || null,
            coverImageUrl: vibelog?.cover_image_url || null,
            videoUrl: vibelog?.video_url || null,
            author: {
              username: author?.username || 'anonymous',
              displayName: author?.full_name || author?.username || 'Anonymous',
            },
          },
        };
      });
    }

    return NextResponse.json({
      latestVibelogs,
      newestMembers,
      recentComments,
      stats: {
        vibesLast24h: vibesStatsResult.count || 0,
        newMembersLast24h: membersStatsResult.count || 0,
      },
    });
  } catch (error) {
    console.error('[home-feed] Failed to build home feed', error);
    return NextResponse.json(
      { error: 'Unable to load community highlights right now.' },
      { status: 500 }
    );
  }
}
