import { Calendar, Eye, FileText, ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProfileVibelogs } from '@/components/profile/ProfileVibelogs';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { ZoomableImage } from '@/components/profile/ZoomableImage';
import { formatMonthYear } from '@/lib/date-utils';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

// Fetch profile data (server-side)
async function getProfile(username: string) {
  const supabase = await createServerSupabaseClient();

  // Normalize username (strip @ if present)
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  // Handle anonymous profile (unclaimed vibelogs)
  if (normalizedUsername === 'anonymous') {
    // Get aggregate stats for anonymous vibelogs
    const { data: vibelogs } = await supabase
      .from('vibelogs')
      .select('id, view_count')
      .is('user_id', null)
      .eq('is_published', true)
      .eq('is_public', true);

    const totalVibelogs = vibelogs?.length || 0;
    const totalViews = vibelogs?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;

    return {
      id: 'anonymous',
      username: 'anonymous',
      display_name: 'Anonymous',
      full_name: null,
      bio: 'Unclaimed vibelogs created before signing in. Sign in to claim your vibelogs!',
      avatar_url: null,
      header_image: null,
      twitter_url: null,
      instagram_url: null,
      linkedin_url: null,
      github_url: null,
      youtube_url: null,
      tiktok_url: null,
      facebook_url: null,
      threads_url: null,
      website_url: null,
      total_vibelogs: totalVibelogs,
      total_views: totalViews,
      total_shares: 0,
      created_at: new Date().toISOString(),
      is_public: true,
    };
  }

  // Fetch profile data
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      username,
      display_name,
      full_name,
      bio,
      avatar_url,
      header_image,
      twitter_url,
      instagram_url,
      linkedin_url,
      github_url,
      youtube_url,
      tiktok_url,
      facebook_url,
      threads_url,
      website_url,
      total_vibelogs,
      total_views,
      total_shares,
      created_at,
      is_public
    `
    )
    .eq('username', normalizedUsername)
    .single();

  if (error || !profile) {
    console.error('Profile not found:', error);
    return null;
  }

  // Check if profile is public
  if (!profile.is_public) {
    return null;
  }

  return profile;
}

// Fetch user's published vibelogs
async function getVibelogs(userId: string) {
  const supabase = await createServerSupabaseClient();

  // Handle anonymous vibelogs (unclaimed vibelogs)
  if (userId === 'anonymous') {
    const { data: vibelogs, error } = await supabase
      .from('vibelogs')
      .select(
        `
        id,
        title,
        slug,
        content,
        teaser,
        audio_url,
        audio_duration,
        cover_image_url,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        read_time,
        word_count,
        tags,
        public_slug
      `
      )
      .is('user_id', null)
      .eq('is_published', true)
      .eq('is_public', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching anonymous vibelogs:', error);
      return [];
    }

    return vibelogs || [];
  }

  const { data: vibelogs, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      slug,
      content,
      teaser,
      audio_url,
      audio_duration,
      cover_image_url,
      created_at,
      published_at,
      view_count,
      like_count,
      share_count,
      read_time,
      word_count,
      tags
    `
    )
    .eq('user_id', userId)
    .eq('is_published', true)
    .eq('is_public', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching vibelogs:', error);
    return [];
  }

  return vibelogs || [];
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return {
      title: 'Profile Not Found',
    };
  }

  const displayName = profile.display_name || profile.username;
  const bio = profile.bio || `${displayName}'s vibelogs`;

  return {
    title: `${displayName} (@${profile.username})`,
    description: bio,
    openGraph: {
      title: `${displayName} (@${profile.username})`,
      description: bio,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
    twitter: {
      card: 'summary',
      title: `${displayName} (@${profile.username})`,
      description: bio,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    notFound();
  }

  const vibelogs = await getVibelogs(profile.id);

  const displayName = profile.display_name || profile.username;
  const joinDate = formatMonthYear(profile.created_at);

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </Link>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative">
        {/* Header Image */}
        {profile.header_image && (
          <div className="group relative h-48 overflow-hidden sm:h-64 md:h-80">
            <ZoomableImage
              src={profile.header_image}
              alt={`${displayName}'s header image`}
              className="h-full w-full object-cover"
              wrapperClassName="h-full"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 to-black/50" />
          </div>
        )}
        {!profile.header_image && (
          <div className="h-48 bg-gradient-to-br from-electric/20 via-background to-background sm:h-64 md:h-80" />
        )}

        {/* Profile Info Container */}
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative">
            {/* Avatar - overlaps header */}
            <div className="absolute -top-16 left-0 sm:-top-20">
              <div className="relative">
                <div className="bg-surface h-32 w-32 overflow-hidden rounded-full border-4 border-background shadow-xl sm:h-40 sm:w-40">
                  {profile.avatar_url ? (
                    <ZoomableImage
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      rounded={true}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-electric/30 to-electric/10">
                      <span className="text-4xl font-bold text-electric sm:text-5xl">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="pb-8 pt-20 sm:pt-24">
              <div className="flex flex-col gap-6">
                {/* Name and Username */}
                <div className="space-y-2">
                  <h1 className="animate-fadeInUp text-3xl font-bold text-foreground sm:text-4xl">
                    {displayName}
                  </h1>
                  <p
                    className="animate-fadeInUp text-lg text-muted-foreground"
                    style={{ animationDelay: '50ms' }}
                  >
                    @{profile.username}
                  </p>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p
                    className="animate-fadeInUp max-w-2xl text-base leading-relaxed text-foreground/90 sm:text-lg"
                    style={{ animationDelay: '100ms' }}
                  >
                    {profile.bio}
                  </p>
                )}

                {/* Stats and Social Links */}
                <div
                  className="animate-fadeInUp flex flex-col gap-6 sm:flex-row sm:gap-8"
                  style={{ animationDelay: '150ms' }}
                >
                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-electric" />
                      <span className="font-semibold text-foreground">
                        {profile.total_vibelogs}
                      </span>
                      <span className="text-muted-foreground">
                        {profile.total_vibelogs === 1 ? 'vibelog' : 'vibelogs'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-electric" />
                      <span className="font-semibold text-foreground">
                        {profile.total_views.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-electric" />
                      <span className="text-muted-foreground">Joined {joinDate}</span>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <SocialLinks profile={profile} animated={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vibelogs Section */}
      <div className="border-t border-border/50 bg-gradient-to-b from-background to-surface-subtle">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <ProfileVibelogs
            vibelogs={vibelogs}
            username={profile.username}
            displayName={displayName}
            avatarUrl={profile.avatar_url}
          />
        </div>
      </div>
    </div>
  );
}
