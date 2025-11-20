/**
 * GET /api/vibe/state?userId=xxx
 * POST /api/vibe/state (update state)
 * 
 * Get or update user's current vibe state
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getVibeDetector } from '@/lib/vibe/detector';
import { getVibelogOS } from '@/lib/vibe/os-layer';
import type { GetVibeStateRequest, GetVibeStateResponse, UserVibeState } from '@/lib/vibe/types';


const updateStateSchema = z.object({
  userId: z.string().uuid(),
  text: z.string().optional(), // New text to analyze and incorporate
  settings: z.object({
    vibeMonitoringEnabled: z.boolean().optional(),
    blockingEnabled: z.boolean().optional(),
    uiEnhancementsEnabled: z.boolean().optional(),
    privacyMode: z.enum(['full', 'partial', 'off']).optional(),
  }).optional(),
  thresholds: z.object({
    doomscrollBlock: z.number().min(0).max(100).optional(),
    vibeRaveTrigger: z.number().min(0).max(100).optional(),
    clarityModeTrigger: z.number().min(0).max(100).optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'userId query parameter is required',
          },
          success: false,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 422 }
      );
    }
    
    // Get from database (TODO: implement database storage)
    // For now, create initial state
    const os = getVibelogOS();
    const state = os.createInitialState(userId);
    
    const response: GetVibeStateResponse = {
      state,
    };
    
    return NextResponse.json(
      {
        data: response,
        success: true,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get vibe state error:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get vibe state',
          details: error instanceof Error ? { message: error.message } : {},
        },
        success: false,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GetVibeStateRequest & {
      text?: string;
      settings?: UserVibeState['osSettings'];
      thresholds?: UserVibeState['vibeThresholds'];
    };
    
    // Validate input
    const validation = updateStateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
          success: false,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 422 }
      );
    }
    
    const { userId, text, settings, thresholds } = validation.data;
    
    const os = getVibelogOS();
    
    // Get current state (or create new)
    let state = os.createInitialState(userId);
    
    // If text provided, analyze and update
    if (text) {
      const detector = getVibeDetector();
      const newVibe = await detector.analyze(text);
      state = os.updateVibeState(state, newVibe);
    }
    
    // Update settings if provided
    if (settings) {
      state.osSettings = { ...state.osSettings, ...settings };
    }
    
    // Update thresholds if provided
    if (thresholds) {
      state.vibeThresholds = { ...state.vibeThresholds, ...thresholds };
    }
    
    // TODO: Save to database
    
    const response: GetVibeStateResponse = {
      state,
    };
    
    return NextResponse.json(
      {
        data: response,
        success: true,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update vibe state error:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update vibe state',
          details: error instanceof Error ? { message: error.message } : {},
        },
        success: false,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

