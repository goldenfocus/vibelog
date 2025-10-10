/**
 * AI Processing Optimization for VibeLog
 * Implements caching, batching, and performance optimizations
 */

import { z } from 'zod';

// AI Processing schemas
const _TranscriptionRequestSchema = z.object({
  audioBlob: z.instanceof(Blob),
  language: z.string().optional(),
  model: z.string().optional(),
  timestamp: z.number(),
});

const _BlogGenerationRequestSchema = z.object({
  transcription: z.string(),
  style: z.enum(['casual', 'professional', 'creative', 'technical']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  includeImage: z.boolean().optional(),
  timestamp: z.number(),
});

const _ImageGenerationRequestSchema = z.object({
  content: z.string(),
  style: z.enum(['minimal', 'modern', 'vintage', 'abstract']).optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  timestamp: z.number(),
});

// Cache interfaces
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ProcessingQueue<T> {
  id: string;
  request: T;
  priority: number;
  retries: number;
  createdAt: number;
}

class AIOptimizationManager {
  private transcriptionCache = new Map<string, CacheEntry<string>>();
  private blogCache = new Map<string, CacheEntry<string>>();
  private imageCache = new Map<string, CacheEntry<string>>();
  private processingQueue: ProcessingQueue<unknown>[] = [];
  private isProcessing = false;
  private maxConcurrentRequests = 3;
  private activeRequests = 0;

  // Cache TTL (Time To Live) in milliseconds
  private readonly CACHE_TTL = {
    transcription: 24 * 60 * 60 * 1000, // 24 hours
    blog: 12 * 60 * 60 * 1000, // 12 hours
    image: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  /**
   * Generate cache key for transcription
   */
  private generateTranscriptionKey(audioBlob: Blob, language?: string): string {
    const hash = this.hashBlob(audioBlob);
    return `transcription_${hash}_${language || 'auto'}`;
  }

  /**
   * Generate cache key for blog generation
   */
  private generateBlogKey(transcription: string, style?: string, length?: string): string {
    const hash = this.hashString(transcription);
    return `blog_${hash}_${style || 'default'}_${length || 'medium'}`;
  }

  /**
   * Generate cache key for image generation
   */
  private generateImageKey(content: string, style?: string): string {
    const hash = this.hashString(content);
    return `image_${hash}_${style || 'default'}`;
  }

  /**
   * Hash blob for cache key
   */
  private async hashBlob(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash string for cache key
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry || !this.isCacheValid(entry)) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Optimized transcription with caching
   */
  async processTranscription(audioBlob: Blob, language?: string, model?: string): Promise<string> {
    const key = await this.generateTranscriptionKey(audioBlob, language);

    // Check cache first
    const cached = this.getFromCache(this.transcriptionCache, key);
    if (cached) {
      console.log('Transcription cache hit');
      return cached;
    }

    // Process with optimization
    const result = await this.processWithRetry(
      () => this.callTranscriptionAPI(audioBlob, language, model),
      'transcription'
    );

    // Cache the result
    this.setCache(this.transcriptionCache, key, result, this.CACHE_TTL.transcription);

    return result;
  }

  /**
   * Optimized blog generation with caching
   */
  async processBlogGeneration(
    transcription: string,
    style?: string,
    length?: string,
    includeImage?: boolean
  ): Promise<{ content: string; fullContent?: string; isTeaser: boolean }> {
    const key = this.generateBlogKey(transcription, style, length);

    // Check cache first
    const cached = this.getFromCache(this.blogCache, key);
    if (cached) {
      console.log('Blog generation cache hit');
      return { content: cached, isTeaser: false };
    }

    // Process with optimization
    const result = await this.processWithRetry(
      () => this.callBlogGenerationAPI(transcription, style, length, includeImage),
      'blog_generation'
    );

    // Cache the result
    this.setCache(this.blogCache, key, result.content, this.CACHE_TTL.blog);

    return result;
  }

  /**
   * Optimized image generation with caching
   */
  async processImageGeneration(
    content: string,
    style?: string,
    dimensions?: { width: number; height: number }
  ): Promise<{ url: string; alt: string; width: number; height: number }> {
    const key = this.generateImageKey(content, style);

    // Check cache first
    const cached = this.getFromCache(this.imageCache, key);
    if (cached) {
      console.log('Image generation cache hit');
      return JSON.parse(cached);
    }

    // Process with optimization
    const result = await this.processWithRetry(
      () => this.callImageGenerationAPI(content, style, dimensions),
      'image_generation'
    );

    // Cache the result
    this.setCache(this.imageCache, key, JSON.stringify(result), this.CACHE_TTL.image);

    return result;
  }

  /**
   * Process with retry logic and rate limiting
   */
  private async processWithRetry<T>(
    processor: () => Promise<T>,
    type: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait if we're at max concurrent requests
        while (this.activeRequests >= this.maxConcurrentRequests) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.activeRequests++;

        try {
          const result = await processor();
          return result;
        } finally {
          this.activeRequests--;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`${type} attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`${type} failed after ${maxRetries} attempts`);
  }

  /**
   * Call transcription API
   */
  private async callTranscriptionAPI(
    audioBlob: Blob,
    language?: string,
    model?: string
  ): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    if (language) {
      formData.append('language', language);
    }
    if (model) {
      formData.append('model', model);
    }

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.transcription;
  }

  /**
   * Call blog generation API
   */
  private async callBlogGenerationAPI(
    transcription: string,
    style?: string,
    length?: string,
    includeImage?: boolean
  ): Promise<{ content: string; fullContent?: string; isTeaser: boolean }> {
    const response = await fetch('/api/generate-blog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription,
        style,
        length,
        includeImage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Blog generation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Call image generation API
   */
  private async callImageGenerationAPI(
    content: string,
    style?: string,
    dimensions?: { width: number; height: number }
  ): Promise<{ url: string; alt: string; width: number; height: number }> {
    const response = await fetch('/api/generate-cover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        style,
        dimensions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess<T>(
    requests: T[],
    processor: (request: T) => Promise<unknown>,
    batchSize: number = 3
  ): Promise<unknown[]> {
    const results: unknown[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(request => processor(request)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(type?: 'transcription' | 'blog' | 'image'): void {
    if (!type) {
      this.transcriptionCache.clear();
      this.blogCache.clear();
      this.imageCache.clear();
    } else {
      switch (type) {
        case 'transcription':
          this.transcriptionCache.clear();
          break;
        case 'blog':
          this.blogCache.clear();
          break;
        case 'image':
          this.imageCache.clear();
          break;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    transcription: { size: number; hitRate: number };
    blog: { size: number; hitRate: number };
    image: { size: number; hitRate: number };
  } {
    return {
      transcription: {
        size: this.transcriptionCache.size,
        hitRate: 0, // Would need to track hits/misses
      },
      blog: {
        size: this.blogCache.size,
        hitRate: 0,
      },
      image: {
        size: this.imageCache.size,
        hitRate: 0,
      },
    };
  }
}

// Create singleton instance
export const aiOptimization = new AIOptimizationManager();

// Export types
export type {
  TranscriptionRequestSchema,
  BlogGenerationRequestSchema,
  ImageGenerationRequestSchema,
};
