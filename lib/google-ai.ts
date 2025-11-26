import { GoogleGenAI } from '@google/genai';

import { config } from '@/lib/config';

// Initialize the Google GenAI client
// We use a singleton pattern to reuse the client
let client: GoogleGenAI | null = null;

function getClient() {
  if (client) {
    return client;
  }

  const apiKey = config.ai.google.apiKey;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

export interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  numberOfImages?: number;
  aspectRatio?: string;
}

/**
 * Generate an image using Google's Imagen 3 model
 */
export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, numberOfImages = 1, aspectRatio = '16:9' } = options;

  const ai = getClient();
  // Use Imagen 3 model - CORRECT model name is -002 (not -001!)
  const model = 'imagen-3.0-generate-002';

  try {
    console.log(`🍌 Generating image with Google Imagen 3 (${model})...`);

    // Using the unified SDK's generateImages method
    const response = await ai.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages,
        aspectRatio,
      },
    });

    // Check for generated images
    const generatedImages = response.generatedImages;

    if (!generatedImages || generatedImages.length === 0) {
      throw new Error('No image generated');
    }

    const image = generatedImages[0];

    // The image should have base64 encoded bytes
    if (image.image?.imageBytes) {
      return `data:image/png;base64,${image.image.imageBytes}`;
    }

    // Fallback for different response structures
    // @ts-expect-error - handling potential API variations
    if (image.imageBytes) {
      // @ts-expect-error - handling potential API variations
      return `data:image/png;base64,${image.imageBytes}`;
    }

    throw new Error('Unknown image response format from Imagen');
  } catch (error) {
    const err = error as Error & { response?: unknown; message?: string };
    console.error('❌ Google Imagen generation failed:', err);
    // Log more details for debugging
    if (err.message) {
      console.error('Error message:', err.message);
    }
    if (err.response) {
      console.error('Error response:', JSON.stringify(err.response, null, 2));
    }
    throw error;
  }
}
