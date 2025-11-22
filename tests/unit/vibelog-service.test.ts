import { describe, it, expect, vi } from 'vitest';

// Mock the vibe-brain module to avoid OpenAI initialization side effects
vi.mock('@/lib/vibe-brain', () => ({
  embedVibelog: vi.fn(),
}));

// Mock content-extraction to avoid side effects if any
vi.mock('@/lib/content-extraction', () => ({
  extractBasicTags: vi.fn().mockReturnValue(['tag1', 'tag2']),
  extractContentMetadata: vi.fn(),
}));

// Mock seo to avoid side effects
vi.mock('@/lib/seo', () => ({
  generatePublicSlug: vi.fn().mockReturnValue('public-slug'),
  generateUserSlug: vi.fn().mockReturnValue('user-slug'),
  generateVibelogSEO: vi.fn().mockReturnValue({ title: 'SEO Title', description: 'SEO Desc' }),
}));

import { normalizeVibelogData, extractTitleFromContent } from '@/lib/services/vibelog-service';

describe('Vibelog Service', () => {
  describe('extractTitleFromContent', () => {
    it('should extract title from markdown header', () => {
      const content = '# My Great Vibe\nThis is the content.';
      expect(extractTitleFromContent(content)).toBe('My Great Vibe');
    });

    it('should fallback to first sentence if no header', () => {
      const content = 'This is a sentence. And another one.';
      expect(extractTitleFromContent(content)).toBe('This is a sentence');
    });

    it('should generate default title if content is empty', () => {
      const title = extractTitleFromContent('');
      expect(title).toContain('Vibelog');
    });
  });

  describe('normalizeVibelogData', () => {
    it('should normalize valid request data', async () => {
      const request = {
        content: '# Test Title\nContent body here.',
        transcription: 'Audio transcription',
      };
      const userId = 'user-123';

      const { data } = await normalizeVibelogData(request, userId);

      expect(data.title).toBe('Test Title');
      expect(data.content).toBe(request.content);
      expect(data.transcription).toBe(request.transcription);
      expect(data.user_id).toBe(userId);
      expect(data.slug).toBe('user-slug');
      expect(data.public_slug).toBeNull();

      expect(data.word_count).toBeGreaterThan(0);
      expect(data.read_time).toBeGreaterThan(0);
    });

    it('should handle anonymous user', async () => {
      const request = {
        content: 'Just some content',
      };
      const userId = null;

      const { data } = await normalizeVibelogData(request, userId);

      expect(data.user_id).toBeNull();
      expect(data.slug).toBeNull();
      expect(data.public_slug).toBe('public-slug');
    });
  });
});
