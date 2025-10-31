import { createHash } from 'crypto';

import { type ClassValue } from 'clsx';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate SHA256 hash for TTS cache key
 * Hashes text + voice combination to create unique cache identifier
 *
 * @param text - The text content to hash
 * @param voice - The voice identifier (default: 'shimmer')
 * @returns SHA256 hash string
 */
export function hashTTSContent(text: string, voice: string = 'shimmer'): string {
  const content = `${text.trim()}|${voice}`;
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
