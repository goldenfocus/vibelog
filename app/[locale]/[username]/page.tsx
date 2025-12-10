import { Calendar, Clock, Eye, FileText, Users } from 'lucide-react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SubscribeButton } from '@/components/channel/SubscribeButton';
import Navigation from '@/components/Navigation';
import { LikedVibelogs } from '@/components/profile/LikedVibelogs';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { ProfileVibelogsWrapper } from '@/components/profile/ProfileVibelogsWrapper';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { ZoomableImage } from '@/components/profile/ZoomableImage';
import { formatMonthYear, formatRelativeTime } from '@/lib/date-utils';
import { createServerSupabaseClient } from '@/lib/supabase';

// Channel data type for when fetching from channels table
interface ChannelData {
  id: string;
  owner_id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  header_image: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  facebook_url: string | null;
  threads_url: string | null;
  subscriber_count: number;
  vibelog_count: number;
  total_views: number;
  is_public: boolean;
  created_at: string;
}

// Force dynamic rendering to show updated profile images immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

// Unified profile/channel data type
interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  full_name?: string | null;
  bio: string | null;
  avatar_url: string | null;
  header_image: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  threads_url: string | null;
  website_url: string | null;
  total_vibelogs: number;
  total_views: number;
  total_shares: number;
  subscriber_count?: number;
  created_at: string;
  last_sign_in_at?: string | null;
  is_public: boolean;
  is_channel?: boolean; // New: indicates if this is a channel vs legacy profile
  channel_id?: string; // New: the channel ID for fetching vibelogs
  owner_id?: string; // New: the user who owns this channel
}

// Fetch channel by handle (new approach)
async function getChannel(handle: string): Promise<ChannelData | null> {
  const supabase = await createServerSupabaseClient();

  const { data: channel, error } = await supabase
    .from('channels')
    .select(
      `
      id,
      owner_id,
      handle,
      name,
      bio,
      avatar_url,
      header_image,
      website_url,
      twitter_url,
      instagram_url,
      youtube_url,
      tiktok_url,
      linkedin_url,
      github_url,
      facebook_url,
      threads_url,
      subscriber_count,
      vibelog_count,
      total_views,
      is_public,
      created_at
    `
    )
    .eq('handle', handle.toLowerCase())
    .single();

  if (error || !channel) {
    return null;
  }

  return channel as ChannelData;
}

// Fetch profile data (server-side) - now checks channels first
async function getProfile(username: string): Promise<ProfileData | null> {
  const supabase = await createServerSupabaseClient();

  // Normalize username (strip @ if present)
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  // Handle anonymous profile
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
      bio: 'Anonymous vibelogs from users who posted without signing in.',
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

  // NEW: First try to find a channel with this handle
  const channel = await getChannel(normalizedUsername);
  if (channel && channel.is_public) {
    return {
      id: channel.owner_id, // Use owner_id for user-level operations
      username: channel.handle,
      display_name: channel.name,
      bio: channel.bio,
      avatar_url: channel.avatar_url,
      header_image: channel.header_image,
      twitter_url: channel.twitter_url,
      instagram_url: channel.instagram_url,
      linkedin_url: channel.linkedin_url,
      github_url: channel.github_url,
      youtube_url: channel.youtube_url,
      tiktok_url: channel.tiktok_url,
      facebook_url: channel.facebook_url,
      threads_url: channel.threads_url,
      website_url: channel.website_url,
      total_vibelogs: channel.vibelog_count,
      total_views: channel.total_views,
      total_shares: 0, // Channels don't track shares yet
      subscriber_count: channel.subscriber_count,
      created_at: channel.created_at,
      is_public: channel.is_public,
      is_channel: true,
      channel_id: channel.id,
      owner_id: channel.owner_id,
    };
  }

  // FALLBACK: Fetch from profiles table (for pioneer accounts with short handles)
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
      last_sign_in_at,
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

  return {
    ...profile,
    is_channel: false,
  };
}

