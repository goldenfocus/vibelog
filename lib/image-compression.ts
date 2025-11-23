/**
 * Client-side image compression to avoid Vercel 4.5MB payload limits
 * Compresses images before uploading to API
 */

interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

/**
 * Compress an image file to fit within size constraints
 * Uses canvas-based compression with quality reduction
 */
export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<File> {
  const {
    maxWidth = 2400, // Max width for header images
    maxHeight = 2400,
    quality = 0.85, // Start at 85% quality
    maxSizeMB = 3.5, // Target 3.5MB to leave headroom under Vercel's 4.5MB limit
  } = options;

  // If file is already small enough, return as-is
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels until we hit the target size
      let currentQuality = quality;
      const tryCompress = () => {
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // If still too large and quality can be reduced, try again
            if (blob.size > maxSizeBytes && currentQuality > 0.5) {
              currentQuality -= 0.1;
              tryCompress();
              return;
            }

            // Create new File object
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Always output as JPEG for best compression
              lastModified: Date.now(),
            });

            console.log(
              `📦 Compressed image: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${Math.round(currentQuality * 100)}% quality)`
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          currentQuality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}
