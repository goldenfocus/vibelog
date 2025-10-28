import { FileText, Calendar, Eye } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Navigation from '@/components/Navigation';
import VibelogCard from '@/components/VibelogCard';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  if (normalizedUsername === 'anonymous') {
    return {
      title: 'Anonymous Vibelogs | VibeLog',
      description: 'Explore unclaimed vibelogs from the community',
      openGraph: {
        title: 'Anonymous Vibelogs',
        description: 'Explore unclaimed vibelogs from the community',
      },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url')
    .eq('username', normalizedUsername)
    .single();

  if (!profile) {
    return { title: 'Profile Not Found' };
  }

  const displayName = profile.display_name || profile.username;
  const bio = profile.bio || `${displayName}'s vibelogs`;

  return {
    title: `${displayName} (@${profile.username}) | VibeLog`,
    description: bio,
    openGraph: {
      title: `${displayName} (@${profile.username})`,
      description: bio,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  const supabase = await createServerSupabaseClient();

  // Handle @anonymous specially
  if (normalizedUsername === 'anonymous') {
    const { data: vibelogs } = await supabase
      .from('vibelogs')
      .select('*')
      .is('user_id', null)
      .eq('is_published', true)
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(50);

    const vibelogsWithAuthor = (vibelogs || []).map(v => ({
      ...v,
      author: {
        username: 'anonymous',
        display_name: 'Anonymous',
        avatar_url: null,
      },
    }));

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-6xl px-4 pb-16 pt-24">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-electric/20 to-purple-500/20">
              <FileText className="h-12 w-12 text-electric" />
            </div>
            <h1 className="mb-2 text-4xl font-bold">Anonymous Vibelogs</h1>
            <p className="text-lg text-muted-foreground">Unclaimed vibelogs from the community</p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{vibelogsWithAuthor.length} vibelogs</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>
                  {vibelogsWithAuthor.reduce((sum, v) => sum + (v.view_count || 0), 0)} views
                </span>
              </div>
            </div>
          </div>

          {vibelogsWithAuthor.length > 0 ? (
            <div className="space-y-8">
              {vibelogsWithAuthor.map(vibelog => (
                <VibelogCard key={vibelog.id} vibelog={vibelog} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/20 bg-card p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-xl font-semibold">No anonymous vibelogs yet</h3>
              <p className="text-muted-foreground">Be the first to create one!</p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-lg bg-electric px-6 py-3 font-medium text-white transition-colors hover:bg-electric-glow"
              >
                Create Vibelog
              </Link>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Regular user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', normalizedUsername)
    .single();

  if (!profile || !profile.is_public) {
    notFound();
  }

  const { data: vibelogs } = await supabase
    .from('vibelogs')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .eq('is_public', true)
    .order('published_at', { ascending: false });

  const vibelogsWithAuthor = (vibelogs || []).map(v => ({
    ...v,
    author: {
      username: profile.username,
      display_name: profile.display_name || profile.username,
      avatar_url: profile.avatar_url,
    },
  }));

  const displayName = profile.display_name || profile.username;
  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 pb-16 pt-24">
        <div className="mb-12 text-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="mx-auto mb-4 h-24 w-24 rounded-full border-4 border-electric/20"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-electric/20 to-purple-500/20">
              <span className="text-3xl font-bold text-electric">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="mb-2 text-4xl font-bold">{displayName}</h1>
          <p className="mb-4 text-lg text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">{profile.bio}</p>
          )}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{profile.total_vibelogs || 0} vibelogs</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{profile.total_views || 0} views</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Joined {joinDate}</span>
            </div>
          </div>
        </div>

        {vibelogsWithAuthor.length > 0 ? (
          <div className="space-y-8">
            {vibelogsWithAuthor.map(vibelog => (
              <VibelogCard key={vibelog.id} vibelog={vibelog} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/20 bg-card p-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-xl font-semibold">No vibelogs yet</h3>
            <p className="text-muted-foreground">
              {displayName} hasn&apos;t published any vibelogs yet
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
