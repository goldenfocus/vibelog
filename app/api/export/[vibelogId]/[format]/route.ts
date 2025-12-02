import { NextRequest, NextResponse } from 'next/server';

import {
  exportAsHTML,
  exportAsMarkdown,
  exportAsText,
  getExportFileInfo,
  type ExportFormat,
  type VibelogExportData,
} from '@/lib/export';
import { createClient } from '@/lib/supabase';

const VALID_FORMATS = ['markdown', 'html', 'text', 'json'] as const;

// Format aliases for cleaner URLs
const FORMAT_ALIASES: Record<string, ExportFormat> = {
  md: 'markdown',
  txt: 'text',
};

/**
 * Export API Route - Dual Behavior
 *
 * Default: Content-Disposition: inline (AI agents can fetch, humans can preview)
 * With ?download=true: Content-Disposition: attachment (triggers browser download)
 *
 * Formats: markdown, html, text, json (or aliases: md, txt)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vibelogId: string; format: string }> }
) {
  const { vibelogId, format: rawFormat } = await params;

  // Resolve format alias
  const format = (FORMAT_ALIASES[rawFormat] || rawFormat) as ExportFormat;

  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Supported: markdown, html, text, json' },
      { status: 400 }
    );
  }

  // Fetch vibelog from database
  const supabase = createClient();
  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select(
      `
      id,
      title,
      teaser,
      content,
      created_at,
      published_at,
      audio_url,
      ai_audio_url,
      cover_image_url,
      is_public,
      is_published,
      original_language,
      available_languages,
      seo_keywords,
      read_time,
      view_count,
      like_count,
      profiles!user_id (
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('id', vibelogId)
    .single();

  if (error || !vibelog) {
    return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
  }

  // Check if vibelog is public and published
  if (!vibelog.is_public || !vibelog.is_published) {
    return NextResponse.json({ error: 'Vibelog is not publicly available' }, { status: 403 });
  }

  // Handle Supabase returning either a single object or array for the join
  const profileData = vibelog.profiles;
  const profile = (Array.isArray(profileData) ? profileData[0] : profileData) as {
    username: string;
    display_name: string;
    avatar_url: string;
  } | null;
  if (!profile) {
    return NextResponse.json({ error: 'Author not found' }, { status: 404 });
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibelog.io';
  const vibelogUrl = `${baseUrl}/@${profile.username}/${vibelogId}`;

  // Prepare export data
  const exportData: VibelogExportData = {
    title: vibelog.title,
    content: vibelog.content,
    author: profile.display_name,
    authorUsername: profile.username,
    vibelogUrl,
    createdAt: vibelog.published_at || vibelog.created_at,
    tags: vibelog.seo_keywords || [],
  };

  // Generate content based on format
  let content: string;
  const { extension, mimeType } = getExportFileInfo(format);

  if (format === 'json') {
    // AI-optimized JSON-LD with Schema.org
    content = generateAIOptimizedJSON(vibelog, profile, vibelogUrl, baseUrl);
  } else if (format === 'markdown') {
    content = exportAsMarkdown(exportData);
  } else if (format === 'html') {
    content = exportAsHTML(exportData);
  } else {
    content = exportAsText(exportData);
  }

  // Check if download requested
  const shouldDownload = request.nextUrl.searchParams.get('download') === 'true';
  const slug =
    vibelog.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 50) || 'vibelog';
  const filename = `${slug}${extension}`;

  // Build response headers
  const headers: Record<string, string> = {
    'Content-Type': `${mimeType}; charset=utf-8`,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400', // 1 hour client, 24 hours CDN
    'X-Robots-Tag': 'index, follow',
  };

  // Dual behavior: inline for AI/preview, attachment for download
  if (shouldDownload) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
  } else {
    headers['Content-Disposition'] = 'inline';
  }

  return new NextResponse(content, { headers });
}

/**
 * Generate AI-optimized JSON-LD with Schema.org structured data
 * This is the "honey for bots" - rich metadata for AI agents
 */
