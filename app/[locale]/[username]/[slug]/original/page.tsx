import { Mic, User } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Navigation from '@/components/Navigation';
import { formatFullDate } from '@/lib/date-utils';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

// Reserved paths that should not be treated as usernames
const RESERVED_PATHS = [
  'about',
  'api',
  'auth',
  'community',
  'dashboard',
  'faq',
  'people',
  'pricing',
  'settings',
  'v',
  'vibelogs',
  'mic-lab',
  'transcript-lab',
  'processing-lab',
  'publish-lab',
];

// Fetch vibelog data with transcript (server-side)
async function getVibelogWithTranscript(username: string, slug: string) {
  const supabase = await createServerSupabaseClient();

  // Normalize username (strip @ if present)
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  // Reject reserved paths
  if (RESERVED_PATHS.includes(normalizedUsername)) {
    return null;
  }

  // Handle anonymous vibelogs
  if (normalizedUsername === 'anonymous') {
    // Try public_slug first, then slug
    let { data, error } = await supabase
      .from('vibelogs')
      .select(
        `
        id, title, slug, content, teaser, transcript,
        audio_url, ai_audio_url, video_url, cover_image_url,
        created_at, published_at, view_count, read_time, word_count, tags,
        user_id, public_slug
      `
      )
      .eq('public_slug', slug)
      .eq('is_published', true)
      .eq('is_public', true)
      .maybeSingle();

    if (!data && !error) {
      const slugResult = await supabase
        .from('vibelogs')
        .select(
          `
          id, title, slug, content, teaser, transcript,
          audio_url, ai_audio_url, video_url, cover_image_url,
          created_at, published_at, view_count, read_time, word_count, tags,
          user_id, public_slug
        `
        )
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('is_public', true)
        .maybeSingle();
      data = slugResult.data;
      error = slugResult.error;
    }

    if (error || !data) {
      return null;
    }

    let author = {
      username: 'anonymous',
      display_name: 'Anonymous',
      avatar_url: null as string | null,
    };
    if (data.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', data.user_id)
        .single();
      if (profile) {
        author = profile;
      }
    }

    return { ...data, author };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', normalizedUsername)
    .single();

  if (!profile) {
    return null;
  }

  // Query vibelog by slug or public_slug
  let { data, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id, title, slug, content, teaser, transcript,
      audio_url, ai_audio_url, video_url, cover_image_url,
      created_at, published_at, view_count, read_time, word_count, tags,
      user_id, public_slug
    `
    )
    .eq('slug', slug)
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .eq('is_public', true)
    .single();

  if (error || !data) {
    const publicSlugResult = await supabase
      .from('vibelogs')
      .select(
        `
        id, title, slug, content, teaser, transcript,
        audio_url, ai_audio_url, video_url, cover_image_url,
        created_at, published_at, view_count, read_time, word_count, tags,
        user_id, public_slug
      `
      )
      .eq('public_slug', slug)
      .eq('user_id', profile.id)
      .eq('is_published', true)
      .eq('is_public', true)
      .single();
    data = publicSlugResult.data;
    error = publicSlugResult.error;
  }

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    author: {
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
  };
}

// Generate SEO metadata for Original page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const vibelog = await getVibelogWithTranscript(username, slug);

  if (!vibelog) {
    return { title: 'Original Recording Not Found' };
  }

  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  const hasOriginalMedia = !!(vibelog.audio_url || vibelog.video_url);

  // Use transcript for description on original page
  const description = vibelog.transcript
    ? vibelog.transcript.substring(0, 160) + (vibelog.transcript.length > 160 ? '...' : '')
    : hasOriginalMedia
      ? `Listen to the original voice recording of "${vibelog.title}" by @${normalizedUsername}`
      : `Original content for "${vibelog.title}" by @${normalizedUsername}`;

  const imageUrl = vibelog.cover_image_url || 'https://vibelog.io/og-image.png';
  const canonicalUrl = `https://vibelog.io/@${normalizedUsername}/${slug}/original`;
  const vibelogUrl = `https://vibelog.io/@${normalizedUsername}/${slug}`;

  return {
    title: `Original Recording: ${vibelog.title} | @${normalizedUsername}`,
    description,
    keywords: [
      'original recording',
      'voice transcript',
      'audio content',
      ...(vibelog.tags || []),
    ].join(', '),
    authors: [{ name: vibelog.author.display_name || normalizedUsername }],
    openGraph: {
      title: `Original Recording: ${vibelog.title}`,
      description,
      type: 'article',
      publishedTime: vibelog.published_at,
      authors: [vibelog.author.display_name || normalizedUsername],
      images: [{ url: imageUrl, width: 1200, height: 630, alt: vibelog.title }],
      url: canonicalUrl,
      audio: vibelog.audio_url ? [{ url: vibelog.audio_url, type: 'audio/webm' }] : undefined,
      videos: vibelog.video_url ? [{ url: vibelog.video_url, type: 'video/webm' }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Original Recording: ${vibelog.title}`,
      description,
      images: [imageUrl],
      creator: `@${normalizedUsername}`,
    },
    alternates: {
      canonical: canonicalUrl,
      types: {
        'application/json': `${vibelogUrl}.json`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function OriginalPage({ params }: PageProps) {
  const { username, slug } = await params;
  const vibelog = await getVibelogWithTranscript(username, slug);

  if (!vibelog) {
    notFound();
  }

  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  const hasOriginalMedia = !!(vibelog.audio_url || vibelog.video_url);
  const canonicalUrl = `https://vibelog.io/@${normalizedUsername}/${slug}/original`;
  const vibelogUrl = `https://vibelog.io/@${normalizedUsername}/${slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb navigation */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-muted-foreground">
            <li>
              <Link href={`/@${normalizedUsername}`} className="hover:text-electric">
                @{normalizedUsername}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={vibelogUrl} className="hover:text-electric">
                {vibelog.title}
              </Link>
            </li>
            <li>/</li>
            <li className="font-medium text-foreground">Original</li>
          </ol>
        </nav>

        <article className="rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6 sm:p-8">
          {/* Header with Original Recording badge */}
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-500">
              <Mic className="h-4 w-4" />
              Original Recording
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">{vibelog.title}</h1>

          {/* Author & Meta */}
          <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border/30 pb-6">
            <Link
              href={`/@${vibelog.author.username}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              {vibelog.author.avatar_url ? (
                <img
                  src={vibelog.author.avatar_url}
                  alt={vibelog.author.display_name}
                  className="h-10 w-10 rounded-full border-2 border-electric/20"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
                  <User className="h-5 w-5 text-electric" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">{vibelog.author.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  @{vibelog.author.username} · {formatFullDate(vibelog.published_at)}
                </p>
              </div>
            </Link>
          </div>

          {/* Original Audio/Video Player */}
          {hasOriginalMedia && (
            <div className="mb-8 rounded-xl border border-border/50 bg-muted/30 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Mic className="h-5 w-5 text-blue-500" />
                Original Voice Recording
              </h2>
              {vibelog.video_url ? (
                <video
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                  controlsList="nodownload"
                >
                  <source src={vibelog.video_url} type="video/webm" />
                  <source src={vibelog.video_url} type="video/mp4" />
                  Your browser does not support the video element.
                </video>
              ) : vibelog.audio_url ? (
                <audio controls className="w-full" preload="metadata">
                  <source src={vibelog.audio_url} type="audio/webm" />
                  <source src={vibelog.audio_url} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              ) : null}
            </div>
          )}

          {/* Original Transcript - Word for Word */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Original Transcript</h2>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-6">
              {vibelog.transcript ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {vibelog.transcript}
                </p>
              ) : (
                <p className="italic text-muted-foreground">
                  No transcript available for this vibelog.
                </p>
              )}
            </div>
          </div>

          {/* Link to AI-enhanced version */}
          <div className="rounded-xl border border-electric/20 bg-electric/5 p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Want to read the AI-enhanced version?
            </p>
            <Link
              href={vibelogUrl}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              View Enhanced Vibelog →
            </Link>
          </div>
        </article>

        {/* AI-readable summary for AEO */}
        <aside
          className="sr-only"
          aria-label="Content summary for AI assistants"
          data-ai-summary="true"
        >
          <h2>Quick Summary</h2>
          <p>
            This is the original voice recording and transcript for &quot;{vibelog.title}&quot; by{' '}
            {vibelog.author.display_name} (@{vibelog.author.username}).
          </p>
          {vibelog.transcript && (
            <>
              <h3>Original Words (verbatim transcript)</h3>
              <p>{vibelog.transcript}</p>
            </>
          )}
          <h3>Key Information</h3>
          <ul>
            <li>Author: {vibelog.author.display_name}</li>
            <li>Published: {vibelog.published_at}</li>
            <li>Has audio: {vibelog.audio_url ? 'Yes' : 'No'}</li>
            <li>Has video: {vibelog.video_url ? 'Yes' : 'No'}</li>
            {vibelog.tags && vibelog.tags.length > 0 && <li>Topics: {vibelog.tags.join(', ')}</li>}
          </ul>
          <p>For the AI-enhanced, polished version of this content, visit: {vibelogUrl}</p>
        </aside>
      </main>

      {/* JSON-LD Structured Data for Original Recording */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AudioObject',
            name: `Original Recording: ${vibelog.title}`,
            description:
              vibelog.transcript?.substring(0, 300) ||
              `Original voice recording for ${vibelog.title}`,
            contentUrl: vibelog.audio_url || vibelog.video_url,
            encodingFormat: vibelog.video_url ? 'video/webm' : 'audio/webm',
            transcript: vibelog.transcript,
            datePublished: vibelog.published_at,
            author: {
              '@type': 'Person',
              name: vibelog.author.display_name,
              url: `https://vibelog.io/@${vibelog.author.username}`,
            },
            isPartOf: {
              '@type': 'BlogPosting',
              headline: vibelog.title,
              url: vibelogUrl,
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': canonicalUrl,
            },
          }),
        }}
      />

      {/* Additional BreadcrumbList for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
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
                name: vibelog.author.display_name,
                item: `https://vibelog.io/@${vibelog.author.username}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: vibelog.title,
                item: vibelogUrl,
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: 'Original Recording',
                item: canonicalUrl,
              },
            ],
          }),
        }}
      />
    </div>
  );
}
