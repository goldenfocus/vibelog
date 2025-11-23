/**
 * Utility to get image dimensions from a File object
 * Used for scaling crop coordinates after compression
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Load an image file and return its natural dimensions
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Clean up blob URL to prevent memory leak
      URL.revokeObjectURL(url);

      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