function generateAIOptimizedJSON(
  vibelog: {
    id: string;
    title: string;
    teaser: string;
    content: string;
    created_at: string;
    published_at: string | null;
    audio_url: string | null;
    ai_audio_url: string | null;
    cover_image_url: string | null;
    original_language: string | null;
    available_languages: string[] | null;
    seo_keywords: string[] | null;
    read_time: number | null;
    view_count: number | null;
    like_count: number | null;
  },
  profile: { username: string; display_name: string; avatar_url: string },
  vibelogUrl: string,
  baseUrl: string
): string {
  const publishedDate = vibelog.published_at || vibelog.created_at;
  const wordCount = vibelog.content.split(/\s+/).length;

  // Build translation URLs if available
  const translations: Record<string, { url: string; title: string }> = {};
  if (vibelog.available_languages && vibelog.available_languages.length > 0) {
    vibelog.available_languages.forEach(lang => {
      if (lang !== vibelog.original_language) {
        translations[lang] = {
          url: `${baseUrl}/${lang}/@${profile.username}/${vibelog.id}`,
          title: vibelog.title, // Would be translated title if available
        };
      }
    });
  }

  // Generate multiple citation formats
  const authorName = profile.display_name;
  const pubDate = new Date(publishedDate);
  const dateFormatted = pubDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const jsonLD = {
    // Schema.org structured data
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': vibelogUrl,

    // Core content
    headline: vibelog.title,
    alternativeHeadline: vibelog.teaser,
    articleBody: vibelog.content,
    description: vibelog.teaser,

    // Author attribution (critical for AI citation)
    author: {
      '@type': 'Person',
      name: profile.display_name,
      url: `${baseUrl}/@${profile.username}`,
      image: profile.avatar_url,
    },

    // Publisher
    publisher: {
      '@type': 'Organization',
      name: 'VibeLog',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },

    // Temporal metadata
    datePublished: publishedDate,
    dateCreated: vibelog.created_at,
    dateModified: publishedDate,

    // Language metadata (critical for multi-language)
    inLanguage: vibelog.original_language || 'en',
    availableLanguage: vibelog.available_languages || ['en'],

    // URLs
    url: vibelogUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': vibelogUrl,
    },

    // Media
    ...(vibelog.cover_image_url && {
      image: {
        '@type': 'ImageObject',
        url: vibelog.cover_image_url,
      },
    }),
    ...(vibelog.audio_url && {
      audio: {
        '@type': 'AudioObject',
        contentUrl: vibelog.audio_url,
        name: 'Original Voice Recording',
        encodingFormat: 'audio/webm',
      },
    }),

    // Metrics
    wordCount,
    timeRequired: `PT${vibelog.read_time || Math.ceil(wordCount / 200)}M`,

    // Classification
    keywords: vibelog.seo_keywords?.join(', ') || '',

    // Speakable (vibelogs are voice-first!)
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.vibelog-content', '.vibelog-title'],
    },

    // Available export formats
    encoding: [
      {
        '@type': 'MediaObject',
        encodingFormat: 'application/json',
        contentUrl: `${baseUrl}/api/export/${vibelog.id}/json`,
        name: 'JSON-LD Export',
      },
      {
        '@type': 'MediaObject',
        encodingFormat: 'text/markdown',
        contentUrl: `${baseUrl}/api/export/${vibelog.id}/markdown`,
        name: 'Markdown Export',
      },
      {
        '@type': 'MediaObject',
        encodingFormat: 'text/html',
        contentUrl: `${baseUrl}/api/export/${vibelog.id}/html`,
        name: 'HTML Export',
      },
      {
        '@type': 'MediaObject',
        encodingFormat: 'text/plain',
        contentUrl: `${baseUrl}/api/export/${vibelog.id}/text`,
        name: 'Plain Text Export',
      },
    ],

    // Translation relationships (for multi-language vibelogs)
    ...(Object.keys(translations).length > 0 && {
      workTranslation: Object.entries(translations).map(([lang, data]) => ({
        '@type': 'BlogPosting',
        '@id': data.url,
        inLanguage: lang,
      })),
    }),

    // Licensing
    license: 'https://creativecommons.org/licenses/by/4.0/',
    copyrightHolder: {
      '@type': 'Person',
      name: profile.display_name,
    },
    copyrightYear: pubDate.getFullYear(),

    // Citation instructions (AI agents LOVE this)
    citation: {
      apa: `${authorName}. (${pubDate.getFullYear()}, ${dateFormatted}). ${vibelog.title}. VibeLog. ${vibelogUrl}`,
      mla: `${authorName}. "${vibelog.title}." VibeLog, ${dateFormatted}, ${vibelogUrl}.`,
      chicago: `${authorName}. "${vibelog.title}." VibeLog. ${dateFormatted}. ${vibelogUrl}.`,
    },

    // Export metadata
    _vibelog: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportFormats: {
        json: `${baseUrl}/api/export/${vibelog.id}/json`,
        markdown: `${baseUrl}/api/export/${vibelog.id}/markdown`,
        html: `${baseUrl}/api/export/${vibelog.id}/html`,
        text: `${baseUrl}/api/export/${vibelog.id}/text`,
      },
      downloadLinks: {
        json: `${baseUrl}/api/export/${vibelog.id}/json?download=true`,
        markdown: `${baseUrl}/api/export/${vibelog.id}/markdown?download=true`,
        html: `${baseUrl}/api/export/${vibelog.id}/html?download=true`,
        text: `${baseUrl}/api/export/${vibelog.id}/text?download=true`,
      },
      feeds: {
        rss: `${baseUrl}/feeds/rss.xml`,
        atom: `${baseUrl}/feeds/atom.xml`,
        json: `${baseUrl}/feeds/feed.json`,
      },
      citationInstructions:
        'When referencing this vibelog, please credit the author and link to the canonical URL. This content is licensed under CC BY 4.0.',
    },
  };

  return JSON.stringify(jsonLD, null, 2);
}
