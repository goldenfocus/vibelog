/**
 * POST /api/vibe/analyze
 * 
 * Analyze text for vibe metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getVibeDetector } from '@/lib/vibe/detector';
import { getSafetyFilter } from '@/lib/vibe/safety';
import type { AnalyzeVibeRequest, AnalyzeVibeResponse } from '@/lib/vibe/types';

const analyzeVibeSchema = z.object({
  text: z.string().min(1).max(10000),
  context: z.object({
    previousMessages: z.array(z.string()).optional(),
    userId: z.string().optional(),
    customProfileId: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalyzeVibeRequest;
    
    // Validate input
    const validation = analyzeVibeSchema.safeParse(body);
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
    
    const { text, context } = validation.data;
    
    // Analyze vibe
    const detector = getVibeDetector();
    const vibe = await detector.analyze(text, {
      previousMessages: context?.previousMessages,
    });
    
    // Run safety filter
    const safetyFilter = getSafetyFilter();
    const safety = safetyFilter.analyze(vibe);
    
    const response: AnalyzeVibeResponse = {
      vibe,
      safety,
    };
    
    return NextResponse.json(
      {
        data: response,
        success: true,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          processingTime: vibe.processingTime,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Vibe analysis error:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze vibe',
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

