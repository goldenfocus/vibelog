import { NextRequest, NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { SUPPORTED_AUDIO_TYPES, SUPPORTED_VIDEO_TYPES } from '@/lib/music-storage';
import {
  generateStoragePath,
  getPresignedUploadUrl,
  getExtensionFromMimeType,
  getCategoryFromMimeType,
} from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/storage/upload-url
 *
 * Get presigned upload URL for direct client-side upload to Supabase Storage
 * This bypasses the 4.5MB API route limit
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request first
    const body = await request.json();
    const { fileType, fileSize, sessionId } = body;

    // Auth check - allow authenticated OR anonymous with session ID
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Generate user identifier: use user.id if authenticated, otherwise use sessionId
    const userId = user?.id || sessionId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - missing user or session ID' },
        { status: 401 }
      );
    }

    if (!fileType || !fileSize) {
      return NextResponse.json({ error: 'Missing fileType or fileSize' }, { status: 400 });
    }

    // Validate file size (max 500MB for 30min recordings)
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum file size is 500MB. Your file is ${(fileSize / 1024 / 1024).toFixed(1)}MB`,
        },
        { status: 413 }
      );
    }

    // Validate file type (normalize by stripping codecs parameter)
    const normalizedFileType = fileType.split(';')[0].trim();

    // Include all supported music types from music-storage + config audio types
    const allowedTypes = [
      ...config.files.audio.allowedTypes,
      ...SUPPORTED_AUDIO_TYPES,
      ...SUPPORTED_VIDEO_TYPES,
    ].map(type => type.split(';')[0].trim());

    // Deduplicate
    const uniqueAllowedTypes = [...new Set(allowedTypes)];

    if (!uniqueAllowedTypes.includes(normalizedFileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type', fileType: normalizedFileType },
        { status: 415 }
      );
    }

    // Generate storage path (use userId which can be user.id or sessionId)
    const category = getCategoryFromMimeType(fileType);
    const extension = getExtensionFromMimeType(fileType);
    const storagePath = generateStoragePath(userId, category, extension);

    // Get presigned URL
    const { signedUrl, path, token } = await getPresignedUploadUrl(storagePath);

    return NextResponse.json({
      uploadUrl: signedUrl,
      storagePath: path,
      token,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    console.error('Presign URL error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate upload URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
