import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { VIBELOGS_BUCKET } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

function generateAudioPath(sessionId: string, userId?: string): string {
  const timestamp = Date.now();
  const hash = crypto
    .createHash('sha1')
    .update(`${sessionId}-${timestamp}`)
    .digest('hex')
    .slice(0, 8);
  const dir = userId ? `users/${userId}/audio` : 'sessions';
  return `${dir}/${sessionId}-${hash}.webm`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // SECURITY: Get user from session, NEVER trust client-supplied userId
    const supabaseClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const userId = user?.id || null;

    console.log('🎵 [AUDIO-UPLOAD] Uploading audio:', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      sessionId,
      userId: userId || 'anonymous',
      authenticated: !!user,
    });

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage path using server-verified userId
    const path = generateAudioPath(sessionId, userId || undefined);

    // Normalize content type (strip codecs parameter)
    // Browser sends "audio/webm;codecs=opus" but Supabase needs "audio/webm"
    const contentType = (audioFile.type || 'audio/webm').split(';')[0].trim();

    // Upload to VIBELOGS bucket (not vibelog-covers)
    const supabaseAdmin = await createServerAdminClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(VIBELOGS_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Generate public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${VIBELOGS_BUCKET}/${path}`
      : `/${path}`;

    console.log('✅ [AUDIO-UPLOAD] Upload successful:', {
      url,
      path,
      bucket: VIBELOGS_BUCKET,
      size: buffer.length,
    });

    return NextResponse.json({
      success: true,
      url,
      path,
      size: buffer.length,
      duration: null, // Will be set by the frontend
    });
  } catch (error) {
    console.error('❌ [AUDIO-UPLOAD] Upload failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
