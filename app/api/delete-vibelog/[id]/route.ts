import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and get all storage URLs + path info for cache revalidation
    const { data: vibelog, error: fetchError } = await supabase
      .from('vibelogs')
      .select(
        'user_id, slug, audio_url, cover_image_url, video_url, ai_audio_url, profiles!inner(username)'
      )
      .eq('id', id)
      .single();

    if (fetchError || !vibelog) {
      return NextResponse.json({ error: 'Vibelog not found' }, { status: 404 });
    }

    if (vibelog.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden - not your vibelog' }, { status: 403 });
    }

    // Clean up storage files before deleting database record
    const adminClient = await createServerAdminClient();
    const storageErrors: string[] = [];

    // Helper function to extract storage path from public URL
    const extractStoragePath = (url: string | null, bucket: string): string | null => {
      if (!url) {
        return null;
      }

      // URL format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
      const publicPattern = `/storage/v1/object/public/${bucket}/`;
      const pathStartIndex = url.indexOf(publicPattern);

      if (pathStartIndex === -1) {
        console.warn(`Could not extract path from URL: ${url}`);
        return null;
      }

      return url.substring(pathStartIndex + publicPattern.length);
    };

    // Delete audio file from vibelogs bucket
    if (vibelog.audio_url) {
      const audioPath = extractStoragePath(vibelog.audio_url, 'vibelogs');
      if (audioPath) {
        const { error } = await adminClient.storage.from('vibelogs').remove([audioPath]);
        if (error) {
          console.error('Failed to delete audio file:', error);
          storageErrors.push(`audio: ${error.message}`);
        }
      }
    }

    // Delete AI audio file from tts-audio bucket
    if (vibelog.ai_audio_url) {
      const aiAudioPath = extractStoragePath(vibelog.ai_audio_url, 'tts-audio');
      if (aiAudioPath) {
        const { error } = await adminClient.storage.from('tts-audio').remove([aiAudioPath]);
        if (error) {
          console.error('Failed to delete AI audio file:', error);
          storageErrors.push(`ai_audio: ${error.message}`);
        }
      }
    }

    // Delete video file from vibelogs bucket
    if (vibelog.video_url) {
      const videoPath = extractStoragePath(vibelog.video_url, 'vibelogs');
      if (videoPath) {
        const { error } = await adminClient.storage.from('vibelogs').remove([videoPath]);
        if (error) {
          console.error('Failed to delete video file:', error);
          storageErrors.push(`video: ${error.message}`);
        }
      }
    }

    // Delete cover image from vibelog-covers bucket
    if (vibelog.cover_image_url) {
      const coverPath = extractStoragePath(vibelog.cover_image_url, 'vibelog-covers');
      if (coverPath) {
        const { error } = await adminClient.storage.from('vibelog-covers').remove([coverPath]);
        if (error) {
          console.error('Failed to delete cover image:', error);
          storageErrors.push(`cover: ${error.message}`);
        }
      }
    }

    // Delete vibelog from database
    const { error: deleteError } = await supabase.from('vibelogs').delete().eq('id', id);

    if (deleteError) {
      console.error('Failed to delete vibelog:', deleteError);
      return NextResponse.json({ error: 'Failed to delete vibelog' }, { status: 500 });
    }

    // Revalidate the vibelog page cache to remove it immediately
    const profile = Array.isArray(vibelog.profiles) ? vibelog.profiles[0] : vibelog.profiles;
    if (profile?.username && vibelog.slug) {
      const vibelogPath = `/@${profile.username}/${vibelog.slug}`;
      revalidatePath(vibelogPath);
      console.log('✅ Revalidated cache for deleted vibelog:', vibelogPath);
    }

    // Also revalidate dashboard and profile pages
    revalidatePath('/dashboard');
    if (profile?.username) {
      revalidatePath(`/@${profile.username}`);
    }

    // Return success with optional storage cleanup warnings
    const response: { success: boolean; message: string; storageWarnings?: string[] } = {
      success: true,
      message: 'Vibelog deleted successfully',
    };

    if (storageErrors.length > 0) {
      response.storageWarnings = storageErrors;
      console.warn('Storage cleanup had errors:', storageErrors);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting vibelog:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
