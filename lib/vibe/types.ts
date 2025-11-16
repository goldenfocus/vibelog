/**
 * Vibe Communication Engine - Core Types
 * 
 * Defines the foundational types for vibe-based communication across
 * platform, OS, and API layers.
 */

/**
 * Primary vibe categories with percentage scores (0-100)
 */
export interface VibeScores {
  excitement: number;      // 0-100: How excited/energetic
  humor: number;            // 0-100: How funny/humorous
  flirtation: number;      // 0-100: How flirty/playful
  calmness: number;         // 0-100: How calm/peaceful
  stress: number;           // 0-100: How stressed/anxious
  authenticity: number;     // 0-100: How genuine/real
  chaos: number;            // 0-100: How chaotic/unpredictable
  warmth: number;           // 0-100: How warm/caring
  confidence: number;       // 0-100: How confident/assertive
  vulnerability: number;    // 0-100: How open/vulnerable
}

/**
 * Primary vibe classification
 */
export type PrimaryVibe = 
  | 'excited'
  | 'humorous'
  | 'flirty'
  | 'calm'
  | 'stressed'
  | 'authentic'
  | 'chaotic'
  | 'warm'
  | 'confident'
  | 'vulnerable'
  | 'neutral'
  | 'mixed';

/**
 * Micro-vibes are subtle emotional nuances
 */
export interface MicroVibes {
  sarcasm?: number;         // 0-100: Sarcasm level
  passiveAggressive?: number; // 0-100: Hidden frustration
  enthusiasm?: number;      // 0-100: Enthusiasm burst
  melancholy?: number;      // 0-100: Subtle sadness
  playfulness?: number;     // 0-100: Playful energy
  intensity?: number;       // 0-100: Overall intensity
  [key: string]: number | undefined; // Allow custom micro-vibes
}

/**
 * Hidden vibes are emotions that might be masked
 */
export interface HiddenVibes {
  maskingStress?: boolean;      // Trying to hide stress
  maskingSadness?: boolean;     // Trying to hide sadness
  maskingAnger?: boolean;       // Trying to hide anger
  notOkayButOkay?: boolean;    // "I'm fine" when not fine
  performativeHappiness?: boolean; // Forced happiness
  [key: string]: boolean | undefined;
}

/**
 * Complete vibe analysis result
 */
export interface VibeAnalysis {
  // Core scores
  scores: VibeScores;
  
  // Classification
  primaryVibe: PrimaryVibe;
  confidence: number; // 0-1: How confident in classification
  
  // Nuanced layers
  microVibes: MicroVibes;
  hiddenVibes: HiddenVibes;
  
  // Metadata
  detectedAt: string; // ISO timestamp
  modelVersion: string; // AI model version used
  processingTime: number; // ms
  
  // Context
  textLength: number;
  language?: string;
}

/**
 * Vibe Packet - The core transmission unit
 */
export interface VibePacket {
  // Message content
  text: string;
  
  // Vibe metadata
  vibe: VibeAnalysis;
  
  // Sender information
  senderId: string;
  senderMoodSignature?: VibeScores; // Baseline mood
  
  // Transmission metadata
  packetId: string;
  timestamp: string;
  expiresAt?: string; // Optional: vibe decay
  
  // Protocol version
  vtpVersion: string; // "1.0.0"
}

/**
 * Real-time vibe stream chunk
 */
export interface VibeStreamChunk {
  packetId: string;
  partialText: string;
  partialVibe: Partial<VibeAnalysis>;
  isComplete: boolean;
  timestamp: string;
}

/**
 * User's current vibe state (for OS layer)
 */
export interface UserVibeState {
  userId: string;
  
  // Current state
  currentVibe: VibeScores;
  primaryVibe: PrimaryVibe;
  
  // History (last N interactions)
  recentVibes: VibeAnalysis[];
  
  // Thresholds
  vibeThresholds: {
    doomscrollBlock: number;      // Stress threshold to block doomscrolling
    vibeRaveTrigger: number;        // Excitement threshold for VibeRave mode
    clarityModeTrigger: number;    // Chaos threshold for clarity mode
  };
  
  // OS layer settings
  osSettings: {
    vibeMonitoringEnabled: boolean;
    blockingEnabled: boolean;
    uiEnhancementsEnabled: boolean;
    privacyMode: 'full' | 'partial' | 'off';
  };
  
  // Timestamps
  lastUpdated: string;
  sessionStart: string;
}

/**
 * Vibe-based UI reaction
 */
export interface VibeReaction {
  type: 'color' | 'animation' | 'haptic' | 'sound' | 'particle';
  intensity: number; // 0-100
  duration: number; // ms
  config: Record<string, unknown>;
}

/**
 * Vibe history entry for timeline
 */
export interface VibeHistoryEntry {
  id: string;
  timestamp: string;
  vibe: VibeAnalysis;
  context?: {
    source: 'message' | 'vibelog' | 'interaction' | 'manual';
    sourceId?: string;
  };
}

/**
 * Custom vibe profile for advanced users
 */
export interface CustomVibeProfile {
  userId: string;
  profileName: string;
  
  // Custom vibe definitions
  customVibes: {
    name: string;
    description: string;
    scoreWeights: Partial<VibeScores>;
  }[];
  
  // Detection preferences
  sensitivity: {
    [key in keyof VibeScores]?: number; // 0-200: multiplier for detection
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Safety filter result
 */
export interface SafetyFilterResult {
  passed: boolean;
  warnings: {
    type: 'passiveAggressive' | 'hiddenFrustration' | 'emotionalMasking' | 'harmful';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion?: string;
  }[];
  filteredVibe?: Partial<VibeAnalysis>;
}

/**
 * API Request/Response types
 */
export interface AnalyzeVibeRequest {
  text: string;
  context?: {
    previousMessages?: string[];
    userId?: string;
    customProfileId?: string;
  };
}

export interface AnalyzeVibeResponse {
  vibe: VibeAnalysis;
  safety?: SafetyFilterResult;
}

export interface GetVibeStateRequest {
  userId: string;
}

export interface GetVibeStateResponse {
  state: UserVibeState;
}

export interface SendVibePacketRequest {
  packet: Omit<VibePacket, 'packetId' | 'timestamp'>;
}

export interface SendVibePacketResponse {
  packet: VibePacket;
  delivered: boolean;
  recipientVibeState?: UserVibeState;
}

