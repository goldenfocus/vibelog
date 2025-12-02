import { NextResponse } from 'next/server';

import { SUPPORTED_LOCALES, LOCALE_METADATA, type Locale } from '@/lib/seo/hreflang';
import { createClient } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';
const FEED_LIMIT = 50;

/**
 * Per-Locale RSS Feed
 *
 * /en/feeds/rss.xml - English vibelogs
 * /es/feeds/rss.xml - Spanish vibelogs
 * /fr/feeds/rss.xml - French vibelogs
 * etc.
 *
 * Filters by original_language or available_languages
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // Validate locale
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  const localeMetadata = LOCALE_METADATA[locale as Locale];
  const supabase = createClient();

  // Fetch vibelogs that have this language available
  const { data: vibelogs, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      teaser,
      content,
      published_at,
      created_at,
      audio_url,
      cover_image_url,
      original_language,
      available_languages,
      profiles!user_id (
        username,
        display_name
      )
    `
    )
    .eq('is_public', true)
    .eq('is_published', true)
    .or(`original_language.eq.${locale},available_languages.cs.{${locale}}`)
    .order('published_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch vibelogs' }, { status: 500 });
  }

  const lastBuildDate = vibelogs?.[0]?.published_at
    ? new Date(vibelogs[0].published_at).toUTCString()
    : new Date().toUTCString();

  const feedUrl = `${BASE_URL}/${locale}/feeds/rss.xml`;
  const feedTitle = `VibeLog - ${localeMetadata.nativeName}`;

  // Generate RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${feedTitle}</title>
    <link>${BASE_URL}/${locale}</link>
    <description>Voice stories in ${localeMetadata.nativeName}. Voice-to-publish platform that turns spoken thoughts into beautiful posts.</description>
    <language>${locale}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>VibeLog RSS Generator</generator>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <atom:link href="${BASE_URL}/feeds/rss.xml" rel="alternate" type="application/rss+xml" title="All Languages"/>
${SUPPORTED_LOCALES.map(
  l =>
    `    <atom:link href="${BASE_URL}/${l}/feeds/rss.xml" rel="alternate" type="application/rss+xml" hreflang="${l}" title="${LOCALE_METADATA[l].nativeName}"/>`
).join('\n')}
${vibelogs?.map(vibelog => generateRSSItem(vibelog, locale)).join('\n') || ''}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
    },
  });
}

function generateRSSItem(
  vibelog: {
    id: string;
    title: string;
    teaser: string;
    content: string;
    published_at: string | null;
    created_at: string;
    audio_url: string | null;
    cover_image_url: string | null;
    original_language: string | null;
    available_languages: string[] | null;
    profiles:
      | { username: string; display_name: string }
      | { username: string; display_name: string }[]
      | null;
  },
  locale: string
): string {
  // Handle Supabase returning either a single object or array
  const profileData = vibelog.profiles;
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!profile) {
    return '';
  }

  const pubDate = vibelog.published_at || vibelog.created_at;
  // Use locale-prefixed URL
  const url = `${BASE_URL}/${locale}/@${profile.username}/${vibelog.id}`;
  const exportUrl = `${BASE_URL}/api/export/${vibelog.id}`;

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const description = vibelog.teaser || vibelog.content.slice(0, 300) + '...';

  return `    <item>
      <title>${escapeXml(vibelog.title)}</title>
      <link>${url}</link>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${vibelog.content}]]></content:encoded>
      <dc:creator>${escapeXml(profile.display_name)}</dc:creator>
      <dc:language>${locale}</dc:language>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${url}</guid>
      <atom:link href="${exportUrl}/json" rel="alternate" type="application/json"/>
      ${vibelog.audio_url ? `<enclosure url="${escapeXml(vibelog.audio_url)}" type="audio/webm" length="0"/>` : ''}
    </item>`;
}
