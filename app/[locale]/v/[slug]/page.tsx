import { User } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Comments from '@/components/comments/Comments';
import { ExportLinks } from '@/components/ExportLinks';
import Navigation from '@/components/Navigation';
import PublicVibelogContent from '@/components/PublicVibelogContent';
import { formatFullDate } from '@/lib/date-utils';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select('id, seo_title, seo_description, title, cover_image_url')
    .eq('public_slug', slug)
    .single();

  // Log error for debugging but return generic metadata instead of "Not Found"
  if (error || !vibelog) {
    console.error('Metadata fetch error:', { slug, error });
    return {
      title: 'VibeLog - Turn Your Voice Into Stories',
      description: 'Share your story with the world on VibeLog',
    };
  }

  const coverImage = vibelog.cover_image_url;
  const exportUrl = `${BASE_URL}/api/export/${vibelog.id}`;

  // Create unique metadata per vibelog
  const fallbackDescription =
    vibelog.seo_description ||
    (vibelog.title
      ? `Read "${vibelog.title}" on VibeLog`
      : 'Share your story with the world on VibeLog');

  return {
    title: `${vibelog.title} | VibeLog`,
    description: fallbackDescription,
    openGraph: {
      title: vibelog.title,
      description: fallbackDescription,
      images: coverImage ? [{ url: coverImage }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: vibelog.title,
      description: fallbackDescription,
      images: coverImage ? [coverImage] : [],
    },
    // Export format alternate links for AI/bots
    alternates: {
      types: {
        'application/json': `${exportUrl}/json`,
        'text/markdown': `${exportUrl}/markdown`,
        'text/html': `${exportUrl}/html`,
        'text/plain': `${exportUrl}/text`,
      },
    },
  };
}

export default async function PublicVibelogPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch the vibelog by public_slug
  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select('*')
    .eq('public_slug', slug)
    .single();

  if (error || !vibelog) {
    console.error('Vibelog not found:', { slug, error });
    notFound(); // Use custom branded 404 page
  }

  // Fetch author data separately to ensure we get current username
  // This ensures we always get the latest username even if it was changed
  let author = null;
  if (vibelog.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', vibelog.user_id)
      .single();

    if (profile) {
      author = {
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    }
  }

  // Attach author data to vibelog
  const vibelogWithAuthor = {
    ...vibelog,
    author,
  };

  const coverImage = vibelogWithAuthor.cover_url || vibelogWithAuthor.cover_image_url;
  const isAnonymous = !vibelogWithAuthor.user_id;

  return (
    <div className="min-h-screen bg-background">
      {/* View tracking pixel - browsers ALWAYS load images, guaranteed to work */}
      <img
        src={`/api/track-view/${vibelogWithAuthor.id}`}
        alt=""
        width={1}
        height={1}
        style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
      />

      <Navigation />

      {/* Main content */}
      <main className="container mx-auto max-w-3xl px-4 pb-12 pt-24">
        {/* Cover Image */}
        {coverImage && (
          <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl border border-border/10 shadow-lg">
            <Image
              src={coverImage}
              alt={vibelogWithAuthor.cover_image_alt || vibelogWithAuthor.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-2xl font-bold leading-tight text-transparent dark:from-blue-400 dark:to-violet-400 sm:text-4xl">
          {vibelogWithAuthor.title}
        </h1>

        {/* Author & Meta */}
        {vibelogWithAuthor.author && !isAnonymous && (
          <div className="mb-6 flex items-center gap-3 border-b border-border/30 pb-6">
            <Link
              href={`/@${vibelogWithAuthor.author.username}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              {vibelogWithAuthor.author.avatar_url ? (
                <img
                  src={vibelogWithAuthor.author.avatar_url}
                  alt={vibelogWithAuthor.author.display_name}
                  className="h-12 w-12 rounded-full border-2 border-electric/20"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
                  <User className="h-6 w-6 text-electric" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground transition-colors hover:text-electric">
                  {vibelogWithAuthor.author.display_name}
                </p>
                <p className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  @{vibelogWithAuthor.author.username}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Meta */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:mb-8 sm:gap-4">
          {vibelogWithAuthor.published_at && (
            <>
              <span>{formatFullDate(vibelogWithAuthor.published_at)}</span>
              <span>•</span>
            </>
          )}
          <span>{vibelogWithAuthor.read_time} min read</span>
          <span>•</span>
          <span>{vibelogWithAuthor.word_count} words</span>
          {vibelogWithAuthor.view_count > 0 && (
            <>
              <span>•</span>
              <span>{vibelogWithAuthor.view_count} views</span>
            </>
          )}
        </div>

        {/* Content with formatting + action buttons */}
        <PublicVibelogContent
          vibelog={{
            id: vibelogWithAuthor.id,
            title: vibelogWithAuthor.title,
            content: vibelogWithAuthor.content,
            slug: vibelogWithAuthor.slug,
            user_id: vibelogWithAuthor.user_id,
            public_slug: vibelogWithAuthor.public_slug,
            audio_url: vibelogWithAuthor.audio_url,
            ai_audio_url: vibelogWithAuthor.ai_audio_url,
            created_at: vibelogWithAuthor.created_at,
            author: vibelogWithAuthor.author,
          }}
        />

        {/* Audio player if available */}
        {vibelogWithAuthor.audio_url && (
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-semibold">Listen to this VibeLog</h2>
            <audio controls className="w-full" preload="auto">
              <source src={vibelogWithAuthor.audio_url} type="audio/webm" />
              <source src={vibelogWithAuthor.audio_url} type="audio/mp3" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Export Links - AI & human-friendly format downloads */}
        <ExportLinks
          vibelogId={vibelogWithAuthor.id}
          vibelogSlug={vibelogWithAuthor.slug || vibelogWithAuthor.public_slug}
          audioUrl={vibelogWithAuthor.audio_url}
          className="mt-12"
        />

        {/* Comments Section */}
        <div className="mt-12">
          <Comments vibelogId={vibelogWithAuthor.id} />
        </div>

        {/* Footer CTA */}
        <div className="mt-16 border-t border-border/40 pt-8 text-center">
          <p className="mb-4 text-muted-foreground">
            {isAnonymous
              ? 'Create your own VibeLog in seconds'
              : 'Enjoyed this post? Create your own!'}
          </p>
          <Link
            href={`/${locale}/`}
            className="inline-block rounded-lg border border-border bg-background px-6 py-3 font-medium hover:bg-muted"
          >
            Try VibeLog Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/40 bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <Link href={`/${locale}/`} className="font-medium hover:text-foreground">
              VibeLog
            </Link>{' '}
            — Turn your voice into beautiful stories
          </p>
        </div>
      </footer>
    </div>
  );
}
