import { NextRequest, NextResponse } from 'next/server';

import { TwitterAutomation } from '@/lib/publishers/twitter-automation';
import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 60; // Twitter posting can take up to 60 seconds

interface TwitterPublishRequest {
  vibelogId: string;
  content?: string; // Optional: override default content
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

    const body: TwitterPublishRequest = await request.json();
    const { vibelogId, content: overrideContent, format } = body;

    if (!vibelogId) {
      return NextResponse.json({ error: 'vibelogId is required' }, { status: 400 });
    }

    // Fetch vibelog details
    const { data: vibelog, error: vibelogError } = await supabase
      .from('vibelogs')
      .select('*, profiles(*)')
      .eq('id', vibelogId)
      .single();

    if (vibelogError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    // Verify ownership
    if (vibelog.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this vibelog' },
        { status: 403 }
      );
    }

    // Check if user has credentials configured
    const profile = vibelog.profiles;
    if (!profile?.twitter_username || !profile?.twitter_password) {
      return NextResponse.json(
        {
          error:
            'X credentials not configured. Please add your username and password in Settings → Profile',
        },
        { status: 400 }
      );
    }

    // Check if already posted
    const { data: existingPost } = await supabase
      .from('vibelog_social_posts')
      .select('*')
      .eq('vibelog_id', vibelogId)
      .eq('platform', 'twitter')
      .eq('status', 'posted')
      .single();

    if (existingPost) {
      return NextResponse.json({
        success: true,
        alreadyPosted: true,
        postUrl: existingPost.post_url,
        postId: existingPost.post_id,
        postedAt: existingPost.posted_at,
      });
    }

    // Create or update pending post record
    const { data: postRecord, error: insertError } = await supabase
      .from('vibelog_social_posts')
      .upsert(
        {
          vibelog_id: vibelogId,
          user_id: user.id,
          platform: 'twitter',
          status: 'posting',
        },
        {
          onConflict: 'vibelog_id,platform',
        }
      )
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create post record:', insertError);
      return NextResponse.json({ error: 'Failed to initialize post record' }, { status: 500 });
    }

    // Determine tweet content
    let tweetContent: string;

    if (overrideContent) {
      tweetContent = overrideContent;
    } else {
      const profile = vibelog.profiles;
      const postFormat = format || profile?.twitter_post_format || 'teaser';
      const vibelogUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vibelog.app'}/${vibelog.slug}`;

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

    // Initialize Twitter automation
    const twitter = new TwitterAutomation(user.id);

    try {
      // Post tweet
      const result = await twitter.postTweet({
        text: tweetContent,
      });

      // Extract tweet ID and URL from result
      const tweetId = result.tweetIds?.[0] || '';
      const tweetUrl = result.threadUrl || '';

      // Update post record with success
      const { error: updateError } = await supabase
        .from('vibelog_social_posts')
        .update({
          status: 'posted',
          post_id: tweetId,
          post_url: tweetUrl,
          posted_at: new Date().toISOString(),
          post_data: {
            content: tweetContent,
            characterCount: tweetContent.length,
            tweetIds: result.tweetIds,
          },
        })
        .eq('id', postRecord.id);

      if (updateError) {
        console.error('Failed to update post record:', updateError);
      }

      return NextResponse.json({
        success: true,
        postUrl: tweetUrl,
        postId: tweetId,
        content: tweetContent,
      });
    } catch (twitterError) {
      const errorMessage = twitterError instanceof Error ? twitterError.message : 'Unknown error';
      console.error('Twitter posting failed:', twitterError);

      // Update post record with failure
      await supabase
        .from('vibelog_social_posts')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', postRecord.id);

      return NextResponse.json(
        {
          error: 'Failed to post to Twitter',
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Twitter publish endpoint error:', error);
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
