/**
 * Magic Number Detection for Media Files
 *
 * Detects file types by examining their binary signatures (magic numbers)
 * rather than relying on browser-supplied MIME types which can be spoofed
 * or incorrect.
 *
 * This provides a security layer against:
 * - Misnamed files (video.mp3 that's actually an executable)
 * - Browser MIME type detection failures
 * - Intentionally mislabeled uploads
 *
 * Reference: https://en.wikipedia.org/wiki/List_of_file_signatures
 */

// =============================================================================
// Magic Number Signatures
// =============================================================================

export interface MagicSignature {
  mimeType: string;
  signature: number[];
  offset?: number; // Default 0
  mask?: number[]; // Optional mask for partial matching
}

/**
 * Known file signatures (magic numbers)
 *
 * Order matters! More specific signatures should come before less specific ones.
 * For example, MP4/MOV detection requires checking at offset 4.
 */
export const MAGIC_SIGNATURES: MagicSignature[] = [
  // ==========================================================================
  // Audio Formats
  // ==========================================================================

  // MP3 with ID3v2 tag
  { mimeType: 'audio/mpeg', signature: [0x49, 0x44, 0x33] }, // "ID3"

  // MP3 sync word (frame header)
  { mimeType: 'audio/mpeg', signature: [0xff, 0xfb] },
  { mimeType: 'audio/mpeg', signature: [0xff, 0xfa] },
  { mimeType: 'audio/mpeg', signature: [0xff, 0xf3] },
  { mimeType: 'audio/mpeg', signature: [0xff, 0xf2] },

  // WAV (RIFF....WAVE)
  { mimeType: 'audio/wav', signature: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" - need to verify WAVE at offset 8

  // FLAC
  { mimeType: 'audio/flac', signature: [0x66, 0x4c, 0x61, 0x43] }, // "fLaC"

  // OGG (includes Vorbis and Opus)
  { mimeType: 'audio/ogg', signature: [0x4f, 0x67, 0x67, 0x53] }, // "OggS"

  // AAC (ADTS frame)
  { mimeType: 'audio/aac', signature: [0xff, 0xf1] },
  { mimeType: 'audio/aac', signature: [0xff, 0xf9] },

  // ==========================================================================
  // Video Formats
  // ==========================================================================

  // WebM/Matroska (used for both audio and video WebM)
  { mimeType: 'video/webm', signature: [0x1a, 0x45, 0xdf, 0xa3] },

  // AVI (RIFF....AVI)
  { mimeType: 'video/x-msvideo', signature: [0x52, 0x49, 0x46, 0x46] }, // Need to check for "AVI " at offset 8

  // MPEG-PS
  { mimeType: 'video/mpeg', signature: [0x00, 0x00, 0x01, 0xba] },
  { mimeType: 'video/mpeg', signature: [0x00, 0x00, 0x01, 0xb3] },

  // ==========================================================================
  // Image Formats
  // ==========================================================================

  // JPEG
  { mimeType: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },

  // PNG
  { mimeType: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },

  // GIF87a and GIF89a
  { mimeType: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // "GIF87a"
  { mimeType: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // "GIF89a"

  // WebP (RIFF....WEBP)
  { mimeType: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46] }, // Need to check for "WEBP" at offset 8

  // ==========================================================================
  // Document/Text Formats
  // ==========================================================================

  // PDF
  { mimeType: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"

  // JSON (starts with { or [)
  // Note: These are too generic, handled separately in detection logic

  // XML (<?xml)
  { mimeType: 'application/xml', signature: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] }, // "<?xml"
];

// =============================================================================
// MP4/MOV/M4A Detection (Special Case)
// =============================================================================

/**
 * ftyp box brand identifiers for MP4-family files
 * These appear at offset 4 after the box size
 */
const FTYP_BRANDS: Record<string, string> = {
  // Video
  isom: 'video/mp4',
  iso2: 'video/mp4',
  iso3: 'video/mp4',
  iso4: 'video/mp4',
  iso5: 'video/mp4',
  iso6: 'video/mp4',
  mp41: 'video/mp4',
  mp42: 'video/mp4',
  avc1: 'video/mp4',
  hvc1: 'video/mp4',
  hev1: 'video/mp4',
  av01: 'video/mp4',

  // QuickTime
  qt: 'video/quicktime',

  // M4A (Audio)
  M4A: 'audio/mp4',
  M4B: 'audio/mp4', // Audiobook
  M4P: 'audio/mp4', // Protected
  mp4a: 'audio/mp4',

  // 3GP
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',

  // Common fallback
  mmp4: 'video/mp4',
  mp71: 'video/mp4',
  MSNV: 'video/mp4',
  ndas: 'video/mp4',
  ndsc: 'video/mp4',
  ndsh: 'video/mp4',
  ndsm: 'video/mp4',
  ndsp: 'video/mp4',
  ndss: 'video/mp4',
  ndxc: 'video/mp4',
  ndxh: 'video/mp4',
  ndxm: 'video/mp4',
  ndxp: 'video/mp4',
  ndxs: 'video/mp4',
};

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Detect media type from file header bytes
 *
 * @param buffer - First 12+ bytes of the file
 * @returns Detected MIME type or null if unknown
 *
 * @example
 * const header = await file.slice(0, 12).arrayBuffer();
 * const type = detectMediaTypeFromBuffer(Buffer.from(header));
 * if (type !== file.type) {
 *   console.warn('MIME type mismatch!');
 * }
 */
export function detectMediaTypeFromBuffer(buffer: Buffer | Uint8Array): string | null {
  if (buffer.length < 4) {
    return null;
  }

  // Convert to Buffer if needed for easier comparison
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // ==========================================================================
  // Special case: MP4/MOV/M4A (ftyp box)
  // These files have variable-size box header before the 'ftyp' signature
  // ==========================================================================
  if (bytes.length >= 12) {
    // Check for 'ftyp' at offset 4
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      // Extract brand (4 chars starting at offset 8)
      const brand = bytes.slice(8, 12).toString('ascii').trim();
      const mimeType = FTYP_BRANDS[brand];

      if (mimeType) {
        return mimeType;
      }

      // Fallback for unknown brands - assume video/mp4
      return 'video/mp4';
    }
  }

  // ==========================================================================
  // Special case: RIFF-based formats (WAV, AVI, WebP)
  // ==========================================================================
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    // Check format type at offset 8
    const format = bytes.slice(8, 12).toString('ascii');

    if (format === 'WAVE') {
      return 'audio/wav';
    }
    if (format === 'AVI ') {
      return 'video/x-msvideo';
    }
    if (format === 'WEBP') {
      return 'image/webp';
    }

    // Unknown RIFF format
    return null;
  }

  // ==========================================================================
  // WebM/Matroska special handling
  // ==========================================================================
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    // This is EBML header - could be video/webm or audio/webm
    // To distinguish, we'd need to parse the DocType element, but for simplicity
    // we'll return video/webm as it's more common and both play fine
    return 'video/webm';
  }

  // ==========================================================================
  // Check against standard signatures
  // ==========================================================================
  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset || 0;

    if (bytes.length < offset + sig.signature.length) {
      continue;
    }

    let match = true;
    for (let i = 0; i < sig.signature.length; i++) {
      const byte = bytes[offset + i];
      const expected = sig.signature[i];
      const mask = sig.mask?.[i] ?? 0xff;

      if ((byte & mask) !== (expected & mask)) {
        match = false;
        break;
      }
    }

    if (match) {
      return sig.mimeType;
    }
  }

  // ==========================================================================
  // Text-based format detection (JSON, XML)
  // ==========================================================================
  if (bytes.length >= 1) {
    const firstChar = bytes[0];

    // JSON array or object
    if (firstChar === 0x5b || firstChar === 0x7b) {
      // '[' or '{'
      // Verify it's valid-ish JSON by checking for printable ASCII
      let isProbablyText = true;
      for (let i = 0; i < Math.min(bytes.length, 100); i++) {
        const b = bytes[i];
        // Allow printable ASCII, newlines, tabs
        if (b !== 0x09 && b !== 0x0a && b !== 0x0d && (b < 0x20 || b > 0x7e)) {
          isProbablyText = false;
          break;
        }
      }
      if (isProbablyText) {
        return 'application/json';
      }
    }

    // HTML
    if (bytes.length >= 5) {
      const start = bytes.slice(0, 50).toString('ascii').toLowerCase();
      if (start.includes('<!doctype html') || start.includes('<html')) {
        return 'text/html';
      }
    }
  }

  return null;
}

