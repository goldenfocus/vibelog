import { GoogleGenAI } from '@google/genai';
import { config } from '@/lib/config';

// Initialize the Google GenAI client
// We use a singleton pattern to reuse the client
let client: GoogleGenAI | null = null;

function getClient() {
    if (client) return client;

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
 * Generate an image using Google's Gemini/Imagen models (Nano Banana)
 */
export async function generateImage(options: GenerateImageOptions): Promise<string> {
    const { prompt, numberOfImages = 1 } = options;

    const ai = getClient();
    const model = config.ai.google.model || 'gemini-2.5-flash-image';

    try {
        console.log(`🍌 Generating image with Nano Banana (${model})...`);

        // Using the unified SDK's generateImages method
        const response = await ai.models.generateImages({
            model,
            prompt,
            config: {
                numberOfImages,
                aspectRatio: '16:9',
            }
        });

        // Check for generated images
        const image = response.generatedImages?.[0];

        if (!image) {
            throw new Error('No image generated');
        }

        if (image.image?.imageBytes) {
            // It's base64 encoded bytes
            return `data:image/png;base64,${image.image.imageBytes}`;
        }

        // Fallback for different response structures
        // @ts-ignore - handling potential API variations
        if (image.imageBytes) {
            // @ts-ignore
            return `data:image/png;base64,${image.imageBytes}`;
        }

        throw new Error('Unknown image response format');
    } catch (error) {
        console.error('❌ Nano Banana generation failed:', error);
        throw error;
    }
}
