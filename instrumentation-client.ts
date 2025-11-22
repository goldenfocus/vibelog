import { initBotId } from 'botid/client/core';

// Define the paths that need bot protection.
// These are expensive AI-powered endpoints that could rack up costs if abused by bots.
initBotId({
  protect: [
    // Audio transcription (Whisper API - expensive)
    {
      path: '/api/transcribe',
      method: 'POST',
    },
    // Vibelog generation (GPT-4o - expensive)
    {
      path: '/api/generate-vibelog',
      method: 'POST',
    },
    // Vibelog saving (triggers video generation)
    {
      path: '/api/save-vibelog',
      method: 'POST',
    },
    // AI audio generation (TTS - expensive)
    {
      path: '/api/vibelog/generate-ai-audio',
      method: 'POST',
    },
    // Video generation (Google Veo 3.1 - very expensive ~$0.80/video)
    {
      path: '/api/video/generate',
      method: 'POST',
    },
    // Batch video generation
    {
      path: '/api/video/generate-batch',
      method: 'POST',
    },
    // Cover image generation (DALL-E)
    {
      path: '/api/generate-cover',
      method: 'POST',
    },
    // Vibelog regeneration
    {
      path: '/api/regenerate-vibelog',
      method: 'POST',
    },
    {
      path: '/api/regenerate-vibelog-text',
      method: 'POST',
    },
    {
      path: '/api/vibelog/regenerate',
      method: 'POST',
    },
    // Comment AI features
    {
      path: '/api/comments/regenerate',
      method: 'POST',
    },
    // Video analysis
    {
      path: '/api/video/analyze',
      method: 'POST',
    },
    // Vibe Brain chat (AI-powered chat)
    {
      path: '/api/vibe-brain/chat',
      method: 'POST',
    },
  ],
});
