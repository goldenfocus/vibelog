/**
 * Vibelog Delete Service - Single Source of Truth
 *
 * Centralized vibelog deletion with complete cleanup:
 * - Authorization (owner OR admin)
 * - Storage files (audio, video, covers, ai_audio)
 * - Database cascades (likes, comments, notifications)
 * - Manual cleanup (reactions, embeddings)
 * - Cache revalidation
 * - Admin audit logging
 */

import 'server-only';

import { revalidatePath } from 'next/cache';

import { logAdminAction, getClientIp, getUserAgent } from '@/lib/auth-admin';
import { logger } from '@/lib/logger';
import { extractStoragePath } from '@/lib/storage';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export interface DeleteVibelogOptions {
  vibelogId: string;
  userId: string;
  userIsAdmin: boolean;
  request?: Request; // For admin audit logging
}

export interface DeleteVibelogResult {
  success: boolean;
  message: string;
  storageWarnings?: string[];
  error?: string;
}

/**
 * Delete a vibelog with complete cleanup
 *
 * Authorization: Owner OR Admin
 *
 * Cleanup order:
 * 1. Fetch vibelog details (validate ownership/admin)
 * 2. Delete storage files (audio, video, covers, ai_audio)
 * 3. Delete orphaned reactions (polymorphic table, no FK)
 * 4. Delete content embeddings
 * 5. Delete vibelog (triggers CASCADE for likes, comments, notifications)
 * 6. Revalidate cache
 * 7. Log admin action (if admin)
 */
