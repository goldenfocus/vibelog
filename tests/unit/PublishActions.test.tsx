import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import PublishActions from '@/components/mic/PublishActions';

// Shared spies for the TTS hook so we can assert across tests.
const mockPlayText = vi.fn();
const mockStop = vi.fn();

vi.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'actions.edit': 'Edit',
        'actions.copy': 'Copy',
        'actions.share': 'Share',
        'components.micRecorder.loginRequired': 'Login Required',
        'components.micRecorder.loginEditMessage': 'Please sign in to edit your content',
        'components.micRecorder.loginSaveMessage': 'Please sign in to save your content',
        'components.micRecorder.signInToEdit': 'Sign In to Edit',
        'components.micRecorder.maybeLater': 'Maybe Later',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    playText: mockPlayText,
    preloadText: vi.fn(),
    stop: mockStop,
    isPlaying: false,
    isLoading: false,
    error: null,
    progress: 0,
    duration: 0,
  }),
  normalizeTextToSpeechInput: (text: string) => text,
  createTextToSpeechCacheKey: () => 'mock-cache-key',
}));

vi.mock('lucide-react', () => {
  const Icon = (testId: string) => {
    const MockIcon = ({ className }: { className?: string }) => (
      <div data-testid={testId} className={className}>
        {testId}
      </div>
    );
    MockIcon.displayName = testId;
    return MockIcon;
  };
  return {
    Copy: Icon('copy-icon'),
    Edit: Icon('edit-icon'),
    Share: Icon('share-icon'),
    X: Icon('x-icon'),
    LogIn: Icon('login-icon'),
    Play: Icon('play-icon'),
    Pause: Icon('pause-icon'),
    Loader2: Icon('loader-icon'),
    Mic2: Icon('mic2-icon'),
    Sparkles: Icon('sparkles-icon'),
    FileText: Icon('file-text-icon'),
    Code: Icon('code-icon'),
    FileJson: Icon('file-json-icon'),
    Download: Icon('download-icon'),
  };
});

describe('PublishActions', () => {
  const baseProps = {
    content: 'Sample vibelog content',
    isLoggedIn: false,
    onCopy: vi.fn(),
    onEdit: vi.fn(),
    onShare: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayText.mockReset();
    mockStop.mockReset();
  });

  it('renders core action buttons', () => {
    render(<PublishActions {...baseProps} />);

    expect(screen.getByTestId('edit-button')).toBeInTheDocument();
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    expect(screen.getByTestId('voice-clone-button')).toBeInTheDocument();
    expect(screen.getByTestId('play-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toBeInTheDocument();
  });

  it('calls onCopy with current content', () => {
    render(<PublishActions {...baseProps} />);
    fireEvent.click(screen.getByTestId('copy-button'));
    expect(baseProps.onCopy).toHaveBeenCalledWith('Sample vibelog content');
  });

  it('shows login modal when editing while logged out', () => {
    render(<PublishActions {...baseProps} />);
    fireEvent.click(screen.getByTestId('edit-button'));
    expect(screen.getByText('Login Required')).toBeInTheDocument();
  });

  it('invokes onEdit immediately when logged in', () => {
    const onEdit = vi.fn();
    render(<PublishActions {...baseProps} isLoggedIn onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId('edit-button'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('updates voice button label when voice clone exists', () => {
    render(<PublishActions {...baseProps} voiceCloneId="voice-123" />);
    expect(screen.getByTestId('voice-clone-button')).toHaveTextContent('Voice Ready');
  });

  it('triggers share callback', () => {
    render(<PublishActions {...baseProps} />);
    fireEvent.click(screen.getByTestId('share-button'));
    expect(baseProps.onShare).toHaveBeenCalledTimes(1);
  });

  it('calls playText when autoPlayRequest is supplied', async () => {
    render(
      <PublishActions
        {...baseProps}
        autoPlayRequest={{ id: 'auto-1', cacheKey: 'prefetched' }}
        voiceCloneId="voice-abc"
      />
    );

    await waitFor(() => {
      expect(mockPlayText).toHaveBeenCalledTimes(1);
    });
    expect(mockPlayText.mock.calls[0][0]).toMatchObject({ cacheKey: 'prefetched' });
  });
});
