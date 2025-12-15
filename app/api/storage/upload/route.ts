import { NextRequest, NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { SUPPORTED_AUDIO_TYPES, SUPPORTED_VIDEO_TYPES } from '@/lib/music-storage';
import {
  generateStoragePath,
  getCategoryFromMimeType,
  getExtensionFromMimeType,
  getVibelogPublicUrl,
  VIBELOGS_BUCKET,
} from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large uploads

/**
 * POST /api/storage/upload
 *
 * Direct upload to Supabase Storage via server
 * Accepts multipart/form-data with audio file
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    // Accept files from multiple field names (audio, image, video)
    const file = (formData.get('audio') || formData.get('image') || formData.get('video')) as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 500MB)
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `Maximum file size is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        },
        { status: 413 }
      );
    }

    // Normalize file type
    const normalizedFileType = file.type.split(';')[0].trim();

    // Validate file type (audio, images, videos, and text)
    // Include all supported types from music-storage + config + images + text
    const allowedTypes = [
      ...config.files.audio.allowedTypes,
      ...SUPPORTED_AUDIO_TYPES,
      ...SUPPORTED_VIDEO_TYPES,
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/markdown',
      'text/x-markdown',
      'text/csv',
      'text/html',
      'text/xml',
      'text/yaml',
      'text/rtf',
      'application/json',
      'application/xml',
      'application/rtf',
      'application/yaml',
      'application/x-yaml',
    ].map(type => type.split(';')[0].trim());

    // Deduplicate
    const uniqueAllowedTypes = [...new Set(allowedTypes)];

    if (!uniqueAllowedTypes.includes(normalizedFileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type', fileType: normalizedFileType },
        { status: 415 }
      );
    }

    // Generate storage path
    const category = getCategoryFromMimeType(file.type);
    const extension = getExtensionFromMimeType(file.type);
    const storagePath = generateStoragePath(user.id, category, extension);

    console.log(
      '📤 Uploading to storage:',
      storagePath,
      `(${(file.size / 1024 / 1024).toFixed(2)}MB)`
    );

    // Convert File to ArrayBuffer then Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage using service role (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from(VIBELOGS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: normalizedFileType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Upload failed', message: uploadError.message },
        { status: 500 }
      );
    }

    console.log('✅ Upload successful:', storagePath);

    // Get public URL
    const publicUrl = getVibelogPublicUrl(storagePath);

    return NextResponse.json({
      storagePath,
      url: publicUrl,
      success: true,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
