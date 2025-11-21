import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const format = searchParams.get('format') || 'json';

  if (!id && !slug) {
    return NextResponse.json({ error: 'Missing id or slug' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: comment } = slug
    ? await supabase.from('comments').select('*').eq('slug', slug).single()
    : await supabase.from('comments').select('*').eq('id', id!).single();

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  const { data: author } = comment.user_id
    ? await supabase
        .from('profiles')
        .select('username, display_name, full_name')
        .eq('id', comment.user_id)
        .single()
    : { data: null };

  const { data: vibelog } = comment.vibelog_id
    ? await supabase
        .from('vibelogs')
        .select('id, title, public_slug')
        .eq('id', comment.vibelog_id)
        .single()
    : { data: null };

  const displayName = author?.display_name || author?.full_name || author?.username || 'Anonymous';
  const commentType = comment.video_url ? 'Video' : comment.audio_url ? 'Voice' : 'Text';
  const canonicalUrl = `https://vibelog.io/c/${comment.slug || comment.id}`;
  const dateStr = new Date(comment.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (format === 'json') {
    return NextResponse.json(
      {
        '@context': 'https://schema.org',
        '@type': 'Comment',
        '@id': canonicalUrl,
        identifier: comment.id,
        text: comment.content,
        commentType,
        dateCreated: comment.created_at,
        url: canonicalUrl,
        author: { '@type': 'Person', name: displayName, username: author?.username },
        media: { audio: comment.audio_url, video: comment.video_url },
        about: vibelog
          ? {
              '@type': 'Article',
              name: vibelog.title,
              url: `https://vibelog.io/v/${vibelog.public_slug || vibelog.id}`,
            }
          : null,
      },
      { headers: { 'Content-Type': 'application/ld+json' } }
    );
  }

  if (format === 'md') {
    const md = `# ${commentType} Vibe by ${displayName}

**Author:** ${displayName}${author?.username ? ` (@${author.username})` : ''}
**Date:** ${dateStr}
**Type:** ${commentType}
${vibelog ? `**On:** [${vibelog.title}](https://vibelog.io/v/${vibelog.public_slug || vibelog.id})` : ''}

---

${comment.content || `[${commentType} comment - view at ${canonicalUrl}]`}

${comment.audio_url ? `**Audio:** ${comment.audio_url}` : ''}
${comment.video_url ? `**Video:** ${comment.video_url}` : ''}

---
*View on VibeLog: ${canonicalUrl}*`;
    return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  }

  if (format === 'txt') {
    const txt = `${commentType} Vibe by ${displayName}
${'='.repeat(40)}
Author: ${displayName}${author?.username ? ` (@${author.username})` : ''}
Date: ${dateStr}
Type: ${commentType}
${vibelog ? `On: ${vibelog.title}` : ''}
${'-'.repeat(40)}
${comment.content || `[${commentType} comment - view at ${canonicalUrl}]`}
${comment.audio_url ? `Audio: ${comment.audio_url}` : ''}
${comment.video_url ? `Video: ${comment.video_url}` : ''}
${'-'.repeat(40)}
View on VibeLog: ${canonicalUrl}`;
    return new NextResponse(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
}
