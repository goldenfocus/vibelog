/**
 * DELETE /api/delete-vibelog/[id]
 *
 * Delete a vibelog with complete cleanup
 *
 * Authorization: Owner OR Admin
 *
 * Features:
 * - Validates ownership or admin privileges
 * - Cleans up all storage files (audio, video, covers, AI audio)
 * - Removes reactions, embeddings, and cascades to related data
 * - Revalidates cache
 * - Logs admin actions
 * - Supports anonymous vibelogs
 *
 * This is the SINGLE SOURCE OF TRUTH for vibelog deletion.
 * All client components should use this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { deleteVibelog } from '@/lib/services/vibelog-delete-service';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vibelog ID
    const { id: vibelogId } = await params;

    // Check if user is admin
    const adminClient = await createServerAdminClient();
    const { data: userProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    logger.info('Delete authorization check', {
      userId: user.id,
      vibelogId,
      userProfile,
      profileError,
    });

    const isAdmin = userProfile?.is_admin === true;

    // Call centralized delete service
    const result = await deleteVibelog({
      vibelogId,
      userId: user.id,
      userIsAdmin: isAdmin,
      request,
    });

    // Log result
    if (result.success) {
      logger.info('Vibelog deleted successfully', {
        vibelogId,
        userId: user.id,
        isAdmin,
        storageWarnings: result.storageWarnings,
      });
    } else {
      logger.error('Vibelog delete failed', {
        vibelogId,
        userId: user.id,
        error: result.error,
        message: result.message,
      });
    }

    // Map result to HTTP response
    if (!result.success) {
      const statusCode =
        result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500;

      return NextResponse.json(
        {
          error: result.message,
        },
        { status: statusCode }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: result.message,
      storageWarnings: result.storageWarnings,
    });
  } catch (error) {
    logger.error('Delete API unexpected error', error instanceof Error ? error : { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