export async function deleteVibelog(
  options: DeleteVibelogOptions
): Promise<DeleteVibelogResult> {
  const { vibelogId, userId, userIsAdmin, request } = options;

  try {
    const adminClient = await createServerAdminClient();

    logger.info('Delete vibelog request', {
      vibelogId,
      userId,
      userIsAdmin,
      requestProvided: !!request,
    });

    // ============================================================================
    // STEP 1: Fetch vibelog and validate authorization
    // ============================================================================
    // Use LEFT JOIN (profiles()) instead of INNER JOIN (profiles!inner) to support anonymous vibelogs
    console.log('[Delete Service] Fetching vibelog:', vibelogId);

    const { data: vibelog, error: fetchError } = await adminClient
      .from('vibelogs')
      .select(
        `
        user_id,
        slug,
        title,
        audio_url,
        cover_image_url,
        video_url,
        ai_audio_url,
        profiles(username)
      `
      )
      .eq('id', vibelogId)
      .single();

    console.log('[Delete Service] Fetch result:', {
      found: !!vibelog,
      error: fetchError,
      errorCode: fetchError?.code,
      errorMessage: fetchError?.message,
      errorDetails: fetchError?.details,
      errorHint: fetchError?.hint,
    });

    if (fetchError || !vibelog) {
      logger.error('Vibelog not found', {
        vibelogId,
        fetchError,
        errorCode: fetchError?.code,
        errorMessage: fetchError?.message,
        errorDetails: fetchError?.details,
      });
      console.error('[Delete Service] Vibelog lookup failed:', {
        vibelogId,
        error: fetchError,
        fullError: JSON.stringify(fetchError, null, 2),
      });
      return {
        success: false,
        message: 'Vibelog not found',
        error: 'NOT_FOUND',
      };
    }

    logger.info('Vibelog fetched', {
      vibelogId,
      vibelogUserId: vibelog.user_id,
      requestUserId: userId,
      title: vibelog.title,
    });

    // Check authorization: owner OR admin
    const isOwner = vibelog.user_id === userId;
    logger.info('Authorization check', {
      vibelogId,
      isOwner,
      userIsAdmin,
      canDelete: isOwner || userIsAdmin,
    });

    if (!isOwner && !userIsAdmin) {
      logger.warn('Authorization failed', {
        vibelogId,
        userId,
        vibelogUserId: vibelog.user_id,
        userIsAdmin,
      });
      return {
        success: false,
        message: 'Forbidden - not your vibelog',
        error: 'FORBIDDEN',
      };
    }

    const storageErrors: string[] = [];

    // ============================================================================
    // STEP 2: Delete all storage files
    // ============================================================================

    // Audio file (vibelogs bucket)
    if (vibelog.audio_url) {
      const audioPath = extractStoragePath(vibelog.audio_url, 'vibelogs');
      if (audioPath) {
        const { error } = await adminClient.storage.from('vibelogs').remove([audioPath]);
        if (error) {
          logger.error('Failed to delete audio file', { audioPath, error });
          storageErrors.push(`audio: ${error.message}`);
        } else {
          logger.info('Deleted audio file', { audioPath });
        }
      }
    }

    // AI audio file (tts-audio bucket)
    if (vibelog.ai_audio_url) {
      const aiAudioPath = extractStoragePath(vibelog.ai_audio_url, 'tts-audio');
      if (aiAudioPath) {
        const { error } = await adminClient.storage.from('tts-audio').remove([aiAudioPath]);
        if (error) {
          logger.error('Failed to delete AI audio file', { aiAudioPath, error });
          storageErrors.push(`ai_audio: ${error.message}`);
        } else {
          logger.info('Deleted AI audio file', { aiAudioPath });
        }
      }
    }

    // Video file (vibelogs bucket)
    if (vibelog.video_url) {
      const videoPath = extractStoragePath(vibelog.video_url, 'vibelogs');
      if (videoPath) {
        const { error } = await adminClient.storage.from('vibelogs').remove([videoPath]);
        if (error) {
          logger.error('Failed to delete video file', { videoPath, error });
          storageErrors.push(`video: ${error.message}`);
        } else {
          logger.info('Deleted video file', { videoPath });
        }
      }
    }

    // Cover image (vibelog-covers bucket)
    if (vibelog.cover_image_url) {
      const coverPath = extractStoragePath(vibelog.cover_image_url, 'vibelog-covers');
      if (coverPath) {
        const { error } = await adminClient.storage.from('vibelog-covers').remove([coverPath]);
        if (error) {
          logger.error('Failed to delete cover image', { coverPath, error });
          storageErrors.push(`cover: ${error.message}`);
        } else {
          logger.info('Deleted cover image', { coverPath });
        }
      }
    }

    // ============================================================================
    // STEP 3: Delete orphaned reactions (polymorphic table, no FK cascade)
    // ============================================================================
    const { error: reactionsError } = await adminClient
      .from('reactions')
      .delete()
      .eq('reactable_type', 'vibelog')
      .eq('reactable_id', vibelogId);

    if (reactionsError) {
      logger.error('Failed to delete reactions', { vibelogId, error: reactionsError });
      // Don't fail the entire operation, just log
    } else {
      logger.info('Deleted orphaned reactions', { vibelogId });
    }

    // ============================================================================
    // STEP 4: Delete content embeddings (for semantic search cleanup)
    // ============================================================================
    const { error: embeddingsError } = await adminClient
      .from('content_embeddings')
      .delete()
      .eq('content_type', 'vibelog')
      .eq('content_id', vibelogId);

    if (embeddingsError) {
      logger.error('Failed to delete embeddings', { vibelogId, error: embeddingsError });
      // Don't fail the entire operation, just log
    } else {
      logger.info('Deleted content embeddings', { vibelogId });
    }

    // ============================================================================
    // STEP 5: Delete vibelog (triggers CASCADE for likes, comments, notifications)
    // ============================================================================
    const { error: deleteError } = await adminClient
      .from('vibelogs')
      .delete()
      .eq('id', vibelogId);

    if (deleteError) {
      logger.error('Failed to delete vibelog from database', { vibelogId, error: deleteError });
      return {
        success: false,
        message: 'Failed to delete vibelog from database',
        error: 'DATABASE_ERROR',
      };
    }

    logger.info('Deleted vibelog from database', { vibelogId });

    // ============================================================================
    // STEP 6: Revalidate cache
    // ============================================================================
    const profile = Array.isArray(vibelog.profiles) ? vibelog.profiles[0] : vibelog.profiles;

    if (profile?.username && vibelog.slug) {
      const vibelogPath = `/@${profile.username}/${vibelog.slug}`;
      revalidatePath(vibelogPath);
      logger.info('Revalidated cache', { path: vibelogPath });
    }

    // Revalidate dashboard and profile pages
    revalidatePath('/dashboard');
    if (profile?.username) {
      revalidatePath(`/@${profile.username}`);
    }

    // ============================================================================
    // STEP 7: Log admin action (if admin performed the delete)
    // ============================================================================
    if (userIsAdmin && request) {
      await logAdminAction(userId, 'vibelog_delete', {
        targetVibelogId: vibelogId,
        targetUserId: vibelog.user_id,
        changes: {
          title: vibelog.title,
          slug: vibelog.slug,
          was_owner_delete: isOwner,
        },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });
      logger.info('Logged admin delete action', { vibelogId, userId });
    }

    // ============================================================================
    // Return success
    // ============================================================================
    return {
      success: true,
      message: 'Vibelog deleted successfully',
      storageWarnings: storageErrors.length > 0 ? storageErrors : undefined,
    };
  } catch (error) {
    logger.error('Delete service unexpected error', error instanceof Error ? error : { error });
    return {
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    };
  }
}
