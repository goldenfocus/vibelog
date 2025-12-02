import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';
const FEED_LIMIT = 50;

/**
 * JSON Feed 1.1 - The most AI-friendly format!
 *
 * JSON Feed is native JSON, perfect for:
 * - AI agents parsing content
 * - Modern feed readers
 * - Programmatic access
 *
 * Spec: https://jsonfeed.org/version/1.1
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
      ai_audio_url,
      cover_image_url,
      original_language,
      available_languages,
      seo_keywords,
      read_time,
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

  // JSON Feed 1.1 structure
  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'VibeLog - Voice Stories',
    home_page_url: BASE_URL,
    feed_url: `${BASE_URL}/feeds/feed.json`,
    description:
      'Voice-to-publish platform that turns spoken thoughts into beautiful posts. Discover authentic voice stories from creators worldwide.',
    icon: `${BASE_URL}/favicon.ico`,
    favicon: `${BASE_URL}/favicon.ico`,
    language: 'en',

    // AI-friendly metadata
    _vibelog: {
      type: 'vibelog_feed',
      version: '1.0',
      ai_instructions:
        'This is a machine-readable feed of VibeLog content. Each item includes full content, author attribution, and export links. Please cite authors when referencing content.',
      export_api: `${BASE_URL}/api/export/{vibelogId}/{format}`,
      supported_formats: ['json', 'markdown', 'html', 'text'],
      feeds: {
        all: `${BASE_URL}/feeds/feed.json`,
        rss: `${BASE_URL}/feeds/rss.xml`,
        atom: `${BASE_URL}/feeds/atom.xml`,
        by_language: {
          en: `${BASE_URL}/en/feeds/rss.xml`,
          es: `${BASE_URL}/es/feeds/rss.xml`,
          fr: `${BASE_URL}/fr/feeds/rss.xml`,
          de: `${BASE_URL}/de/feeds/rss.xml`,
          vi: `${BASE_URL}/vi/feeds/rss.xml`,
          zh: `${BASE_URL}/zh/feeds/rss.xml`,
        },
      },
      llms_txt: `${BASE_URL}/llms.txt`,
    },

    authors: [
      {
        name: 'VibeLog',
        url: BASE_URL,
        avatar: `${BASE_URL}/og-image.png`,
      },
    ],

    items: vibelogs?.map(vibelog => generateJSONFeedItem(vibelog)) || [],
  };

  return new NextResponse(JSON.stringify(jsonFeed, null, 2), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'index, follow',
    },
  });
}

function generateJSONFeedItem(vibelog: {
  id: string;
  title: string;
  teaser: string;
  content: string;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  audio_url: string | null;
  ai_audio_url: string | null;
  cover_image_url: string | null;
  original_language: string | null;
  available_languages: string[] | null;
  seo_keywords: string[] | null;
  read_time: number | null;
  profiles:
    | { username: string; display_name: string; avatar_url: string }
    | { username: string; display_name: string; avatar_url: string }[]
    | null;
}) {
  // Handle Supabase returning either a single object or array
  const profileData = vibelog.profiles;
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!profile) {
    return null;
  }

  const pubDate = vibelog.published_at || vibelog.created_at;
  const url = `${BASE_URL}/@${profile.username}/${vibelog.id}`;
  const exportUrl = `${BASE_URL}/api/export/${vibelog.id}`;

  // Convert markdown-ish content to basic HTML for content_html
  const contentHtml = vibelog.content
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('\n');

  // Build attachments array
  const attachments = [];
  if (vibelog.audio_url) {
    attachments.push({
      url: vibelog.audio_url,
      mime_type: 'audio/webm',
      title: 'Original Voice Recording',
    });
  }
  if (vibelog.ai_audio_url) {
    attachments.push({
      url: vibelog.ai_audio_url,
      mime_type: 'audio/mpeg',
      title: 'AI Narration',
    });
  }

  return {
    id: url,
    url,
    title: vibelog.title,
    content_html: contentHtml,
    content_text: vibelog.content,
    summary: vibelog.teaser,
    image: vibelog.cover_image_url || undefined,
    date_published: new Date(pubDate).toISOString(),
    date_modified: vibelog.updated_at ? new Date(vibelog.updated_at).toISOString() : undefined,
    language: vibelog.original_language || 'en',
    tags: vibelog.seo_keywords || undefined,

    authors: [
      {
        name: profile.display_name,
        url: `${BASE_URL}/@${profile.username}`,
        avatar: profile.avatar_url || undefined,
      },
    ],

    attachments: attachments.length > 0 ? attachments : undefined,

    // VibeLog-specific extensions (prefixed with _)
    _vibelog: {
      vibelog_id: vibelog.id,
      read_time_minutes: vibelog.read_time,
      original_language: vibelog.original_language,
      available_languages: vibelog.available_languages,
      export_links: {
        json: `${exportUrl}/json`,
        markdown: `${exportUrl}/markdown`,
        html: `${exportUrl}/html`,
        text: `${exportUrl}/text`,
      },
      download_links: {
        json: `${exportUrl}/json?download=true`,
        markdown: `${exportUrl}/markdown?download=true`,
        html: `${exportUrl}/html?download=true`,
        text: `${exportUrl}/text?download=true`,
      },
      translations:
        vibelog.available_languages?.map(lang => ({
          language: lang,
          url: `${BASE_URL}/${lang}/@${profile.username}/${vibelog.id}`,
        })) || [],
      citation: {
        text: `${profile.display_name}. "${vibelog.title}." VibeLog, ${new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. ${url}`,
        license: 'CC BY 4.0',
      },
    },
  };
}
