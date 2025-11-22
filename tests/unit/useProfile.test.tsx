/**
 * Unit Tests for useProfile Hook
 *
 * Tests:
 * - Fetching user profile by ID
 * - Handling null/undefined userId
 * - Error handling (no profile, RLS restrictions, other errors)
 * - Loading states
 * - Refetch functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useProfile', () => {
  const mockSupabaseClient = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabaseClient);
  });

  describe('Initial State', () => {
    it('should return null profile initially with null userId', () => {
      const { result } = renderHook(() => useProfile(null));

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return null profile initially with undefined userId', () => {
      const { result } = renderHook(() => useProfile(undefined));

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful Profile Fetch', () => {
    it('should fetch and return profile data', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        header_image: null,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('user-123'));

      // Should start loading
      expect(result.current.loading).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
    });

    it('should call Supabase with correct parameters', async () => {
      const userId = 'user-456';

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: userId },
              error: null,
            }),
          }),
        }),
      });

      renderHook(() => useProfile(userId));

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      });

      const selectChain = mockSupabaseClient.from.mock.results[0].value;
      expect(selectChain.select).toHaveBeenCalledWith(
        'id, username, display_name, avatar_url, bio, header_image, default_writing_tone, keep_filler_words, is_public, total_vibelogs, total_views, subscription_tier, is_premium, created_at, updated_at'
      );

      const eqChain = selectChain.select.mock.results[0].value;
      expect(eqChain.eq).toHaveBeenCalledWith('id', userId);
    });
  });

  describe('Error Handling', () => {
    it('should handle PGRST116 error (no profile found) gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: 'PGRST116',
                message: 'No rows returned',
              },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('new-user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull(); // Error not set for expected case
      expect(logger.info).toHaveBeenCalledWith(
        'No profile found (normal for new users)',
        expect.objectContaining({ userId: 'new-user-123', code: 'PGRST116' })
      );
    });

    it('should handle RLS restriction errors (42501, PGRST204) gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: '42501',
                message: 'Restricted by RLS',
              },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('restricted-user'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Profile restricted by RLS',
        expect.objectContaining({ userId: 'restricted-user', code: '42501' })
      );
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = {
        code: 'UNEXPECTED_ERROR',
        message: 'Something went wrong',
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: unexpectedError,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('error-user'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe('Something went wrong');
      expect(logger.error).toHaveBeenCalledWith(
        'Profile fetch error',
        expect.objectContaining({
          userId: 'error-user',
          code: 'UNEXPECTED_ERROR',
          error: unexpectedError,
        })
      );
    });

    it('should handle exceptions during fetch', async () => {
      const exception = new Error('Network error');

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(exception),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('exception-user'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe('Network error');
      expect(logger.error).toHaveBeenCalledWith(
        'Profile fetch exception',
        expect.objectContaining({ userId: 'exception-user', error: exception })
      );
    });
  });

  describe('Refetch Functionality', () => {
    it('should provide a refetch function', () => {
      const { result } = renderHook(() => useProfile(null));

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch profile data when refetch is called', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
      };

      const singleMock = vi
        .fn()
        .mockResolvedValueOnce({
          data: mockProfile,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockProfile, display_name: 'Updated User' },
          error: null,
        });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('user-123'));

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile?.display_name).toBe('Test User');

      // Trigger refetch
      result.current.refetch();

      // Wait for refetch to complete
      await waitFor(() => {
        expect(result.current.profile?.display_name).toBe('Updated User');
      });

      expect(singleMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('React Hook Rules', () => {
    it('should update when userId changes', async () => {
      const mockProfile1 = { id: 'user-1', username: 'user1' };
      const mockProfile2 = { id: 'user-2', username: 'user2' };

      const singleMock = vi
        .fn()
        .mockResolvedValueOnce({
          data: mockProfile1,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfile2,
          error: null,
        });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      });

      const { result, rerender } = renderHook(({ userId }) => useProfile(userId), {
        initialProps: { userId: 'user-1' },
      });

      // Wait for first profile
      await waitFor(() => {
        expect(result.current.profile?.username).toBe('user1');
      });

      // Change userId
      rerender({ userId: 'user-2' });

      // Wait for second profile
      await waitFor(() => {
        expect(result.current.profile?.username).toBe('user2');
      });

      expect(singleMock).toHaveBeenCalledTimes(2);
    });

    it('should not refetch when userId remains the same', async () => {
      const mockProfile = { id: 'user-123', username: 'testuser' };

      const singleMock = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      });

      const { rerender } = renderHook(({ userId }) => useProfile(userId), {
        initialProps: { userId: 'user-123' },
      });

      await waitFor(() => {
        expect(singleMock).toHaveBeenCalledTimes(1);
      });

      // Rerender with same userId
      rerender({ userId: 'user-123' });

      // Should not trigger another fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(singleMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string userId as invalid', () => {
      const { result } = renderHook(() => useProfile(''));

      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle profile with missing optional fields', async () => {
      const minimalProfile = {
        id: 'user-123',
        // username, display_name, etc. are undefined
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: minimalProfile,
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useProfile('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(minimalProfile);
      expect(result.current.profile?.username).toBeUndefined();
    });

    it('should handle rapid userId changes', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: 'final-user' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      });

      const { result, rerender } = renderHook(({ userId }) => useProfile(userId), {
        initialProps: { userId: 'user-1' },
      });

      // Rapidly change userId
      rerender({ userId: 'user-2' });
      rerender({ userId: 'user-3' });
      rerender({ userId: 'user-4' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have called for each unique userId
      expect(singleMock).toHaveBeenCalledTimes(4);
    });
  });
});