/**
 * Detect media type from a File or Blob
 *
 * @param file - File or Blob to analyze
 * @returns Promise resolving to detected MIME type or null
 */
export async function detectMediaType(file: File | Blob): Promise<string | null> {
  // Read first 12 bytes
  const slice = file.slice(0, 12);
  const arrayBuffer = await slice.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return detectMediaTypeFromBuffer(buffer);
}

/**
 * Verify that a file's content matches its declared type
 *
 * @param file - File or Blob to verify
 * @param declaredType - The MIME type claimed by the browser/client
 * @returns Object with verification results
 */
export async function verifyMediaType(
  file: File | Blob,
  declaredType: string
): Promise<{
  valid: boolean;
  detectedType: string | null;
  declaredType: string;
  categoryMatch: boolean;
}> {
  const detectedType = await detectMediaType(file);
  const normalizedDeclared = declaredType.split(';')[0].trim().toLowerCase();

  // Direct type match
  if (detectedType === normalizedDeclared) {
    return {
      valid: true,
      detectedType,
      declaredType: normalizedDeclared,
      categoryMatch: true,
    };
  }

  // Category match (e.g., detected audio/mp4, declared audio/m4a)
  const detectedCategory = detectedType?.split('/')[0];
  const declaredCategory = normalizedDeclared.split('/')[0];
  const categoryMatch = detectedCategory === declaredCategory;

  return {
    valid: categoryMatch, // Valid if at least category matches
    detectedType,
    declaredType: normalizedDeclared,
    categoryMatch,
  };
}

// =============================================================================
// Utility: Human-readable Format Names
// =============================================================================

const FORMAT_NAMES: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/wav': 'WAV',
  'audio/wave': 'WAV',
  'audio/flac': 'FLAC',
  'audio/ogg': 'OGG',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A',
  'audio/webm': 'WebM Audio',
  'video/mp4': 'MP4',
  'video/quicktime': 'QuickTime (MOV)',
  'video/webm': 'WebM',
  'video/x-msvideo': 'AVI',
  'video/mpeg': 'MPEG',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'application/json': 'JSON',
  'application/xml': 'XML',
  'text/html': 'HTML',
  'text/plain': 'Plain Text',
};

/**
 * Get human-readable format name from MIME type
 */
export function getFormatName(mimeType: string | null): string {
  if (!mimeType) {
    return 'Unknown';
  }
  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  return FORMAT_NAMES[normalized] || mimeType;
}
