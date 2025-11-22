/**
 * SEO metadata utilities for generating consistent, locale-aware metadata
 * across all pages with proper hreflang tags for Google/AI discovery
 */

import { Metadata } from 'next';

import {
  generateHreflangLinks,
  generateCanonicalUrl,
  getAlternateLocales,
  type Locale,
} from './hreflang';

interface GeneratePageMetadataParams {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string;
  keywords?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

/**
 * Generate SEO-optimized metadata with hreflang tags for any page
 *
 * This ensures:
 * 1. Proper canonical URLs per locale
 * 2. Complete hreflang alternate links
 * 3. OpenGraph locale settings
 * 4. Twitter card metadata
 *
 * @example
 * ```ts
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const { locale, slug } = await params;
 *   const vibelog = await fetchVibelog(slug);
 *
 *   return generatePageMetadata({
 *     title: vibelog.title,
 *     description: vibelog.teaser,
 *     path: `/@${vibelog.username}/${slug}`,
 *     locale,
 *     image: vibelog.cover_image_url,
 *     type: 'article',
 *   });
 * }
 * ```
 */
export function generatePageMetadata({
  title,
  description,
  path,
  locale,
  image = '/og-image.png',
  keywords,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
}: GeneratePageMetadataParams): Metadata {
  const hreflangLinks = generateHreflangLinks(path, locale);
  const canonicalUrl = generateCanonicalUrl(path, locale);

  const metadata: Metadata = {
    title,
    description,
    ...(keywords && { keywords }),
    metadataBase: new URL('https://vibelog.io'),
    alternates: {
      canonical: canonicalUrl,
      languages: hreflangLinks,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'vibelog.io',
      locale: locale,
      alternateLocale: getAlternateLocales(locale),
      type: type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(type === 'article' && publishedTime && { publishedTime }),
      ...(type === 'article' && modifiedTime && { modifiedTime }),
      ...(type === 'article' && author && { authors: [author] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@vibelog_io',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  return metadata;
}

/**
 * Generate metadata for vibelog posts with proper article schema
 */
export function generateVibelogMetadata({
  title,
  teaser,
  username,
  slug,
  locale,
  coverImage,
  publishedAt,
  updatedAt,
}: {
  title: string;
  teaser: string;
  username: string;
  slug: string;
  locale: Locale;
  coverImage?: string;
  publishedAt?: string;
  updatedAt?: string;
}): Metadata {
  return generatePageMetadata({
    title: `${title} | @${username}`,
    description: teaser,
    path: `/@${username}/${slug}`,
    locale,
    image: coverImage || '/og-image.png',
    type: 'article',
    publishedTime: publishedAt,
    modifiedTime: updatedAt,
    author: `@${username}`,
    keywords: 'voice story, vibelog, AI content, audio story',
  });
}

/**
 * Generate metadata for profile pages
 */
export function generateProfileMetadata({
  username,
  bio,
  locale,
  avatar,
}: {
  username: string;
  bio?: string;
  locale: Locale;
  avatar?: string;
}): Metadata {
  const description = bio || `Vibelogs by @${username} on vibelog.io`;

  return generatePageMetadata({
    title: `@${username} | vibelog.io`,
    description,
    path: `/@${username}`,
    locale,
    image: avatar || '/og-image.png',
    type: 'profile',
  });
}
