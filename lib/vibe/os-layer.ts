/**
 * Vibelog OS Layer
 * 
 * OS-level vibe monitoring, blocking, and UI enhancements.
 * Manages user's emotional state and applies vibe-based rules.
 */

import type { 
  UserVibeState, 
  VibeAnalysis, 
  VibeScores,
  PrimaryVibe 
} from './types';

/**
 * Vibelog OS Layer Manager
 */
export class VibelogOS {
  /**
   * Create initial user vibe state
   */
  createInitialState(userId: string): UserVibeState {
    return {
      userId,
      currentVibe: {
        excitement: 50,
        humor: 30,
        flirtation: 20,
        calmness: 60,
        stress: 30,
        authenticity: 70,
        chaos: 40,
        warmth: 50,
        confidence: 50,
        vulnerability: 40,
      },
      primaryVibe: 'neutral',
      recentVibes: [],
      vibeThresholds: {
        doomscrollBlock: 75, // Block doomscrolling if stress > 75
        vibeRaveTrigger: 80,  // Trigger VibeRave if excitement > 80
        clarityModeTrigger: 70, // Trigger clarity mode if chaos > 70
      },
      osSettings: {
        vibeMonitoringEnabled: true,
        blockingEnabled: true,
        uiEnhancementsEnabled: true,
        privacyMode: 'partial', // 'full' | 'partial' | 'off'
      },
      lastUpdated: new Date().toISOString(),
      sessionStart: new Date().toISOString(),
    };
  }
  
  /**
   * Update user vibe state with new analysis
   */
  updateVibeState(
    currentState: UserVibeState,
    newVibe: VibeAnalysis
  ): UserVibeState {
    // Update current vibe (weighted average with recent)
    const currentScores = currentState.currentVibe;
    const newScores = newVibe.scores;
    
    // Weight: 70% new, 30% current (smooth transition)
    const updatedScores: VibeScores = {
      excitement: Math.round(currentScores.excitement * 0.3 + newScores.excitement * 0.7),
      humor: Math.round(currentScores.humor * 0.3 + newScores.humor * 0.7),
      flirtation: Math.round(currentScores.flirtation * 0.3 + newScores.flirtation * 0.7),
      calmness: Math.round(currentScores.calmness * 0.3 + newScores.calmness * 0.7),
      stress: Math.round(currentScores.stress * 0.3 + newScores.stress * 0.7),
      authenticity: Math.round(currentScores.authenticity * 0.3 + newScores.authenticity * 0.7),
      chaos: Math.round(currentScores.chaos * 0.3 + newScores.chaos * 0.7),
      warmth: Math.round(currentScores.warmth * 0.3 + newScores.warmth * 0.7),
      confidence: Math.round(currentScores.confidence * 0.3 + newScores.confidence * 0.7),
      vulnerability: Math.round(currentScores.vulnerability * 0.3 + newScores.vulnerability * 0.7),
    };
    
    // Update primary vibe
    const primaryVibe = this.determinePrimaryVibe(updatedScores);
    
    // Add to recent vibes (keep last 20)
    const recentVibes = [...currentState.recentVibes, newVibe].slice(-20);
    
    return {
      ...currentState,
      currentVibe: updatedScores,
      primaryVibe,
      recentVibes,
      lastUpdated: new Date().toISOString(),
    };
  }
  
  /**
   * Check if action should be blocked based on vibe
   */
  shouldBlockAction(
    state: UserVibeState,
    action: 'doomscroll' | 'social-media' | 'work' | 'shopping'
  ): {
    blocked: boolean;
    reason?: string;
    suggestion?: string;
  } {
    if (!state.osSettings.blockingEnabled) {
      return { blocked: false };
    }
    
    const { currentVibe, vibeThresholds } = state;
    
    switch (action) {
      case 'doomscroll':
        if (currentVibe.stress > vibeThresholds.doomscrollBlock) {
          return {
            blocked: true,
            reason: 'Your stress level is high. Doomscrolling might make it worse.',
            suggestion: 'Take a break. Maybe try some deep breathing or a walk?',
          };
        }
        break;
        
      case 'social-media':
        if (currentVibe.stress > 80 || currentVibe.chaos > 75) {
          return {
            blocked: true,
            reason: 'Your vibe suggests you might benefit from a social media break.',
            suggestion: 'How about some offline time? Your future self will thank you.',
          };
        }
        break;
        
      case 'work':
        if (currentVibe.stress > 90) {
          return {
            blocked: true,
            reason: 'Your stress is extremely high. Consider taking a break.',
            suggestion: 'Your productivity will be better after you recharge.',
          };
        }
        break;
        
      case 'shopping':
        if (currentVibe.chaos > 80 && currentVibe.stress > 70) {
          return {
            blocked: true,
            reason: 'High chaos + stress = impulse buying risk.',
            suggestion: 'Sleep on it. Your wallet (and future self) will thank you.',
          };
        }
        break;
    }
    
    return { blocked: false };
  }
  
