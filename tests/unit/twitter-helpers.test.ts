import { describe, it, expect } from 'vitest';

import { createThread } from '@/lib/publishers/twitter-automation';

describe('Twitter Helper Functions', () => {
  describe('createThread', () => {
    it('should create thread with automatic numbering', () => {
      const tweets = ['First tweet', 'Second tweet', 'Third tweet'];
      const thread = createThread(tweets, true);

      expect(thread.tweets).toHaveLength(3);
      expect(thread.tweets[0].text).toBe('1/3\n\nFirst tweet');
      expect(thread.tweets[1].text).toBe('2/3\n\nSecond tweet');
      expect(thread.tweets[2].text).toBe('3/3\n\nThird tweet');
    });

    it('should create thread without numbering', () => {
      const tweets = ['First tweet', 'Second tweet'];
      const thread = createThread(tweets, false);

      expect(thread.tweets).toHaveLength(2);
      expect(thread.tweets[0].text).toBe('First tweet');
      expect(thread.tweets[1].text).toBe('Second tweet');
      expect(thread.tweets[0].text).not.toContain('1/2');
    });

    it('should handle single tweet thread', () => {
      const tweets = ['Only one tweet'];
      const thread = createThread(tweets, true);

      expect(thread.tweets).toHaveLength(1);
      expect(thread.tweets[0].text).toBe('1/1\n\nOnly one tweet');
    });

    it('should handle empty array', () => {
      const tweets: string[] = [];
      const thread = createThread(tweets, true);

      expect(thread.tweets).toHaveLength(0);
    });

    it('should handle long tweets', () => {
      const longTweet = 'A'.repeat(250);
      const tweets = [longTweet, 'Short tweet'];
      const thread = createThread(tweets, true);

      expect(thread.tweets).toHaveLength(2);
      expect(thread.tweets[0].text).toContain(longTweet);
      expect(thread.tweets[0].text).toContain('1/2');
    });

    it('should handle 25 tweet thread', () => {
      const tweets = Array(25)
        .fill(null)
        .map((_, i) => `Tweet ${i + 1}`);
      const thread = createThread(tweets, true);

      expect(thread.tweets).toHaveLength(25);
      expect(thread.tweets[0].text).toContain('1/25');
      expect(thread.tweets[24].text).toContain('25/25');
    });

    it('should default to adding numbers if not specified', () => {
      const tweets = ['First', 'Second'];
      const thread = createThread(tweets);

      expect(thread.tweets[0].text).toContain('1/2');
      expect(thread.tweets[1].text).toContain('2/2');
    });

    it('should handle special characters in tweets', () => {
      const tweets = [
        'Tweet with emoji 😊',
        'Tweet with @ mention @user',
        'Tweet with # hashtag #test',
        'Tweet with link https://example.com',
      ];
      const thread = createThread(tweets, false);

      expect(thread.tweets).toHaveLength(4);
      expect(thread.tweets[0].text).toBe('Tweet with emoji 😊');
      expect(thread.tweets[1].text).toBe('Tweet with @ mention @user');
      expect(thread.tweets[2].text).toBe('Tweet with # hashtag #test');
      expect(thread.tweets[3].text).toBe('Tweet with link https://example.com');
    });

    it('should handle tweets with newlines', () => {
      const tweets = ['First line\nSecond line', 'Another\nMulti\nLine\nTweet'];
      const thread = createThread(tweets, false);

      expect(thread.tweets[0].text).toBe('First line\nSecond line');
      expect(thread.tweets[1].text).toBe('Another\nMulti\nLine\nTweet');
    });

    it('should preserve original tweet structure', () => {
      const tweets = ['Tweet with    multiple   spaces', 'Tweet\twith\ttabs'];
      const thread = createThread(tweets, false);

      expect(thread.tweets[0].text).toBe('Tweet with    multiple   spaces');
      expect(thread.tweets[1].text).toBe('Tweet\twith\ttabs');
    });
  });

  describe('Thread validation', () => {
    it('should create valid thread object structure', () => {
      const tweets = ['Test'];
      const thread = createThread(tweets);

      expect(thread).toHaveProperty('tweets');
      expect(Array.isArray(thread.tweets)).toBe(true);
      expect(thread.tweets[0]).toHaveProperty('text');
    });

    it('should handle undefined or null gracefully', () => {
      const tweets = ['Valid tweet', '', 'Another valid'];
      const thread = createThread(tweets, false);

      expect(thread.tweets).toHaveLength(3);
      expect(thread.tweets[1].text).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long thread (>25 tweets)', () => {
      const tweets = Array(30)
        .fill(null)
        .map((_, i) => `Tweet ${i + 1}`);
      const thread = createThread(tweets, true);

      expect(thread.tweets).toHaveLength(30);
      expect(thread.tweets[0].text).toContain('1/30');
      expect(thread.tweets[29].text).toContain('30/30');
    });

    it('should handle tweets with only whitespace', () => {
      const tweets = ['   ', '\t\t', '\n\n'];
      const thread = createThread(tweets, false);

      expect(thread.tweets).toHaveLength(3);
      expect(thread.tweets[0].text).toBe('   ');
      expect(thread.tweets[1].text).toBe('\t\t');
      expect(thread.tweets[2].text).toBe('\n\n');
    });

    it('should handle unicode characters correctly', () => {
      const tweets = ['🎉 Party time!', '中文字符', 'العربية', 'Русский'];
      const thread = createThread(tweets, false);

      expect(thread.tweets).toHaveLength(4);
      expect(thread.tweets[0].text).toBe('🎉 Party time!');
      expect(thread.tweets[1].text).toBe('中文字符');
      expect(thread.tweets[2].text).toBe('العربية');
      expect(thread.tweets[3].text).toBe('Русский');
    });
  });
});
