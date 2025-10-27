import { Clock, Heart, Share2, User, ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import PublicVibelogContent from '@/components/PublicVibelogContent';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

// Fetch vibelog data (server-side)
async function getVibelog(username: string, slug: string) {
  const supabase = await createServerSupabaseClient();

  // First get the user's ID from their username
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single();

  if (!profile) {
    console.error('User not found:', username);
    return null;
  }

  // Query vibelog by user_id + slug
  const { data, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      slug,
      content,
      teaser,
      audio_url,
      cover_image_url,
      created_at,
      published_at,
      view_count,
      like_count,
      share_count,
      read_time,
      word_count,
      tags,
      user_id,
      public_slug
    `
    )
    .eq('slug', slug)
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .eq('is_public', true)
    .single();

  if (error || !data) {
    console.error('Vibelog not found:', error);
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

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const vibelog = await getVibelog(username, slug);

  if (!vibelog) {
    return {
      title: 'Vibelog Not Found',
    };
  }

  // Extract first paragraph for description
  const description =
    vibelog.teaser ||
    vibelog.content
      .split('\n\n')
      .find(p => p.trim() && !p.startsWith('#'))
      ?.substring(0, 160) ||
    `Read ${vibelog.title} by @${username} on VibeLog`;

  const imageUrl = vibelog.cover_image_url || 'https://vibelog.io/og-image.png';

  return {
    title: `${vibelog.title} | @${username} on VibeLog`,
    description,
    keywords: vibelog.tags?.join(', ') || 'vibelog, voice content, audio to text',
    authors: [{ name: vibelog.author.display_name || username }],
    openGraph: {
      title: vibelog.title,
      description,
      type: 'article',
      publishedTime: vibelog.published_at,
      authors: [vibelog.author.display_name || username],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: vibelog.title,
        },
      ],
      url: `https://vibelog.io/${username}/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: vibelog.title,
      description,
      images: [imageUrl],
      creator: `@${username}`,
    },
    alternates: {
      canonical: `https://vibelog.io/${username}/${slug}`,
    },
  };
}

export default async function VibelogPage({ params }: PageProps) {
  const { username, slug } = await params;
  const vibelog = await getVibelog(username, slug);

  if (!vibelog) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-electric"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Vibelog article */}
        <article className="rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6 sm:p-8">
          {/* Cover Image */}
          {vibelog.cover_image_url && (
            <div className="mb-8 overflow-hidden rounded-xl">
              <img
                src={vibelog.cover_image_url}
                alt={vibelog.title}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="mb-6 bg-gradient-electric bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-5xl">
            {vibelog.title}
          </h1>

          {/* Author & Meta */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-6">
            <div className="flex items-center gap-3">
              {vibelog.author.avatar_url ? (
                <img
                  src={vibelog.author.avatar_url}
                  alt={vibelog.author.display_name}
                  className="h-12 w-12 rounded-full border-2 border-electric/20"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
                  <User className="h-6 w-6 text-electric" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">{vibelog.author.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  @{username} · {formatDate(vibelog.published_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{vibelog.read_time} min read</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span>{vibelog.like_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                <span>{vibelog.share_count}</span>
              </div>
            </div>
          </div>

          {/* Content with full action buttons */}
          <PublicVibelogContent
            vibelog={{
              id: vibelog.id,
              title: vibelog.title,
              content: vibelog.content,
              user_id: vibelog.user_id,
              public_slug: vibelog.public_slug || vibelog.slug,
              audio_url: vibelog.audio_url,
              created_at: vibelog.created_at,
              author: vibelog.author,
            }}
          />

          {/* Tags */}
          {vibelog.tags && vibelog.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-border/30 pt-6">
              {vibelog.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-electric/10 px-3 py-1 text-sm font-medium text-electric"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Author bio section */}
        <div className="mt-8 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6">
          <h3 className="mb-4 text-xl font-semibold text-foreground">About the Author</h3>
          <div className="flex items-start gap-4">
            {vibelog.author.avatar_url ? (
              <img
                src={vibelog.author.avatar_url}
                alt={vibelog.author.display_name}
                className="h-16 w-16 rounded-full border-2 border-electric/20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-electric/20 bg-electric/10">
                <User className="h-8 w-8 text-electric" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">{vibelog.author.display_name}</p>
              <p className="text-sm text-muted-foreground">@{username}</p>
              <Link
                href={`/${username}`}
                className="mt-2 inline-block text-sm font-medium text-electric hover:underline"
              >
                View all vibelogs →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Structured data for SEO (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: vibelog.title,
            image: vibelog.cover_image_url || 'https://vibelog.io/og-image.png',
            datePublished: vibelog.published_at,
            dateModified: vibelog.published_at,
            author: {
              '@type': 'Person',
              name: vibelog.author.display_name || username,
              url: `https://vibelog.io/${username}`,
            },
            publisher: {
              '@type': 'Organization',
              name: 'VibeLog',
              logo: {
                '@type': 'ImageObject',
                url: 'https://vibelog.io/logo.png',
              },
            },
            description:
              vibelog.teaser ||
              vibelog.content
                .split('\n\n')
                .find(p => p.trim() && !p.startsWith('#'))
                ?.substring(0, 160) ||
              '',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://vibelog.io/${username}/${slug}`,
            },
            wordCount: vibelog.word_count,
            keywords: vibelog.tags?.join(', '),
          }),
        }}
      />
    </div>
  );
}
