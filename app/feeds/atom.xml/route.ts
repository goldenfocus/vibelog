import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';
const FEED_LIMIT = 50;

/**
 * Atom 1.0 Feed - All public vibelogs
 *
 * Atom is preferred by many AI agents and modern feed readers
 * Includes full content, author info, and alternative format links
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
      updated_at,
      audio_url,
      cover_image_url,
      original_language,
      available_languages,
      profiles!user_id (
        username,
        display_name,
        avatar_url
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

  const updated = vibelogs?.[0]?.published_at
    ? new Date(vibelogs[0].published_at).toISOString()
    : new Date().toISOString();

  // Generate Atom XML
  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <title>VibeLog - Voice Stories</title>
  <subtitle>Voice-to-publish platform that turns spoken thoughts into beautiful posts</subtitle>
  <link href="${BASE_URL}" rel="alternate" type="text/html"/>
  <link href="${BASE_URL}/feeds/atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${BASE_URL}/feeds/rss.xml" rel="alternate" type="application/rss+xml" title="RSS Feed"/>
  <link href="${BASE_URL}/feeds/feed.json" rel="alternate" type="application/feed+json" title="JSON Feed"/>
  <id>${BASE_URL}/</id>
  <updated>${updated}</updated>
  <author>
    <name>VibeLog</name>
    <uri>${BASE_URL}</uri>
  </author>
  <icon>${BASE_URL}/favicon.ico</icon>
  <logo>${BASE_URL}/og-image.png</logo>
  <rights>Content by respective authors, licensed under CC BY 4.0</rights>
  <generator uri="${BASE_URL}" version="1.0">VibeLog Atom Generator</generator>
${vibelogs?.map(vibelog => generateAtomEntry(vibelog)).join('\n') || ''}
</feed>`;

  return new NextResponse(atom, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
    },
  });
}

function generateAtomEntry(vibelog: {
  id: string;
  title: string;
  teaser: string;
  content: string;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  original_language: string | null;
  available_languages: string[] | null;
  profiles:
    | { username: string; display_name: string; avatar_url: string }
    | { username: string; display_name: string; avatar_url: string }[]
    | null;
}): string {
  // Handle Supabase returning either a single object or array
  const profileData = vibelog.profiles;
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!profile) {
    return '';
  }

  const pubDate = vibelog.published_at || vibelog.created_at;
  const updatedDate = vibelog.updated_at || pubDate;
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

  // Generate language links if translations available
  const langLinks = vibelog.available_languages
    ? vibelog.available_languages
        .map(
          lang =>
            `    <link href="${BASE_URL}/${lang}/@${profile.username}/${vibelog.id}" rel="alternate" hreflang="${lang}" type="text/html"/>`
        )
        .join('\n')
    : '';

  return `  <entry>
    <title>${escapeXml(vibelog.title)}</title>
    <link href="${url}" rel="alternate" type="text/html"/>
    <link href="${exportUrl}/json" rel="alternate" type="application/json" title="JSON Export"/>
    <link href="${exportUrl}/markdown" rel="alternate" type="text/markdown" title="Markdown Export"/>
    <link href="${exportUrl}/html" rel="alternate" type="text/html" title="HTML Export"/>
${langLinks}
    <id>${url}</id>
    <published>${new Date(pubDate).toISOString()}</published>
    <updated>${new Date(updatedDate).toISOString()}</updated>
    <author>
      <name>${escapeXml(profile.display_name)}</name>
      <uri>${BASE_URL}/@${profile.username}</uri>
    </author>
    <summary type="text">${escapeXml(vibelog.teaser || vibelog.content.slice(0, 300))}</summary>
    <content type="html"><![CDATA[${vibelog.content}]]></content>
    ${vibelog.original_language ? `<dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">${vibelog.original_language}</dc:language>` : ''}
    ${vibelog.cover_image_url ? `<media:thumbnail url="${escapeXml(vibelog.cover_image_url)}"/>` : ''}
    ${vibelog.audio_url ? `<link href="${escapeXml(vibelog.audio_url)}" rel="enclosure" type="audio/webm" title="Original Voice Recording"/>` : ''}
    <rights>CC BY 4.0</rights>
  </entry>`;
}
