/**
 * Safety & Ethics Layer
 * 
 * Detects passive-aggressiveness, hidden frustration, emotional masking,
 * and provides honesty filters for safe communication.
 */

import type { VibeAnalysis, SafetyFilterResult } from './types';

/**
 * Safety Filter Engine
 */
export class SafetyFilter {
  /**
   * Analyze vibe for safety concerns
   */
  analyze(vibe: VibeAnalysis): SafetyFilterResult {
    const warnings: SafetyFilterResult['warnings'] = [];
    
    // Check for passive-aggressive patterns
    if (vibe.microVibes.passiveAggressive && vibe.microVibes.passiveAggressive > 60) {
      warnings.push({
        type: 'passiveAggressive',
        severity: vibe.microVibes.passiveAggressive > 80 ? 'high' : 'medium',
        message: 'This message contains passive-aggressive undertones.',
        suggestion: 'Consider expressing your feelings more directly and clearly.',
      });
    }
    
    // Check for hidden frustration
    if (vibe.hiddenVibes.maskingAnger && vibe.scores.stress > 70) {
      warnings.push({
        type: 'hiddenFrustration',
        severity: 'high',
        message: 'Hidden frustration detected. The sender may be masking anger.',
        suggestion: 'This might be a good time to check in and create space for honest conversation.',
      });
    }
    
    // Check for emotional masking
    if (vibe.hiddenVibes.notOkayButOkay) {
      warnings.push({
        type: 'emotionalMasking',
        severity: 'medium',
        message: 'The sender says they\'re okay, but the vibe suggests otherwise.',
        suggestion: 'Consider gently checking in: "I sense you might not be fully okay. Want to talk?"',
      });
    }
    
    if (vibe.hiddenVibes.performativeHappiness && vibe.scores.stress > 60) {
      warnings.push({
        type: 'emotionalMasking',
        severity: 'high',
        message: 'Performative happiness detected. The sender may be forcing a positive tone.',
        suggestion: 'Create a safe space for authentic expression without pressure to be positive.',
      });
    }
    
    // Check for harmful patterns
    if (vibe.scores.stress > 90 && vibe.scores.chaos > 80) {
      warnings.push({
        type: 'harmful',
        severity: 'high',
        message: 'Extremely high stress and chaos detected. The sender may need support.',
        suggestion: 'Consider reaching out with care and offering resources if appropriate.',
      });
    }
    
    // Determine if passed
    const passed = warnings.filter(w => w.severity === 'high').length === 0;
    
    // Create filtered vibe if needed
    let filteredVibe: Partial<VibeAnalysis> | undefined;
    if (!passed) {
      // Reduce intensity of problematic scores
      filteredVibe = {
        scores: {
          ...vibe.scores,
          stress: Math.max(0, vibe.scores.stress - 20),
          chaos: Math.max(0, vibe.scores.chaos - 15),
        },
      };
    }
    
    return {
      passed,
      warnings,
      filteredVibe,
    };
  }
  
  /**
   * Check if vibe should be blocked based on user settings
   */
  shouldBlock(
    vibe: VibeAnalysis,
    settings: {
      blockPassiveAggressive: boolean;
      blockHighStress: boolean;
      blockEmotionalMasking: boolean;
    }
  ): boolean {
    const result = this.analyze(vibe);
    
    if (settings.blockPassiveAggressive) {
      const hasPassiveAggressive = result.warnings.some(
        w => w.type === 'passiveAggressive' && w.severity === 'high'
      );
      if (hasPassiveAggressive) {return true;}
    }
    
    if (settings.blockHighStress) {
      if (vibe.scores.stress > 85) {return true;}
    }
    
    if (settings.blockEmotionalMasking) {
      const hasMasking = result.warnings.some(
        w => w.type === 'emotionalMasking' && w.severity === 'high'
      );
      if (hasMasking) {return true;}
    }
    
    return false;
  }
}

// Singleton instance
let safetyFilterInstance: SafetyFilter | null = null;

export function getSafetyFilter(): SafetyFilter {
  if (!safetyFilterInstance) {
    safetyFilterInstance = new SafetyFilter();
  }
  return safetyFilterInstance;
}

