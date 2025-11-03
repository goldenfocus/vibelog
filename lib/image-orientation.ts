/**
 * Client-side EXIF orientation handling
 * Ensures preview images match the server-processed result
 */

export async function getOrientedImageUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async e => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('Failed to read file'));
        return;
      }

      try {
        // Use createImageBitmap with imageOrientation: 'from-image'
        // This automatically applies EXIF orientation
        const imageBitmap = await createImageBitmap(new Blob([arrayBuffer]), {
          imageOrientation: 'from-image',
        });

        // Draw to canvas to get a properly oriented data URL
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(imageBitmap, 0, 0);

        // Convert to blob and create URL
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const url = URL.createObjectURL(blob);
          resolve(url);
        }, file.type);
      } catch {
        // Fallback for browsers that don't support createImageBitmap
        // Just use the regular FileReader result
        const url = URL.createObjectURL(file);
        resolve(url);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
