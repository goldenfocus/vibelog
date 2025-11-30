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

    // 1. Latest public vibelogs
    const { data: vibelogs, error: vibelogsError } = await supabase
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
      // Exclude stuck/incomplete video vibelogs with placeholder titles
      .neq('title', 'Video vibelog')
      .not('title', 'ilike', '%processing%')
      .order('published_at', { ascending: false })
      .limit(latestLimit);

    if (vibelogsError) {
      throw vibelogsError;
    }

    // Fetch author profiles for the latest vibelogs
    const rawVibelogs = (vibelogs || []) as RawFeedVibelog[];
    const vibelogUserIds = [
      ...new Set(rawVibelogs.map(v => v.user_id).filter(Boolean) as string[]),
    ];
    const authorMap = new Map<
      string,
      { username: string; display_name: string; avatar_url: string | null }
    >();
    if (vibelogUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', vibelogUserIds);

      if (profiles) {
        (profiles as Profile[]).forEach(profile => {
          authorMap.set(profile.id, {
            username: profile.username || 'user',
            display_name: profile.display_name || 'Vibelogger',
            avatar_url: profile.avatar_url || null,
          });
        });
      }
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

    // 2. Newest public members
    const { data: members, error: membersError } = await supabase
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
      .limit(memberLimit);

    if (membersError) {
      throw membersError;
    }

    const rawMembers = (members || []) as Array<
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
    const memberIds = rawMembers.map(m => m.id);
    const latestByMember = new Map<string, SimplifiedMemberVibelog>();
    if (memberIds.length > 0) {
      const { data: memberVibelogs } = await supabase
        .from('vibelogs')
        .select('id, title, teaser, slug, public_slug, user_id, published_at, audio_url')
        .in('user_id', memberIds)
        .eq('is_public', true)
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(memberIds.length * 3);

      if (memberVibelogs) {
        for (const entry of memberVibelogs as RawMemberVibelog[]) {
          if (!entry.user_id) {
            continue;
          }
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
    }

    const newestMembers = rawMembers.map(member => ({
      ...member,
      latest_vibelog: latestByMember.get(member.id) || null,
    }));

    // 3. Recent comments
    const commentLimit = Math.min(
      parseInt(searchParams.get('commentLimit') || `${DEFAULT_COMMENT_LIMIT}`, 10),
      30
    );

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

    try {
      // Fetch comments first (without joins, as there's no FK between comments and profiles)
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, content, audio_url, video_url, slug, created_at, user_id, vibelog_id')
        .eq('is_public', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(commentLimit);

      if (!commentsError && comments && comments.length > 0) {
        // Get unique user IDs and vibelog IDs
        const commentUserIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
        const vibelogIds = [...new Set(comments.map(c => c.vibelog_id).filter(Boolean))];

        // Fetch commentator profiles
        const { data: commentProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', commentUserIds);

        // Fetch vibelogs with their authors
        const { data: commentVibelogs } = await supabase
          .from('vibelogs')
          .select('id, title, public_slug, cover_image_url, video_url, user_id')
          .in('id', vibelogIds);

        // Get vibelog author IDs
        const vibelogAuthorIds = [
          ...new Set((commentVibelogs || []).map(v => v.user_id).filter(Boolean) as string[]),
        ];

        // Fetch vibelog author profiles
        const { data: vibelogAuthorProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', vibelogAuthorIds);

        // Create lookup maps
        const profileMap = new Map((commentProfiles || []).map(p => [p.id, p]));
        const vibelogMap = new Map((commentVibelogs || []).map(v => [v.id, v]));
        const authorMap = new Map((vibelogAuthorProfiles || []).map(a => [a.id, a]));

        // Transform comments
        recentComments = comments.map(comment => {
          const profile = profileMap.get(comment.user_id);
          const vibelog = vibelogMap.get(comment.vibelog_id);
          const author = vibelog?.user_id ? authorMap.get(vibelog.user_id) : null;

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
    } catch (error) {
      // Comments table might not exist - gracefully handle
      console.error('[home-feed] Error fetching comments:', error);
    }

    // 4. Quick stats for hero chips
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: vibesLast24h }, { count: membersLast24h }] = await Promise.all([
      supabase
        .from('vibelogs')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true)
        .eq('is_published', true)
        .gte('published_at', since),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_public', true)
        .gte('created_at', since),
    ]);

    return NextResponse.json({
      latestVibelogs,
      newestMembers,
      recentComments,
      stats: {
        vibesLast24h: vibesLast24h || 0,
        newMembersLast24h: membersLast24h || 0,
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