// Fetch vibelogs - supports both channel_id and user_id modes
async function getVibelogs(profile: ProfileData) {
  const supabase = await createServerSupabaseClient();

  // Handle anonymous vibelogs
  if (profile.id === 'anonymous') {
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
        comment_count,
        read_time,
        word_count,
        tags,
        public_slug,
        original_language,
        available_languages,
        translations
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

  // NEW: If this is a channel, fetch by channel_id
  if (profile.is_channel && profile.channel_id) {
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
        video_url,
        video_source,
        video_uploaded_at,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        comment_count,
        read_time,
        word_count,
        tags,
        original_language,
        available_languages,
        translations
      `
      )
      .eq('channel_id', profile.channel_id)
      .eq('is_published', true)
      .eq('is_public', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching channel vibelogs:', error);
      return [];
    }

    return vibelogs || [];
  }

  // FALLBACK: Fetch by user_id (legacy profiles)
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
      video_url,
      video_source,
      video_uploaded_at,
      created_at,
      published_at,
      view_count,
      like_count,
      share_count,
      comment_count,
      read_time,
      word_count,
      tags,
      original_language,
      available_languages,
      translations
    `
    )
    .eq('user_id', profile.id)
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

// Build sameAs array for Person schema (social profile links)
function buildSameAsLinks(profile: ProfileData): string[] {
  const links: string[] = [];
  if (profile.twitter_url) {
    links.push(profile.twitter_url);
  }
  if (profile.instagram_url) {
    links.push(profile.instagram_url);
  }
  if (profile.youtube_url) {
    links.push(profile.youtube_url);
  }
  if (profile.tiktok_url) {
    links.push(profile.tiktok_url);
  }
  if (profile.linkedin_url) {
    links.push(profile.linkedin_url);
  }
  if (profile.github_url) {
    links.push(profile.github_url);
  }
  if (profile.facebook_url) {
    links.push(profile.facebook_url);
  }
  if (profile.threads_url) {
    links.push(profile.threads_url);
  }
  if (profile.website_url) {
    links.push(profile.website_url);
  }
  return links;
}

// Generate ProfilePage + Person JSON-LD schema
function generateProfileSchema(profile: ProfileData, vibelogCount: number) {
  const profileUrl = `https://vibelog.io/${profile.username}`;
  const displayName = profile.display_name || profile.username;
  const sameAsLinks = buildSameAsLinks(profile);

  // Person schema as the main entity
  const personSchema: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${profileUrl}#person`,
    name: displayName,
    alternateName: `@${profile.username}`,
    url: profileUrl,
  };

  // Add optional fields only if they exist
  if (profile.bio) {
    personSchema.description = profile.bio;
  }
  if (profile.avatar_url) {
    personSchema.image = {
      '@type': 'ImageObject',
      url: profile.avatar_url,
      contentUrl: profile.avatar_url,
    };
  }
  if (sameAsLinks.length > 0) {
    personSchema.sameAs = sameAsLinks;
  }

  // Interaction statistics
  const interactionStatistics: Record<string, unknown>[] = [];

  // Subscriber/follower count (for channels)
  if (profile.is_channel && profile.subscriber_count !== undefined) {
    interactionStatistics.push({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'FollowAction' },
      userInteractionCount: profile.subscriber_count,
    });
  }

  // Total views as interaction stat
  if (profile.total_views > 0) {
    interactionStatistics.push({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: profile.total_views,
    });
  }

  if (interactionStatistics.length > 0) {
    personSchema.interactionStatistic = interactionStatistics;
  }

  // ProfilePage schema wrapping the Person
  const profilePageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': profileUrl,
    url: profileUrl,
    name: `${displayName} (@${profile.username}) - VibeLog`,
    description: profile.bio || `${displayName}'s voice-to-text vibelogs on VibeLog`,
    dateCreated: profile.created_at,
    mainEntity: personSchema,
    // CollectionPage aspect - the profile contains a collection of vibelogs
    mainContentOfPage: {
      '@type': 'ItemList',
      numberOfItems: vibelogCount,
      itemListElement: {
        '@type': 'ListItem',
        item: {
          '@type': 'Blog',
          name: `${displayName}'s Vibelogs`,
          description: `Voice-to-text blog posts by ${displayName}`,
          author: { '@id': `${profileUrl}#person` },
        },
      },
    },
    // Link to global Organization via @id
    publisher: {
      '@id': 'https://vibelog.io/#organization',
    },
    // Part of the main website
    isPartOf: {
      '@id': 'https://vibelog.io/#website',
    },
    // Breadcrumb navigation
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://vibelog.io',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: displayName,
          item: profileUrl,
        },
      ],
    },
  };

  return profilePageSchema;
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    notFound();
  }

  const vibelogs = await getVibelogs(profile);

  const displayName = profile.display_name || profile.username;
  const joinDate = formatMonthYear(profile.created_at);

  // Generate structured data for SEO
  const profileSchema = generateProfileSchema(profile, vibelogs.length);

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />

      <Navigation />

      <main>
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {profile.is_channel && (
                      <SubscribeButton
                        channelHandle={profile.username}
                        channelOwnerId={profile.owner_id}
                      />
                    )}
                    <ProfileActions profileUserId={profile.id} username={profile.username} />
                  </div>

                  {/* Stats and Social Links */}
                  <div
                    className="animate-fadeInUp flex flex-col gap-6 sm:flex-row sm:gap-8"
                    style={{ animationDelay: '150ms' }}
                  >
                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm sm:gap-6">
                      {/* Subscribers - only for channels */}
                      {profile.is_channel && profile.subscriber_count !== undefined && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-electric" />
                          <span className="font-semibold text-foreground">
                            {profile.subscriber_count.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            {profile.subscriber_count === 1 ? 'subscriber' : 'subscribers'}
                          </span>
                        </div>
                      )}
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
                        <span className="text-muted-foreground">
                          {profile.is_channel ? 'Created' : 'Joined'} {joinDate}
                        </span>
                      </div>
                      {profile.last_sign_in_at && !profile.is_channel && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-electric" />
                          <span className="text-muted-foreground">
                            Active {formatRelativeTime(profile.last_sign_in_at)}
                          </span>
                        </div>
                      )}
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
            <ProfileVibelogsWrapper
              vibelogs={vibelogs}
              username={profile.username}
              displayName={displayName}
              avatarUrl={profile.avatar_url}
            />
          </div>
        </div>

        {/* Liked Vibelogs Section */}
        <div className="border-t border-border/50 bg-gradient-to-b from-surface-subtle to-background">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <LikedVibelogs userId={profile.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
