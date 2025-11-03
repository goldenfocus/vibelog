import { NextRequest, NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/delete-voice
 *
 * Deletes a voice from ElevenLabs to clean up old voices after recloning
 */
export async function POST(request: NextRequest) {
  try {
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voiceId } = await request.json();

    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }

    if (!config.ai.elevenlabs.apiKey) {
      return NextResponse.json({ error: 'Voice cloning not configured' }, { status: 503 });
    }

    // Delete voice from ElevenLabs
    const response = await fetch(`${config.ai.elevenlabs.apiUrl}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': config.ai.elevenlabs.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('⚠️ [DELETE-VOICE] Failed to delete voice from ElevenLabs:', {
        voiceId,
        status: response.status,
        error: errorText,
      });
      // Don't fail - old voice deletion is non-critical
      return NextResponse.json({
        success: false,
        message: 'Voice deletion failed (non-critical)',
      });
    }

    console.log('✅ [DELETE-VOICE] Successfully deleted old voice:', voiceId);

    return NextResponse.json({
      success: true,
      message: 'Old voice deleted successfully',
    });
  } catch (error) {
    console.error('❌ [DELETE-VOICE] Error deleting voice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
