import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 60;

interface TwitterShareRequest {
  vibelogId: string;
  format?: 'teaser' | 'full' | 'custom';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TwitterShareRequest = await request.json();
    const { vibelogId, format } = body;

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId is required' }, { status: 400 });
    }

    // Fetch vibelog details
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select(
        '*, profiles(id, username, display_name, twitter_post_format, twitter_custom_template)'
      )
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // NOTE: No ownership check - anyone can share any public vibelog on X!

    // Determine tweet content
    const profile = vibelog.profiles;
    const postFormat = format || profile?.twitter_post_format || 'teaser';

    // Generate correct vibelog URL based on whether it's anonymous or user-owned
    let vibelogUrl: string;
    if (!vibelog.user_id) {
      // Anonymous vibelog - use public_slug
      vibelogUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vibelog.app'}/@anonymous/${vibelog.public_slug}`;
    } else if (profile?.username) {
      // User-owned vibelog - use username and public_slug (or slug as fallback)
      const slug = vibelog.public_slug || vibelog.slug;
      vibelogUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vibelog.app'}/@${profile.username}/${slug}`;
    } else {
      // Fallback - shouldn't happen but handle gracefully
      vibelogUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vibelog.app'}/v/${vibelog.public_slug || vibelog.slug}`;
    }

    // Defensive check: ensure URL is valid
    if (!vibelogUrl || vibelogUrl.includes('/null') || vibelogUrl.includes('/undefined')) {
      return NextResponse.json(
        { error: 'Cannot generate share URL - vibelog slug missing' },
        { status: 400 }
      );
    }

    let tweetContent: string;

    if (postFormat === 'custom' && profile?.twitter_custom_template) {
      // Use custom template with placeholders
      tweetContent = profile.twitter_custom_template
        .replace(/{title}/g, vibelog.title || '')
        .replace(/{content}/g, vibelog.teaser_content || vibelog.full_content || '')
        .replace(/{url}/g, vibelogUrl);
    } else if (postFormat === 'full') {
      // Full content with URL
      const fullText = vibelog.full_content || vibelog.teaser_content || '';
      tweetContent = `${vibelog.title ? vibelog.title + '\n\n' : ''}${fullText}\n\n${vibelogUrl}`;
    } else {
      // Default: teaser format
      const teaserText = vibelog.teaser_content || vibelog.full_content?.substring(0, 200) || '';
      tweetContent = `${vibelog.title ? vibelog.title + '\n\n' : ''}${teaserText}\n\nRead more: ${vibelogUrl}`;
    }

    // Truncate to Twitter's character limit (280 chars)
    if (tweetContent.length > 280) {
      // Keep URL intact, truncate content
      const urlMatch = tweetContent.match(/(https?:\/\/[^\s]+)$/);
      const url = urlMatch ? urlMatch[1] : '';
      const contentWithoutUrl = tweetContent.replace(url, '').trim();
      const maxContentLength = 280 - url.length - 4; // 4 for "\n\n" and space

      if (contentWithoutUrl.length > maxContentLength) {
        const truncated = contentWithoutUrl.substring(0, maxContentLength - 1) + '…';
        tweetContent = url ? `${truncated}\n\n${url}` : truncated;
      }
    }

    // Generate Twitter Web Intent URL
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;

    return NextResponse.json({
      success: true,
      shareUrl: twitterIntentUrl,
      content: tweetContent,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Twitter share URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check Twitter post status for a vibelog
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vibelogId = searchParams.get('vibelogId');

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId query parameter is required' }, { status: 400 });
    }

    const { data: post, error } = await supabase
      .from('vibelog_social_posts')
      .select('*')
      .eq('vibelog_id', vibelogId)
      .eq('platform', 'twitter')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch post status' }, { status: 500 });
    }

    return NextResponse.json({
      posted: post?.status === 'posted',
      status: post?.status || 'not_posted',
      postUrl: post?.post_url,
      postId: post?.post_id,
      postedAt: post?.posted_at,
      errorMessage: post?.error_message,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Twitter status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
