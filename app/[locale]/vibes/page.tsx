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

  // Fetch recent comments with related vibelog and profile data
  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
        id,
        content,
        audio_url,
        video_url,
        slug,
        created_at,
        profiles!comments_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        ),
        vibelogs!comments_vibelog_id_fkey (
          id,
          title,
          public_slug,
          cover_image_url,
          video_url,
          profiles!vibelogs_user_id_fkey (
            username,
            full_name
          )
        )
      `
    )
    .eq('is_public', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  // Debug logging
  console.log('🔍 [Vibes Page] Server-side query results:', {
    commentCount: comments?.length || 0,
    hasError: !!error,
    errorMessage: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details,
    hasComments: !!comments,
    firstCommentId: comments?.[0]?.id,
    timestamp: new Date().toISOString(),
  });

  // Transform the data for easier consumption
  const transformedComments: CommentCardData[] = (comments || []).map(comment => {
    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
    const vibelog = Array.isArray(comment.vibelogs) ? comment.vibelogs[0] : comment.vibelogs;
    const author = vibelog?.profiles
      ? Array.isArray(vibelog.profiles)
        ? vibelog.profiles[0]
        : vibelog.profiles
      : null;

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <VibesPageClient initialComments={transformedComments} />
        </div>
      </main>
    </div>
  );
}
