/**
 * Fun & Humor Modules
 * 
 * Sarcasm detector, flirtation amplifier, spiritual grandma warnings,
 * and motivational cheerleader animations.
 */

import type { VibeAnalysis, MicroVibes } from './types';

/**
 * Humor & Fun Detection Engine
 */
export class HumorModule {
  /**
   * Detect sarcasm level
   */
  detectSarcasm(vibe: VibeAnalysis): {
    level: 'none' | 'light' | 'moderate' | 'heavy' | 'nuclear';
    confidence: number;
  } {
    const sarcasmScore = vibe.microVibes.sarcasm || 0;
    
    let level: 'none' | 'light' | 'moderate' | 'heavy' | 'nuclear';
    if (sarcasmScore < 20) level = 'none';
    else if (sarcasmScore < 40) level = 'light';
    else if (sarcasmScore < 60) level = 'moderate';
    else if (sarcasmScore < 80) level = 'heavy';
    else level = 'nuclear';
    
    return {
      level,
      confidence: sarcasmScore / 100,
    };
  }
  
  /**
   * Amplify flirtation (for fun mode)
   */
  amplifyFlirtation(vibe: VibeAnalysis, multiplier: number = 1.5): VibeAnalysis {
    const amplified = Math.min(100, vibe.scores.flirtation * multiplier);
    
    return {
      ...vibe,
      scores: {
        ...vibe.scores,
        flirtation: Math.round(amplified),
      },
    };
  }
  
  /**
   * Check "not okay but trying to be okay" meter
   */
  checkNotOkayButOkay(vibe: VibeAnalysis): {
    level: number; // 0-100
    message: string;
    spiritualGrandmaWarning?: string;
  } {
    const level = vibe.hiddenVibes.notOkayButOkay 
      ? Math.min(100, vibe.scores.stress + vibe.scores.chaos) 
      : 0;
    
    let message = '';
    let spiritualGrandmaWarning: string | undefined;
    
    if (level > 80) {
      message = 'You\'re definitely not okay, honey.';
      spiritualGrandmaWarning = 'Sweetie, I can see through that smile. Your energy is telling a different story. Take a deep breath, drink some tea, and remember: it\'s okay to not be okay. The universe doesn\'t need you to be perfect. 💜';
    } else if (level > 60) {
      message = 'You\'re trying hard to be okay, but the vibe says otherwise.';
      spiritualGrandmaWarning = 'Darling, I sense you\'re carrying more than you need to. Sometimes the bravest thing is admitting you\'re not fine. The stars are listening. ✨';
    } else if (level > 40) {
      message = 'Slight "I\'m fine" energy detected.';
      spiritualGrandmaWarning = 'Honey, even the moon has phases. It\'s natural to have ups and downs. Be gentle with yourself. 🌙';
    } else {
      message = 'You seem genuinely okay!';
    }
    
    return {
      level,
      message,
      spiritualGrandmaWarning,
    };
  }
  
  /**
   * Generate motivational cheerleader message for high vibe
   */
  getCheerleaderMessage(vibe: VibeAnalysis): string | null {
    const excitement = vibe.scores.excitement;
    const confidence = vibe.scores.confidence;
    const overallVibe = (excitement + confidence) / 2;
    
    if (overallVibe < 70) {
      return null; // Not high enough for cheerleading
    }
    
    const messages = [
      'YES! Your vibe is absolutely FIRE right now! 🔥✨',
      'Look at you GO! That energy is contagious! 🌟',
      'You\'re radiating pure magic! Keep it up! ✨💫',
      'This is the vibe! You\'re unstoppable! 🚀',
      'Your energy is LIT! The universe is matching your frequency! 🌈',
      'You\'re in the ZONE! Ride this wave! 🌊',
      'That confidence? That excitement? CHEF\'S KISS! 👌✨',
    ];
    
    // Pick message based on vibe type
    if (vibe.primaryVibe === 'excited') {
      return messages[0];
    } else if (vibe.primaryVibe === 'confident') {
      return messages[3];
    } else if (vibe.primaryVibe === 'humorous') {
      return messages[6];
    }
    
    // Random selection for mixed/high vibes
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  /**
   * Generate vibe-specific emoji reactions
   */
  getVibeEmojis(vibe: VibeAnalysis): string[] {
    const emojis: string[] = [];
    
    // Primary vibe emojis
    const vibeEmojiMap: Record<string, string[]> = {
      excited: ['🔥', '⚡', '✨', '🚀'],
      humorous: ['😂', '🤣', '😄', '💫'],
      flirty: ['😏', '😉', '💋', '🌹'],
      calm: ['🧘', '🌊', '🌸', '✨'],
      stressed: ['😰', '😓', '💔', '🌧️'],
      authentic: ['💎', '🌟', '✨', '💜'],
      chaotic: ['🌀', '⚡', '💥', '🌪️'],
      warm: ['💛', '🤗', '☀️', '🌻'],
      confident: ['👑', '💪', '🔥', '✨'],
      vulnerable: ['💙', '🦋', '🌙', '💫'],
    };
    
    emojis.push(...(vibeEmojiMap[vibe.primaryVibe] || ['✨']));
    
    // Add micro-vibe emojis
    if (vibe.microVibes.sarcasm && vibe.microVibes.sarcasm > 50) {
      emojis.push('😏');
    }
    if (vibe.microVibes.playfulness && vibe.microVibes.playfulness > 60) {
      emojis.push('🎉');
    }
    
    return emojis.slice(0, 4); // Max 4 emojis
  }
}

// Singleton instance
let humorModuleInstance: HumorModule | null = null;

export function getHumorModule(): HumorModule {
  if (!humorModuleInstance) {
    humorModuleInstance = new HumorModule();
  }
  return humorModuleInstance;
}

