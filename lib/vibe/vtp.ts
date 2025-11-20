/**
 * Vibe Transmission Protocol (VTP)
 * 
 * Communication protocol for sending and receiving vibe packets
 * with real-time streaming support and vibe decay.
 */

import { randomUUID } from 'crypto';

import { getVibeDetector } from './detector';
import type { 
  VibePacket, 
  VibeStreamChunk, 
  VibeAnalysis,
  UserVibeState 
} from './types';

/**
 * VTP Protocol Handler
 */
export class VTPProtocol {
  private version = '1.0.0';
  
  /**
   * Create a vibe packet from text
   */
  async createPacket(
    text: string,
    senderId: string,
    options?: {
      senderMoodSignature?: Partial<import('./types').VibeScores>;
      expiresIn?: number; // seconds until vibe decay
      context?: {
        previousMessages?: string[];
      };
    }
  ): Promise<VibePacket> {
    const detector = getVibeDetector();
    const vibe = await detector.analyze(text, {
      previousMessages: options?.context?.previousMessages,
    });
    
    const packet: VibePacket = {
      text,
      vibe,
      senderId,
      senderMoodSignature: options?.senderMoodSignature as import('./types').VibeScores,
      packetId: randomUUID(),
      timestamp: new Date().toISOString(),
      vtpVersion: this.version,
    };
    
    // Add expiration if specified
    if (options?.expiresIn) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + options.expiresIn);
      packet.expiresAt = expiresAt.toISOString();
    }
    
    return packet;
  }
  
  /**
   * Stream vibe analysis as text comes in
   */
  async *streamPacket(
    textStream: AsyncGenerator<string>,
    senderId: string
  ): AsyncGenerator<VibeStreamChunk> {
    const detector = getVibeDetector();
    let accumulatedText = '';
    const packetId = randomUUID();
    
    for await (const chunk of textStream) {
      accumulatedText += chunk;
      
      // Analyze accumulated text
      const partialVibe = await detector.analyze(accumulatedText);
      
      const streamChunk: VibeStreamChunk = {
        packetId,
        partialText: accumulatedText,
        partialVibe: {
          scores: partialVibe.scores,
          primaryVibe: partialVibe.primaryVibe,
          confidence: partialVibe.confidence * 0.8, // Lower confidence for partial
        },
        isComplete: false,
        timestamp: new Date().toISOString(),
      };
      
      yield streamChunk;
    }
    
    // Final complete analysis
    const finalVibe = await detector.analyze(accumulatedText);
    const finalChunk: VibeStreamChunk = {
      packetId,
      partialText: accumulatedText,
      partialVibe: finalVibe,
      isComplete: true,
      timestamp: new Date().toISOString(),
    };
    
    yield finalChunk;
  }
  
  /**
   * Check if packet has expired (vibe decay)
   */
  isExpired(packet: VibePacket): boolean {
    if (!packet.expiresAt) {
      return false; // No expiration set
    }
    
    return new Date(packet.expiresAt) < new Date();
  }
  
  /**
   * Calculate vibe decay factor (0-1) based on age
   */
  getDecayFactor(packet: VibePacket): number {
    if (!packet.expiresAt) {
      return 1.0; // No decay
    }
    
    const now = new Date();
    const expires = new Date(packet.expiresAt);
    const created = new Date(packet.timestamp);
    
    const totalDuration = expires.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    
    if (elapsed >= totalDuration) {
      return 0.0; // Fully decayed
    }
    
    // Linear decay
    return 1.0 - (elapsed / totalDuration);
  }
  
  /**
   * Apply vibe decay to packet
   */
  applyDecay(packet: VibePacket): VibePacket {
    const decayFactor = this.getDecayFactor(packet);
    
    if (decayFactor >= 1.0) {
      return packet; // No decay needed
    }
    
    // Reduce intensity of scores based on decay
    const decayedScores = Object.entries(packet.vibe.scores).reduce(
      (acc, [key, value]) => {
        acc[key as keyof typeof packet.vibe.scores] = Math.round(value * decayFactor);
        return acc;
      },
      {} as typeof packet.vibe.scores
    );
    
    return {
      ...packet,
      vibe: {
        ...packet.vibe,
        scores: decayedScores,
      },
    };
  }
  
  /**
   * Validate packet structure
   */
  validatePacket(packet: Partial<VibePacket>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!packet.text) {
      errors.push('Missing text field');
    }
    
    if (!packet.vibe) {
      errors.push('Missing vibe field');
    } else {
      if (!packet.vibe.scores) {
        errors.push('Missing vibe.scores');
      }
      if (!packet.vibe.primaryVibe) {
        errors.push('Missing vibe.primaryVibe');
      }
    }
    
    if (!packet.senderId) {
      errors.push('Missing senderId');
    }
    
    if (!packet.packetId) {
      errors.push('Missing packetId');
    }
    
    if (!packet.timestamp) {
      errors.push('Missing timestamp');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Merge multiple vibe packets (for conversation context)
   */
  mergePackets(packets: VibePacket[]): VibeAnalysis {
    if (packets.length === 0) {
      throw new Error('Cannot merge empty packet array');
    }
    
    if (packets.length === 1) {
      return packets[0].vibe;
    }
    
    // Average scores across packets
    const mergedScores = packets.reduce(
      (acc, packet) => {
        Object.entries(packet.vibe.scores).forEach(([key, value]) => {
          acc[key as keyof typeof acc] += value;
        });
        return acc;
      },
      {
        excitement: 0,
        humor: 0,
        flirtation: 0,
        calmness: 0,
        stress: 0,
        authenticity: 0,
        chaos: 0,
        warmth: 0,
        confidence: 0,
        vulnerability: 0,
      }
    );
    
    // Average the scores
    Object.keys(mergedScores).forEach(key => {
      mergedScores[key as keyof typeof mergedScores] = Math.round(
        mergedScores[key as keyof typeof mergedScores] / packets.length
      );
    });
    
    // Determine primary vibe from merged scores
    const entries = Object.entries(mergedScores) as [keyof typeof mergedScores, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const primaryVibe = sorted[0][0] === 'excitement' ? 'excited' :
                       sorted[0][0] === 'humor' ? 'humorous' :
                       sorted[0][0] === 'flirtation' ? 'flirty' :
                       sorted[0][0] === 'calmness' ? 'calm' :
                       sorted[0][0] === 'stress' ? 'stressed' :
                       sorted[0][0] === 'authenticity' ? 'authentic' :
                       sorted[0][0] === 'chaos' ? 'chaotic' :
                       sorted[0][0] === 'warmth' ? 'warm' :
                       sorted[0][0] === 'confidence' ? 'confident' :
                       sorted[0][0] === 'vulnerability' ? 'vulnerable' : 'mixed';
    
    // Use most recent packet's metadata
    const latestPacket = packets[packets.length - 1];
    
    return {
      scores: mergedScores as import('./types').VibeScores,
      primaryVibe,
      confidence: Math.min(1.0, latestPacket.vibe.confidence * 0.9), // Slightly lower for merged
      microVibes: latestPacket.vibe.microVibes, // Use latest micro-vibes
      hiddenVibes: latestPacket.vibe.hiddenVibes, // Use latest hidden vibes
      detectedAt: new Date().toISOString(),
      modelVersion: latestPacket.vibe.modelVersion,
      processingTime: packets.reduce((sum, p) => sum + p.vibe.processingTime, 0),
      textLength: packets.reduce((sum, p) => sum + p.text.length, 0),
      language: latestPacket.vibe.language,
    };
  }
}

// Singleton instance
let vtpInstance: VTPProtocol | null = null;

export function getVTPProtocol(): VTPProtocol {
  if (!vtpInstance) {
    vtpInstance = new VTPProtocol();
  }
  return vtpInstance;
}

