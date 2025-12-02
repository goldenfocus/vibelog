import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';
const FEED_LIMIT = 50;

/**
 * RSS 2.0 Feed - All public vibelogs
 *
 * Includes:
 * - Dublin Core for author attribution
 * - Atom self-link for feed discovery
 * - Enclosure for audio (voice recordings)
 * - Multi-language support via language tag
 */
export async function GET() {
  const supabase = createClient();

  // Fetch recent public vibelogs
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
      read_time,
      profiles!user_id (
        username,
        display_name
      )
    `
    )
    .eq('is_public', true)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch vibelogs' }, { status: 500 });
  }

  const lastBuildDate = vibelogs?.[0]?.published_at
    ? new Date(vibelogs[0].published_at).toUTCString()
    : new Date().toUTCString();

  // Generate RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>VibeLog - Voice Stories</title>
    <link>${BASE_URL}</link>
    <description>Voice-to-publish platform that turns spoken thoughts into beautiful posts. Discover authentic voice stories from creators worldwide.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>VibeLog RSS Generator</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
    <image>
      <url>${BASE_URL}/og-image.png</url>
      <title>VibeLog</title>
      <link>${BASE_URL}</link>
    </image>
    <atom:link href="${BASE_URL}/feeds/rss.xml" rel="self" type="application/rss+xml"/>
    <atom:link href="${BASE_URL}/feeds/atom.xml" rel="alternate" type="application/atom+xml"/>
    <atom:link href="${BASE_URL}/feeds/feed.json" rel="alternate" type="application/feed+json"/>
${vibelogs?.map(vibelog => generateRSSItem(vibelog)).join('\n') || ''}
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

function generateRSSItem(vibelog: {
  id: string;
  title: string;
  teaser: string;
  content: string;
  published_at: string | null;
  created_at: string;
  audio_url: string | null;
  cover_image_url: string | null;
  original_language: string | null;
  read_time: number | null;
  profiles:
    | { username: string; display_name: string }
    | { username: string; display_name: string }[]
    | null;
}): string {
  // Handle Supabase returning either a single object or array
  const profileData = vibelog.profiles;
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!profile) {
    return '';
  }

  const pubDate = vibelog.published_at || vibelog.created_at;
  const url = `${BASE_URL}/@${profile.username}/${vibelog.id}`;
  const exportUrl = `${BASE_URL}/api/export/${vibelog.id}`;

  // Escape XML special characters
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // Truncate content for description
  const description = vibelog.teaser || vibelog.content.slice(0, 300) + '...';

  return `    <item>
      <title>${escapeXml(vibelog.title)}</title>
      <link>${url}</link>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${vibelog.content}]]></content:encoded>
      <dc:creator>${escapeXml(profile.display_name)}</dc:creator>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <guid isPermaLink="true">${url}</guid>
      <atom:link href="${exportUrl}/json" rel="alternate" type="application/json" title="JSON Export"/>
      <atom:link href="${exportUrl}/markdown" rel="alternate" type="text/markdown" title="Markdown Export"/>
      ${vibelog.original_language ? `<dc:language>${vibelog.original_language}</dc:language>` : ''}
      ${vibelog.cover_image_url ? `<media:thumbnail url="${escapeXml(vibelog.cover_image_url)}"/>` : ''}
      ${vibelog.audio_url ? `<enclosure url="${escapeXml(vibelog.audio_url)}" type="audio/webm" length="0"/>` : ''}
    </item>`;
}
