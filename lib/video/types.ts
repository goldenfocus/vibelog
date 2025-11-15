/**
 * Video Generation Types
 * Types for fal.ai video generation
 */

export interface VideoGenerationRequest {
  prompt: string;
  imageUrl?: string; // Optional cover image for image-to-video
  duration?: 4 | 6 | 8; // Video duration in seconds
  aspectRatio?: '16:9' | '9:16'; // Landscape or portrait
}

export interface VideoGenerationResponse {
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
}

export interface VideoGenerationStatus {
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number; // 0-100
}
