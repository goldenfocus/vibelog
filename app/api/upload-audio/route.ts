import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { storage } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase';

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

    // Upload to Supabase Storage
    const result = await storage.put(path, buffer, audioFile.type || 'audio/webm');

    console.log('✅ [AUDIO-UPLOAD] Upload successful:', {
      url: result.url,
      path: result.path,
      size: buffer.length,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
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
