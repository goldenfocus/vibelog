import { User } from 'lucide-react';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Comments from '@/components/comments/Comments';
import Navigation from '@/components/Navigation';
import PublicVibelogContent from '@/components/PublicVibelogContent';
import RelatedVibelogs from '@/components/RelatedVibelogs';
import VibelogEditButton from '@/components/VibelogEditButton';
import { formatFullDate } from '@/lib/date-utils';
import { extractLocaleFromPath, isLocaleSupported } from '@/lib/seo/hreflang';
import { generateVibelogMetadata } from '@/lib/seo/metadata';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  getTranslatedContent,
  type SupportedLanguage,
  type TranslationsMap,
} from '@/lib/translation';

interface PageProps {
  params: Promise<{
    locale: string;
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

// Fetch vibelog data (server-side)
async function getVibelog(username: string, slug: string) {
  const supabase = await createServerSupabaseClient();

  console.log('🔍 getVibelog called:', { username, slug });

  // Normalize username (strip @ if present, since URLs have @ but DB doesn't)
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  console.log('📝 Normalized username:', normalizedUsername);

  // Reject reserved paths to prevent matching /api/*, /about/*, etc.
  if (RESERVED_PATHS.includes(normalizedUsername)) {
    console.log('❌ Reserved path rejected:', normalizedUsername);
    return null;
  }

  // Handle anonymous vibelogs (vibelogs accessed via /@anonymous/{slug})
  // Note: Orphaned vibelogs (user deleted) may have slug set but public_slug NULL
  // So we need to check both public_slug and slug fields
  if (normalizedUsername === 'anonymous') {
    console.log('👻 Querying anonymous vibelog by slug:', slug);

    // First try public_slug
    let data, error;
    const publicSlugResult = await supabase
      .from('vibelogs')
      .select(
        `
        id,
        title,
        slug,
        content,
        teaser,
        transcript,
        audio_url,
        ai_audio_url,
        cover_image_url,
        video_url,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        read_time,
        word_count,
        tags,
        user_id,
        public_slug,
        seo_title,
        seo_description,
        seo_keywords,
        original_language,
        available_languages,
        translations
      `
      )
      .eq('public_slug', slug)
      .eq('is_published', true)
      .eq('is_public', true)
      .maybeSingle();

    data = publicSlugResult.data;
    error = publicSlugResult.error;

    // If not found by public_slug, try slug field (for orphaned vibelogs)
    if (!data && !error) {
      console.log('👻 Trying slug field for orphaned vibelog:', slug);
      const slugResult = await supabase
        .from('vibelogs')
        .select(
          `
          id,
          title,
          slug,
          content,
          teaser,
          transcript,
          audio_url,
          ai_audio_url,
          cover_image_url,
          video_url,
          created_at,
          published_at,
          view_count,
          like_count,
          share_count,
          read_time,
          word_count,
          tags,
          user_id,
          public_slug,
          seo_title,
          seo_description,
          seo_keywords,
          original_language,
          available_languages,
          translations
        `
        )
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('is_public', true)
        .maybeSingle();

      data = slugResult.data;
      error = slugResult.error;
    }

    console.log('📄 Anonymous vibelog query result:', { data: data?.title, error });

    if (error || !data) {
      console.error('❌ Anonymous vibelog not found:', { slug, error });
      return null;
    }

    // If the vibelog has a user_id, try to fetch the author profile
    let author = {
      username: 'anonymous',
      display_name: 'Anonymous',
      avatar_url: null,
    };

    if (data.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', data.user_id)
        .single();

      if (profile) {
        author = {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        };
      }
    }

    return {
      ...data,
      author,
    };
  }

  // First get the user's ID from their username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', normalizedUsername)
    .single();

  console.log('👤 Profile lookup result:', { profile, profileError });

  if (!profile) {
    console.error('❌ User not found:', username, profileError);
    return null;
  }

  // Query vibelog by user_id + slug (try both slug and public_slug for compatibility)
  console.log('🔎 Querying vibelog:', { slug, userId: profile.id });

  // First try by slug (most common, human-readable URLs like /-vibelog-title-abc123)
  let { data, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      slug,
      content,
      teaser,
      transcript,
      audio_url,
      ai_audio_url,
      cover_image_url,
      video_url,
      created_at,
      published_at,
      view_count,
      like_count,
      share_count,
      read_time,
      word_count,
      tags,
      user_id,
      public_slug,
      seo_title,
      seo_description,
      seo_keywords,
      original_language,
      available_languages,
      translations
    `
    )
    .eq('slug', slug)
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .eq('is_public', true)
    .single();

  // If not found by slug, try by public_slug (notification URLs use UUID format)
  if (error || !data) {
    console.log('🔄 Not found by slug, trying public_slug...');
    const publicSlugResult = await supabase
      .from('vibelogs')
      .select(
        `
        id,
        title,
        slug,
        content,
        teaser,
        transcript,
        audio_url,
        ai_audio_url,
        cover_image_url,
        video_url,
        created_at,
        published_at,
        view_count,
        like_count,
        share_count,
        read_time,
        word_count,
        tags,
        user_id,
        public_slug,
        seo_title,
        seo_description,
        seo_keywords,
        original_language,
        available_languages,
        translations
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

  console.log('📄 Vibelog query result:', { data: data?.title, error });

  if (error || !data) {
    console.error('❌ Vibelog not found:', { slug, userId: profile.id, error });
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

// Generate SEO metadata with hreflang tags for vibelog pages (LEGENDARY i18n SEO)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;

  // Detect locale from URL
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || `/@${username}/${slug}`;
  const locale = extractLocaleFromPath(pathname);

  // Fetch vibelog data
  const vibelog = await getVibelog(username, slug);

  if (!vibelog) {
    return {
      title: 'Vibelog Not Found | vibelog.io',
      description: 'The vibelog you are looking for does not exist.',
    };
  }

  // Normalize username
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  // Extract teaser/description
  const description =
    vibelog.teaser ||
    vibelog.content
      ?.split('\n\n')
      .find(p => p.trim() && !p.startsWith('#'))
      ?.substring(0, 160) ||
    `Read ${vibelog.title} by @${normalizedUsername} on VibeLog`;

  // Generate SEO-optimized metadata with hreflang
  // Each vibelog gets unique SEO metadata for differentiated search ranking
  return generateVibelogMetadata({
    title: vibelog.title,
    teaser: description,
    username: normalizedUsername,
    slug: slug,
    locale,
    coverImage: vibelog.cover_image_url || undefined,
    publishedAt: vibelog.published_at || vibelog.created_at,
    updatedAt: vibelog.created_at,
    // AI-generated SEO fields for unique ranking per vibelog
    seoTitle: vibelog.seo_title || undefined,
    seoDescription: vibelog.seo_description || undefined,
    seoKeywords: vibelog.seo_keywords || undefined,
    tags: vibelog.tags || undefined,
  });
}

export default async function VibelogPage({ params }: PageProps) {
  const { locale, username, slug } = await params;
  const vibelog = await getVibelog(username, slug);

  if (!vibelog) {
    notFound();
  }

  // Apply translations based on locale
  const preferredLocale = isLocaleSupported(locale) ? (locale as SupportedLanguage) : 'en';
  const translatedContent = getTranslatedContent(
    {
      title: vibelog.title,
      teaser: vibelog.teaser,
      content: vibelog.content,
      seo_title: vibelog.seo_title || vibelog.title,
      seo_description: vibelog.seo_description || vibelog.teaser,
      original_language: vibelog.original_language,
      translations: vibelog.translations as TranslationsMap,
    },
    preferredLocale
  );

  // Use translated content
  const displayVibelog = {
    ...vibelog,
    title: translatedContent.title,
    teaser: translatedContent.teaser,
    content: translatedContent.content,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* View tracking pixel - browsers ALWAYS load images, guaranteed to work */}
      <img
        src={`/api/track-view/${vibelog.id}`}
        alt=""
        width={1}
        height={1}
        style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
      />
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Vibelog article */}
        <article className="rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-background/50 p-6 sm:p-8">
          {/* Video Player (if available) - shown above cover image with autoplay */}
          {vibelog.video_url && (
            <div className="mb-8 overflow-hidden rounded-xl">
              <video
                controls
                playsInline
                className="w-full rounded-lg"
                preload="metadata"
                poster={vibelog.cover_image_url || undefined}
              >
                <source src={vibelog.video_url} type="video/webm" />
                <source src={vibelog.video_url} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            </div>
          )}

          {/* Cover Image (only if no video) */}
          {!vibelog.video_url && vibelog.cover_image_url && (
            <div className="mb-8 overflow-hidden rounded-xl">
              <img
                src={vibelog.cover_image_url}
                alt={displayVibelog.title}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="mb-6 bg-gradient-electric bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-5xl">
            {displayVibelog.title}
          </h1>

          {/* Author & Meta */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-6">
            <Link
              href={`/@${vibelog.author.username}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
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
                <p className="font-medium text-foreground transition-colors hover:text-electric">
                  {vibelog.author.display_name}
                </p>
                <p className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  @{vibelog.author.username} · {formatFullDate(vibelog.published_at)}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <VibelogEditButton
                vibelog={{
                  id: vibelog.id,
                  title: vibelog.title, // Use original for editing
                  content: vibelog.content, // Use original for editing
                  teaser: vibelog.teaser, // Use original for editing
                  transcript: vibelog.transcript || undefined,
                  slug: vibelog.slug,
                  cover_image_url: vibelog.cover_image_url,
                  cover_image_alt: displayVibelog.title,
                  user_id: vibelog.user_id,
                }}
              />
            </div>
          </div>

          {/* Content with full action buttons */}
          <PublicVibelogContent
            vibelog={{
              id: vibelog.id,
              title: displayVibelog.title,
              content: displayVibelog.content,
              teaser: displayVibelog.teaser,
              slug: vibelog.slug,
              cover_image_url: vibelog.cover_image_url,
              user_id: vibelog.user_id,
              public_slug: vibelog.public_slug || vibelog.slug,
              audio_url: vibelog.audio_url,
              ai_audio_url: vibelog.ai_audio_url,
              video_url: vibelog.video_url,
              created_at: vibelog.created_at,
              read_time: vibelog.read_time,
              like_count: vibelog.like_count,
              share_count: vibelog.share_count,
              transcript: vibelog.transcript, // Keep original transcript
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
          <h2 className="mb-4 text-xl font-semibold text-foreground">About the Author</h2>
          <Link
            href={`/@${vibelog.author.username}`}
            className="flex items-start gap-4 transition-opacity hover:opacity-80"
          >
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
              <p className="font-medium text-foreground transition-colors hover:text-electric">
                {vibelog.author.display_name}
              </p>
              <p className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                @{vibelog.author.username}
              </p>
              <span className="mt-2 inline-block text-sm font-medium text-electric">
                View all vibelogs →
              </span>
            </div>
          </Link>
        </div>

        {/* Related Vibelogs - semantic similarity */}
        <RelatedVibelogs vibelogId={vibelog.id} limit={4} />

        {/* Comments Section */}
        <div className="mt-8">
          <Comments vibelogId={vibelog.id} />
        </div>
      </main>

      {/* AI-readable summary for AEO (Answer Engine Optimization) */}
      <aside
        className="sr-only"
        aria-label="Content summary for AI assistants"
        data-ai-summary="true"
        data-language={translatedContent.language}
      >
        <h2>Quick Summary</h2>
        <p>
          &quot;{displayVibelog.title}&quot; is a vibelog by {vibelog.author.display_name} (@
          {vibelog.author.username}).
        </p>
        {displayVibelog.teaser && (
          <>
            <h3>Summary</h3>
            <p>{displayVibelog.teaser}</p>
          </>
        )}
        <h3>Key Information</h3>
        <ul>
          <li>
            Author: {vibelog.author.display_name} (@{vibelog.author.username})
          </li>
          <li>Published: {vibelog.published_at}</li>
          <li>Reading time: {vibelog.read_time || 1} min</li>
          <li>Word count: {vibelog.word_count || 'N/A'}</li>
          {vibelog.audio_url && <li>Has original audio recording: Yes</li>}
          {vibelog.ai_audio_url && <li>Has AI narration: Yes</li>}
          {vibelog.video_url && <li>Has video: Yes</li>}
          {vibelog.tags && vibelog.tags.length > 0 && <li>Topics: {vibelog.tags.join(', ')}</li>}
        </ul>
        {(vibelog.audio_url || vibelog.video_url) && (
          <p>
            For the original voice recording and verbatim transcript, visit: https://vibelog.io/@
            {vibelog.author.username}/{slug}/original
          </p>
        )}
      </aside>

      {/* Structured data for SEO (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: displayVibelog.title,
            image: vibelog.cover_image_url || 'https://vibelog.io/og-image.png',
            datePublished: vibelog.published_at,
            dateModified: vibelog.published_at,
            inLanguage: translatedContent.language,
            author: {
              '@type': 'Person',
              name: vibelog.author.display_name || username,
              url: `https://vibelog.io/@${vibelog.author.username}`,
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
              displayVibelog.teaser ||
              displayVibelog.content
                .split('\n\n')
                .find(p => p.trim() && !p.startsWith('#'))
                ?.substring(0, 160) ||
              '',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://vibelog.io/${locale}/@${vibelog.author.username}/${slug}`,
            },
            wordCount: vibelog.word_count,
            keywords: vibelog.tags?.join(', '),
            // Audio/video metadata if available
            ...(vibelog.audio_url && {
              audio: {
                '@type': 'AudioObject',
                contentUrl: vibelog.audio_url,
                name: `Original recording: ${vibelog.title}`,
              },
            }),
            ...(vibelog.video_url && {
              video: {
                '@type': 'VideoObject',
                contentUrl: vibelog.video_url,
                name: `Video: ${vibelog.title}`,
                thumbnailUrl: vibelog.cover_image_url,
              },
            }),
            // Link to original recording page
            ...(vibelog.audio_url || vibelog.video_url
              ? {
                  hasPart: {
                    '@type': 'WebPage',
                    name: 'Original Recording',
                    url: `https://vibelog.io/@${vibelog.author.username}/${slug}/original`,
                  },
                }
              : {}),
          }),
        }}
      />

      {/* BreadcrumbList for better SEO */}
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
                item: `https://vibelog.io/@${vibelog.author.username}/${slug}`,
              },
            ],
          }),
        }}
      />
    </div>
  );
}
