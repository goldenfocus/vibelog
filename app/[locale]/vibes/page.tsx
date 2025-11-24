import type { Metadata } from 'next';

import type { CommentCardData } from '@/components/home/CommentCard';
import Navigation from '@/components/Navigation';
import { VibesPageClient } from '@/components/vibes/VibesPageClient';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Recent Vibes - VibeLog',
  description:
    'Explore the latest vibes from the VibeLog community. Discover voice notes, videos, and thoughts shared by creators worldwide.',
};

/**
 * Public Vibes Feed Page (Server Component)
 * Fetches comments server-side to bypass Vercel security checkpoint
 */
export default async function VibesPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch recent comments (without joins, as there's no FK between comments and profiles)
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, content, audio_url, video_url, slug, created_at, user_id, vibelog_id')
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  // DEBUG: Log query results server-side
  console.log('🔍 [VIBES PAGE DEBUG]', {
    timestamp: new Date().toISOString(),
    commentCount: comments?.length || 0,
    hasError: !!error,
    errorMessage: error?.message,
    errorCode: error?.code,
  });

  let transformedComments: CommentCardData[] = [];

  if (comments && comments.length > 0) {
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

    // Transform the data for easier consumption
    transformedComments = comments.map(comment => {
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

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-electric/5 via-transparent to-transparent" />

      <Navigation />
      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <VibesPageClient initialComments={transformedComments} />
        </div>
      </main>
    </div>
  );
}