  /**
   * Check if VibeRave mode should be triggered
   */
  shouldTriggerVibeRave(state: UserVibeState): boolean {
    if (!state.osSettings.uiEnhancementsEnabled) {
      return false;
    }
    
    const { currentVibe, vibeThresholds } = state;
    
    return currentVibe.excitement > vibeThresholds.vibeRaveTrigger ||
           (currentVibe.excitement > 70 && currentVibe.confidence > 75);
  }
  
  /**
   * Check if Clarity Mode should be triggered
   */
  shouldTriggerClarityMode(state: UserVibeState): boolean {
    if (!state.osSettings.uiEnhancementsEnabled) {
      return false;
    }
    
    const { currentVibe, vibeThresholds } = state;
    
    return currentVibe.chaos > vibeThresholds.clarityModeTrigger ||
           (currentVibe.stress > 70 && currentVibe.chaos > 60);
  }
  
  /**
   * Generate UI enhancement config based on vibe
   */
  getUIEnhancements(state: UserVibeState): {
    colors: {
      primary: string;
      secondary: string;
      background: string;
    };
    animations: {
      intensity: number; // 0-100
      type: 'pulse' | 'wave' | 'particle' | 'none';
    };
    haptics: {
      enabled: boolean;
      intensity: number; // 0-100
    };
  } {
    const { currentVibe, primaryVibe } = state;
    
    // Color mapping based on primary vibe
    const colorMap: Record<PrimaryVibe, { primary: string; secondary: string; background: string }> = {
      excited: { primary: '#FF6B6B', secondary: '#FFE66D', background: '#FFF5E6' },
      humorous: { primary: '#4ECDC4', secondary: '#FFE66D', background: '#F7FFF7' },
      flirty: { primary: '#FF6B9D', secondary: '#FFB6C1', background: '#FFF0F5' },
      calm: { primary: '#95E1D3', secondary: '#AAE3E0', background: '#F0F8F8' },
      stressed: { primary: '#FF8C94', secondary: '#FFB3BA', background: '#FFF5F5' },
      authentic: { primary: '#6C5CE7', secondary: '#A29BFE', background: '#F8F7FF' },
      chaotic: { primary: '#FF7675', secondary: '#FFA8A7', background: '#FFF0F0' },
      warm: { primary: '#FFB347', secondary: '#FFD700', background: '#FFF8DC' },
      confident: { primary: '#00D2FF', secondary: '#3A7BD5', background: '#E6F3FF' },
      vulnerable: { primary: '#C7CEEA', secondary: '#E2E8F0', background: '#F5F7FA' },
      neutral: { primary: '#95A5A6', secondary: '#BDC3C7', background: '#ECF0F1' },
      mixed: { primary: '#A8E6CF', secondary: '#D4F1F4', background: '#F0F8F8' },
    };
    
    const colors = colorMap[primaryVibe] || colorMap.neutral;
    
    // Animation intensity based on excitement/chaos
    const animationIntensity = Math.min(100, (currentVibe.excitement + currentVibe.chaos) / 2);
    let animationType: 'pulse' | 'wave' | 'particle' | 'none' = 'none';
    
    if (currentVibe.excitement > 70) {
      animationType = 'particle';
    } else if (currentVibe.chaos > 60) {
      animationType = 'wave';
    } else if (currentVibe.excitement > 50) {
      animationType = 'pulse';
    }
    
    // Haptics based on intensity
    const hapticsEnabled = currentVibe.excitement > 60 || currentVibe.stress > 70;
    const hapticsIntensity = Math.min(100, Math.max(currentVibe.excitement, currentVibe.stress));
    
    return {
      colors,
      animations: {
        intensity: animationIntensity,
        type: animationType,
      },
      haptics: {
        enabled: hapticsEnabled,
        intensity: hapticsIntensity,
      },
    };
  }
  
  /**
   * Determine primary vibe from scores
   */
  private determinePrimaryVibe(scores: VibeScores): PrimaryVibe {
    const entries = Object.entries(scores) as [keyof VibeScores, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    
    const [topKey, topValue] = sorted[0];
    const [secondKey, secondValue] = sorted[1];
    
    if (topValue - secondValue < 15) {
      return 'mixed';
    }
    
    const vibeMap: Record<keyof VibeScores, PrimaryVibe> = {
      excitement: 'excited',
      humor: 'humorous',
      flirtation: 'flirty',
      calmness: 'calm',
      stress: 'stressed',
      authenticity: 'authentic',
      chaos: 'chaotic',
      warmth: 'warm',
      confidence: 'confident',
      vulnerability: 'vulnerable',
    };
    
    return vibeMap[topKey] || 'neutral';
  }
}

// Singleton instance
let osInstance: VibelogOS | null = null;

export function getVibelogOS(): VibelogOS {
  if (!osInstance) {
    osInstance = new VibelogOS();
  }
  return osInstance;
}

