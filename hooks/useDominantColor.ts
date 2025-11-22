import { useEffect, useState } from 'react';

/**
 * Extract dominant color from an image URL
 * Uses canvas to sample pixels and calculate average RGB
 */
export function useDominantColor(imageUrl?: string | null): string | undefined {
  const [dominantColor, setDominantColor] = useState<string>();

  useEffect(() => {
    if (!imageUrl) {
      setDominantColor(undefined);
      return;
    }

    const extractColor = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        // Try without timestamp first for better CORS compatibility
        img.src = imageUrl;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = _e => {
            // Silently fail - don't log event object
            reject(new Error('Image failed to load'));
          };
        });

        // Create small canvas for sampling
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setDominantColor('rgb(96, 165, 250)'); // Fallback to electric blue
          return;
        }

        // Sample at 50x50 for performance
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;

        let r = 0,
          g = 0,
          b = 0;
        let count = 0;

        // Sample every 4th pixel for better performance
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        // Calculate average
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Boost saturation for more vibrant glows
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        if (saturation < 0.3) {
          // Boost colors if too desaturated
          const boost = 1.5;
          r = Math.min(255, Math.round(r * boost));
          g = Math.min(255, Math.round(g * boost));
          b = Math.min(255, Math.round(b * boost));
        }

        setDominantColor(`rgb(${r}, ${g}, ${b})`);
      } catch {
        // Silently fallback to electric blue on error (CORS, 404, etc.)
        // No need to log - this is expected for some images
        setDominantColor('rgb(96, 165, 250)');
      }
    };

    extractColor();
  }, [imageUrl]);

  return dominantColor;
}
