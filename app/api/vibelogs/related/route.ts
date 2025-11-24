import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { searchSimilarContent } from '@/lib/vibe-brain';

export const runtime = 'nodejs';

/**
 * GET /api/vibelogs/related?id={vibelogId}&limit=4
 *
 * Returns related vibelogs using semantic similarity via Vibe Brain embeddings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vibelogId = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10);

    if (!vibelogId) {
      return NextResponse.json({ error: 'Missing vibelog id' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get the current vibelog's content for similarity search
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('title, teaser, content, tags')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Create a search query from the vibelog's content
    const searchQuery = [vibelog.title, vibelog.teaser, vibelog.tags?.join(' ')]
      .filter(Boolean)
      .join(' ');

    let relatedIds: string[] = [];
    let similarResults: Array<{
      content_type: string;
      content_id: string;
      user_id: string;
      text_chunk: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }> = [];

    // Try semantic search, fallback to tag-based if it fails
    try {
      similarResults = await searchSimilarContent(searchQuery, {
        contentTypes: ['vibelog'],
        limit: limit + 1, // Get extra to filter out current vibelog
        threshold: 0.5, // Lower threshold for more results
      });

      // Filter out the current vibelog and get IDs
      relatedIds = similarResults
        .filter(r => r.content_id !== vibelogId)
        .slice(0, limit)
        .map(r => r.content_id);
    } catch (embeddingError) {
      console.error('[RELATED-VIBELOGS] Embedding search failed:', embeddingError);
      // Continue to fallback below
    }

    if (relatedIds.length === 0) {
      // Fallback: return recent vibelogs from the same tags
      const { data: fallbackVibelogs } = await supabase
        .from('vibelogs')
        .select(
          'id, title, teaser, slug, public_slug, cover_image_url, created_at, read_time, user_id'
        )
        .neq('id', vibelogId)
        .eq('is_published', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackVibelogs && fallbackVibelogs.length > 0) {
        // Fetch author profiles separately
        const authorIds = [...new Set(fallbackVibelogs.map(v => v.user_id).filter(Boolean))];
        const { data: authorProfiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', authorIds);

        const profileMap = new Map((authorProfiles || []).map(p => [p.id, p]));

        const relatedVibelogs = fallbackVibelogs.map((v: any) => {
          const author = profileMap.get(v.user_id);
          return {
            id: v.id,
            title: v.title,
            teaser: v.teaser?.substring(0, 150) || '',
            slug: v.slug,
            public_slug: v.public_slug,
            cover_image_url: v.cover_image_url,
            read_time: v.read_time,
            author: author
              ? {
                  username: author.username,
                  display_name: author.display_name,
                  avatar_url: author.avatar_url,
                }
              : { username: 'anonymous', display_name: 'Anonymous', avatar_url: null },
          };
        });

        return NextResponse.json({ vibelogs: relatedVibelogs, source: 'recent' });
      }

      return NextResponse.json({ vibelogs: [], source: 'recent' });
    }

    // Fetch full vibelog data for the related IDs
    const { data: relatedVibelogs, error: relatedError } = await supabase
      .from('vibelogs')
      .select(
        'id, title, teaser, slug, public_slug, cover_image_url, created_at, read_time, user_id'
      )
      .in('id', relatedIds)
      .eq('is_published', true)
      .eq('is_public', true);

    if (relatedError) {
      console.error('[RELATED-VIBELOGS] Error fetching related:', relatedError);
      return NextResponse.json({ error: 'Failed to fetch related vibelogs' }, { status: 500 });
    }

    if (!relatedVibelogs || relatedVibelogs.length === 0) {
      return NextResponse.json({ vibelogs: [], source: 'semantic' });
    }

    // Fetch author profiles separately
    const authorIds = [...new Set(relatedVibelogs.map(v => v.user_id).filter(Boolean))];
    const { data: authorProfiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', authorIds);

    const profileMap = new Map((authorProfiles || []).map(p => [p.id, p]));

    // Format response with similarity scores
    const formattedVibelogs = relatedVibelogs.map((v: any) => {
      const similarity = similarResults.find(r => r.content_id === v.id)?.similarity || 0;
      const author = profileMap.get(v.user_id);
      return {
        id: v.id,
        title: v.title,
        teaser: v.teaser?.substring(0, 150) || '',
        slug: v.slug,
        public_slug: v.public_slug,
        cover_image_url: v.cover_image_url,
        read_time: v.read_time,
        similarity: Math.round(similarity * 100),
        author: author
          ? {
              username: author.username,
              display_name: author.display_name,
              avatar_url: author.avatar_url,
            }
          : { username: 'anonymous', display_name: 'Anonymous', avatar_url: null },
      };
    });

    // Sort by similarity (highest first)
    formattedVibelogs.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({ vibelogs: formattedVibelogs, source: 'semantic' });
  } catch (error) {
    console.error('[RELATED-VIBELOGS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch related vibelogs' }, { status: 500 });
  }
}
