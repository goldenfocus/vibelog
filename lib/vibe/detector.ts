/**
 * Vibe Detection Engine
 * 
 * AI-powered emotional intent analysis from text input.
 * Uses OpenAI GPT-4o-mini for vibe classification with structured output.
 */

import OpenAI from 'openai';

import type { 
  VibeAnalysis, 
  VibeScores, 
  PrimaryVibe, 
  MicroVibes, 
  HiddenVibes 
} from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Vibe Detection Engine
 */
export class VibeDetector {
  private modelVersion = '1.0.0';
  
  /**
   * Analyze text for vibe metadata
   */
  async analyze(text: string, context?: {
    previousMessages?: string[];
    customProfileId?: string;
  }): Promise<VibeAnalysis> {
    const startTime = Date.now();
    
    // Build context prompt
    const contextPrompt = context?.previousMessages 
      ? `Previous conversation context:\n${context.previousMessages.slice(-3).join('\n')}\n\n`
      : '';
    
    const systemPrompt = `You are an expert emotional intelligence analyzer. Analyze the emotional intent and vibe of the given text.

Return a JSON object with this exact structure:
{
  "scores": {
    "excitement": 0-100,
    "humor": 0-100,
    "flirtation": 0-100,
    "calmness": 0-100,
    "stress": 0-100,
    "authenticity": 0-100,
    "chaos": 0-100,
    "warmth": 0-100,
    "confidence": 0-100,
    "vulnerability": 0-100
  },
  "primaryVibe": "excited" | "humorous" | "flirty" | "calm" | "stressed" | "authentic" | "chaotic" | "warm" | "confident" | "vulnerable" | "neutral" | "mixed",
  "confidence": 0.0-1.0,
  "microVibes": {
    "sarcasm": 0-100 (if detected),
    "passiveAggressive": 0-100 (if detected),
    "enthusiasm": 0-100 (if detected),
    "melancholy": 0-100 (if detected),
    "playfulness": 0-100 (if detected),
    "intensity": 0-100
  },
  "hiddenVibes": {
    "maskingStress": boolean,
    "maskingSadness": boolean,
    "maskingAnger": boolean,
    "notOkayButOkay": boolean,
    "performativeHappiness": boolean
  }
}

Be playful, intuitive, and slightly unhinged in your analysis. Look for subtle emotional cues, hidden meanings, and the spaces between words.`;

    const userPrompt = `${contextPrompt}Analyze this text:\n\n"${text}"`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7, // Slightly creative for vibe detection
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(response);
      const processingTime = Date.now() - startTime;

      // Normalize and validate scores
      const scores = this.normalizeScores(parsed.scores);
      
      // Determine primary vibe if not provided
      const primaryVibe = parsed.primaryVibe || this.determinePrimaryVibe(scores);
      
      // Build complete analysis
      const analysis: VibeAnalysis = {
        scores,
        primaryVibe,
        confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.8)),
        microVibes: this.normalizeMicroVibes(parsed.microVibes || {}),
        hiddenVibes: this.normalizeHiddenVibes(parsed.hiddenVibes || {}),
        detectedAt: new Date().toISOString(),
        modelVersion: this.modelVersion,
        processingTime,
        textLength: text.length,
        language: this.detectLanguage(text),
      };

      return analysis;
    } catch (error) {
      console.error('Vibe detection error:', error);
      
      // Fallback to neutral vibe on error
      return this.getFallbackAnalysis(text);
    }
  }

  /**
   * Normalize vibe scores to 0-100 range
   */
  private normalizeScores(scores: Partial<VibeScores>): VibeScores {
    const normalize = (val: unknown): number => {
      const num = typeof val === 'number' ? val : 0;
      return Math.min(100, Math.max(0, Math.round(num)));
    };

    return {
      excitement: normalize(scores.excitement),
      humor: normalize(scores.humor),
      flirtation: normalize(scores.flirtation),
      calmness: normalize(scores.calmness),
      stress: normalize(scores.stress),
      authenticity: normalize(scores.authenticity),
      chaos: normalize(scores.chaos),
      warmth: normalize(scores.warmth),
      confidence: normalize(scores.confidence),
      vulnerability: normalize(scores.vulnerability),
    };
  }

  /**
   * Normalize micro-vibes
   */
  private normalizeMicroVibes(microVibes: Partial<MicroVibes>): MicroVibes {
    const normalized: MicroVibes = {};
    
    for (const [key, value] of Object.entries(microVibes)) {
      if (typeof value === 'number') {
        normalized[key] = Math.min(100, Math.max(0, Math.round(value)));
      }
    }
    
    return normalized;
  }

  /**
   * Normalize hidden vibes
   */
  private normalizeHiddenVibes(hiddenVibes: Partial<HiddenVibes>): HiddenVibes {
    return {
      maskingStress: Boolean(hiddenVibes.maskingStress),
      maskingSadness: Boolean(hiddenVibes.maskingSadness),
      maskingAnger: Boolean(hiddenVibes.maskingAnger),
      notOkayButOkay: Boolean(hiddenVibes.notOkayButOkay),
      performativeHappiness: Boolean(hiddenVibes.performativeHappiness),
    };
  }

  /**
   * Determine primary vibe from scores
   */
  private determinePrimaryVibe(scores: VibeScores): PrimaryVibe {
    // Find highest score
    const entries = Object.entries(scores) as [keyof VibeScores, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    
    const [topKey, topValue] = sorted[0];
    const [secondKey, secondValue] = sorted[1];
    
    // If top two are close, it's mixed
    if (topValue - secondValue < 15) {
      return 'mixed';
    }
    
    // Map score keys to primary vibes
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

  /**
   * Simple language detection (can be enhanced)
   */
  private detectLanguage(text: string): string {
    // Basic detection - can be enhanced with proper library
    if (/[\u4e00-\u9fff]/.test(text)) {return 'zh';}
    if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(text)) {return 'es';}
    if (/[àâäèéêëîïôùûüÿç]/.test(text)) {return 'fr';}
    if (/[äöüß]/.test(text)) {return 'de';}
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(text)) {return 'vi';}
    return 'en';
  }

  /**
   * Fallback analysis when AI fails
   */
  private getFallbackAnalysis(text: string): VibeAnalysis {
    return {
      scores: {
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
      confidence: 0.5,
      microVibes: {
        intensity: 50,
      },
      hiddenVibes: {},
      detectedAt: new Date().toISOString(),
      modelVersion: this.modelVersion,
      processingTime: 0,
      textLength: text.length,
      language: 'en',
    };
  }

  /**
   * Stream vibe analysis for real-time updates
   */
  async *analyzeStream(text: string): AsyncGenerator<Partial<VibeAnalysis>> {
    // For streaming, analyze chunks of text as they come in
    const words = text.split(/\s+/);
    let accumulated = '';
    
    for (const word of words) {
      accumulated += (accumulated ? ' ' : '') + word;
      
      // Analyze every 5 words or at end
      if (words.indexOf(word) % 5 === 0 || words.indexOf(word) === words.length - 1) {
        const partial = await this.analyze(accumulated);
        yield {
          scores: partial.scores,
          primaryVibe: partial.primaryVibe,
          confidence: partial.confidence * 0.7, // Lower confidence for partial
        };
      }
    }
  }
}

// Singleton instance
let detectorInstance: VibeDetector | null = null;

export function getVibeDetector(): VibeDetector {
  if (!detectorInstance) {
    detectorInstance = new VibeDetector();
  }
  return detectorInstance;
}

