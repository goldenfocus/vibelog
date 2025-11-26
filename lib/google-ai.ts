import { GoogleGenAI } from '@google/genai';

import { config } from '@/lib/config';

// Initialize the Google GenAI client
let client: GoogleGenAI | null = null;

function getClient() {
  if (client) {
    return client;
  }

  const apiKey = config.ai.google?.apiKey;
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
 * Generate an image using Gemini 2.5 Flash (Nano Banana)
 *
 * IMPORTANT: Imagen 3 (imagen-3.0-generate-002) requires Google Cloud billing.
 * The FREE tier uses Gemini 2.5 Flash with image generation capability.
 */
export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const { prompt } = options;

  const ai = getClient();

  // Use Gemini 2.5 Flash Image model (FREE tier)
  // Imagen 3/4 requires Google Cloud billing and is NOT available on free Gemini API
  const model = 'gemini-2.5-flash-image';

  try {
    console.log(`🍌 Generating image with Gemini 2.5 Flash (${model})...`);

    // Gemini image generation uses generateContent, not generateImages
    const response = await ai.models.generateContent({
      model,
      contents: `Generate a beautiful, artistic cover image for this content. Create a visually striking image that captures the mood and theme. Do NOT include any text in the image. Style: Modern, clean, professional blog cover art.\n\nContent: ${prompt}`,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    // Extract image from response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates');
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('No content parts in response');
    }

    // Find image part in response
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        console.log('✅ Image generated successfully');
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error('No image data in response');
  } catch (error) {
    const err = error as Error & { response?: unknown; message?: string };
    console.error('❌ Gemini image generation failed:', err);
    if (err.message) {
      console.error('Error message:', err.message);
    }
    if (err.response) {
      console.error('Error response:', JSON.stringify(err.response, null, 2));
    }
    throw error;
  }
}
