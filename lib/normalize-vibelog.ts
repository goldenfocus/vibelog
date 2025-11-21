/**
 * Normalizes common misspellings/variations of "VibeLog" in transcripts.
 * Whisper often mishears "vibelog" as "viblog", "vyblog", "vibe-blog", etc.
 */

// Regex pattern to catch common phonetic variations
// Case-insensitive, word-boundary aware
const VIBELOG_VARIATIONS =
  /\b(vib(?:e)?[\s-]?(?:log|blog)|vyb(?:e)?[\s-]?(?:log|blog)|vibe[\s-]?lock|viblock)\b/gi;

/**
 * Replaces common misheard variations of "vibelog" with the correct "VibeLog".
 * Preserves surrounding context and handles both singular and contextual usage.
 *
 * @param text - The transcribed text to normalize
 * @returns Text with all vibelog variations replaced with "VibeLog"
 */
export function normalizeVibeLog(text: string): string {
  if (!text) {
    return text;
  }

  return text.replace(VIBELOG_VARIATIONS, 'VibeLog');
}
