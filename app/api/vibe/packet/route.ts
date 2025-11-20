/**
 * POST /api/vibe/packet
 * 
 * Send a vibe packet (VTP protocol)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getVibelogOS } from '@/lib/vibe/os-layer';
import type { SendVibePacketRequest, SendVibePacketResponse } from '@/lib/vibe/types';
import { getVTPProtocol } from '@/lib/vibe/vtp';


const sendPacketSchema = z.object({
  packet: z.object({
    text: z.string().min(1),
    senderId: z.string().uuid(),
    senderMoodSignature: z.any().optional(),
    expiresIn: z.number().optional(),
    context: z.object({
      previousMessages: z.array(z.string()).optional(),
    }).optional(),
  }),
  recipientId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SendVibePacketRequest & {
      recipientId?: string;
    };
    
    // Validate input
    const validation = sendPacketSchema.safeParse(body);
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
    
    const { packet: packetData, recipientId } = validation.data;
    
    // Create vibe packet using VTP
    const vtp = getVTPProtocol();
    const packet = await vtp.createPacket(
      packetData.text,
      packetData.senderId,
      {
        senderMoodSignature: packetData.senderMoodSignature,
        expiresIn: packetData.expiresIn,
        context: packetData.context,
      }
    );
    
    // Validate packet
    const validationResult = vtp.validatePacket(packet);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PACKET',
            message: 'Packet validation failed',
            details: { errors: validationResult.errors },
          },
          success: false,
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }
    
    // If recipient provided, update their vibe state
    let recipientVibeState = undefined;
    if (recipientId) {
      const os = getVibelogOS();
      let recipientState = os.createInitialState(recipientId);
      recipientState = os.updateVibeState(recipientState, packet.vibe);
      recipientVibeState = recipientState;
      
      // TODO: Save to database and notify recipient
    }
    
    const response: SendVibePacketResponse = {
      packet,
      delivered: true,
      recipientVibeState,
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
    console.error('Send vibe packet error:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send vibe packet',
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

