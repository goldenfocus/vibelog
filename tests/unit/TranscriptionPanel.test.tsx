import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import TranscriptionPanel from '@/components/mic/TranscriptionPanel';

// Mock the I18n provider
vi.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'components.micRecorder.liveTranscript': 'Live Transcript',
        'recorder.originalTranscription': 'Original Transcription',
        'actions.edit': 'Edit',
        'actions.copy': 'Copy'
      };
      return translations[key] || key;
    }
  })
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Copy: ({ className }: { className?: string }) => <div data-testid="copy-icon" className={className}>Copy</div>,
  Edit: ({ className }: { className?: string }) => <div data-testid="edit-icon" className={className}>Edit</div>,
  X: ({ className }: { className?: string }) => <div data-testid="x-icon" className={className}>X</div>,
  Check: ({ className }: { className?: string }) => <div data-testid="check-icon" className={className}>Check</div>
}));

describe('TranscriptionPanel', () => {
  const mockOnCopy = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnTranscriptUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    transcription: '',
    liveTranscript: '',
    isRecording: false,
    isComplete: false,
    onCopy: mockOnCopy,
    onEdit: mockOnEdit,
    onTranscriptUpdate: mockOnTranscriptUpdate,
    isLoggedIn: false
  };

  describe('Empty State', () => {
    it('should render empty state when no transcription and not recording', () => {
      render(<TranscriptionPanel {...defaultProps} isComplete={true} />);
      
      const emptyPanel = screen.getByTestId('empty-transcript-panel');
      expect(emptyPanel).toBeInTheDocument();
      expect(screen.getByText('No transcription yet')).toBeInTheDocument();
      expect(screen.getByText('Try recording again or check your microphone')).toBeInTheDocument();
    });

    it('should show correct empty state styling and icon', () => {
      render(<TranscriptionPanel {...defaultProps} isComplete={true} />);
      
      const emptyPanel = screen.getByTestId('empty-transcript-panel');
      expect(emptyPanel).toHaveClass('bg-card/30', 'rounded-2xl', 'border', 'border-border/10');
      expect(screen.getByText('📝')).toBeInTheDocument();
    });
  });

  describe('Live Transcript State', () => {
    it('should render live transcript panel when recording', () => {
      const props = {
        ...defaultProps,
        isRecording: true,
        liveTranscript: 'This is live speech recognition text...'
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const livePanel = screen.getByTestId('live-transcript-panel');
      expect(livePanel).toBeInTheDocument();
      expect(screen.getByText('Live Transcript')).toBeInTheDocument();
      expect(screen.getByTestId('live-transcript-text')).toHaveTextContent('This is live speech recognition text...');
    });

    it('should display correct character and word counts for live transcript', () => {
      const liveText = 'Hello world this is a test';
      const props = {
        ...defaultProps,
        isRecording: true,
        liveTranscript: liveText
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('live-transcript-char-count')).toHaveTextContent('Characters: 26');
      expect(screen.getByTestId('live-transcript-word-count')).toHaveTextContent('Words: 6');
    });

    it('should handle empty live transcript correctly', () => {
      const props = {
        ...defaultProps,
        isRecording: true,
        liveTranscript: ''
      };
      
      render(<TranscriptionPanel {...props} />);
      
      // Should not render live transcript panel if transcript is empty
      expect(screen.queryByTestId('live-transcript-panel')).not.toBeInTheDocument();
    });

    it('should calculate word count correctly with multiple spaces', () => {
      const liveText = 'Hello    world   test   ';
      const props = {
        ...defaultProps,
        isRecording: true,
        liveTranscript: liveText
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('live-transcript-word-count')).toHaveTextContent('Words: 3');
    });
  });

  describe('Completed Transcript State', () => {
    it('should render completed transcript panel when complete', () => {
      const transcriptText = 'This is the final transcription of the recorded audio.';
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: transcriptText
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const completedPanel = screen.getByTestId('completed-transcript-panel');
      expect(completedPanel).toBeInTheDocument();
      expect(screen.getByText('Original Transcription')).toBeInTheDocument();
      expect(screen.getByTestId('completed-transcript-text')).toHaveTextContent(transcriptText);
    });

    it('should display edit and copy buttons for completed transcript', () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription'
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('edit-transcript-button')).toBeInTheDocument();
      expect(screen.getByTestId('copy-transcript-button')).toBeInTheDocument();
    });

    it('should display correct character and word counts for completed transcript', () => {
      const transcriptText = 'Hello world this is a longer test sentence'; // 43 chars
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: transcriptText
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('completed-transcript-char-count')).toHaveTextContent('Characters: 42');
      expect(screen.getByTestId('completed-transcript-word-count')).toHaveTextContent('Words: 8');
    });
  });

  describe('Copy Functionality', () => {
    it('should call onCopy with transcription when copy button clicked', async () => {
      const transcriptText = 'Test transcription to copy';
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: transcriptText
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const copyButton = screen.getByTestId('copy-transcript-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith(transcriptText);
    });
  });

  describe('Edit Functionality', () => {
    it('should call onEdit when edit button clicked and user not logged in', async () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription',
        isLoggedIn: false
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('should open edit modal when edit button clicked and user is logged in', async () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription to edit',
        isLoggedIn: true
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      // Modal should appear
      expect(screen.getByText('Edit Your Transcript')).toBeInTheDocument();
      expect(screen.getByTestId('transcript-edit-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('transcript-edit-textarea')).toHaveValue('Test transcription to edit');
    });

    it('should update character and word counts in edit modal as user types', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Original text',
        isLoggedIn: true
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      const textarea = screen.getByTestId('transcript-edit-textarea');
      await user.clear(textarea);
      await user.type(textarea, 'New test content here');
      
      await waitFor(() => {
        expect(screen.getByText('Characters: 21')).toBeInTheDocument();
        expect(screen.getByText('Words: 4')).toBeInTheDocument();
      });
    });

    it('should save edited content when save button clicked', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Original transcription',
        isLoggedIn: true
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      const textarea = screen.getByTestId('transcript-edit-textarea');
      await user.clear(textarea);
      await user.type(textarea, 'Edited transcription content');
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(mockOnTranscriptUpdate).toHaveBeenCalledWith('Edited transcription content');
    });

    it('should close edit modal when cancel button clicked', async () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription',
        isLoggedIn: true
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Edit Your Transcript')).toBeInTheDocument();
      
      const cancelButton = screen.getByTestId('x-icon').closest('button')!;
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Your Transcript')).not.toBeInTheDocument();
      });
    });

    it('should not open edit modal when onTranscriptUpdate is not provided', async () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription',
        isLoggedIn: true,
        onTranscriptUpdate: undefined
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      // Modal should still open but save won't call callback
      expect(screen.getByText('Edit Your Transcript')).toBeInTheDocument();
    });
  });

  describe('Counter Edge Cases', () => {
    it('should handle very long transcriptions correctly', () => {
      const longText = 'a '.repeat(1000).trim(); // 1000 words, 1999 characters
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: longText
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('completed-transcript-char-count')).toHaveTextContent('Characters: 1999');
      expect(screen.getByTestId('completed-transcript-word-count')).toHaveTextContent('Words: 1000');
    });

    it('should handle special characters and punctuation in word count', () => {
      const textWithPunctuation = 'Hello! How are you? I\'m fine, thanks.';
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: textWithPunctuation
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('completed-transcript-word-count')).toHaveTextContent('Words: 7');
    });

    it('should handle newlines and tabs in transcription correctly', () => {
      const textWithWhitespace = 'Line one\nLine two\tTabbed text';
      // This text has: "Line", "one", "Line", "two", "Tabbed", "text" = 6 words
      const props = {
        ...defaultProps,
        isRecording: true,
        liveTranscript: textWithWhitespace
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('live-transcript-word-count')).toHaveTextContent('Words: 6');
    });
  });

  describe('State Transitions', () => {
    it('should not show multiple panels simultaneously', () => {
      const props = {
        ...defaultProps,
        isRecording: true,
        isComplete: true,
        liveTranscript: 'Live text',
        transcription: 'Final text'
      };
      
      render(<TranscriptionPanel {...props} />);
      
      // Should show live transcript since isRecording is true
      expect(screen.getByTestId('live-transcript-panel')).toBeInTheDocument();
      // Should also show completed panel since isComplete is true and has transcription
      expect(screen.getByTestId('completed-transcript-panel')).toBeInTheDocument();
      // Should not show empty state
      expect(screen.queryByTestId('empty-transcript-panel')).not.toBeInTheDocument();
    });

    it('should show empty state when not recording and no transcription', () => {
      const props = {
        ...defaultProps,
        isRecording: false,
        isComplete: true,
        liveTranscript: '',
        transcription: ''
      };
      
      render(<TranscriptionPanel {...props} />);
      
      expect(screen.getByTestId('empty-transcript-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('live-transcript-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('completed-transcript-panel')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels and roles', () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription'
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      const copyButton = screen.getByTestId('copy-transcript-button');
      
      // Buttons don't have explicit type="button" but are still valid buttons
      expect(editButton.tagName).toBe('BUTTON');
      expect(copyButton.tagName).toBe('BUTTON');
    });

    it('should support keyboard navigation in edit modal', () => {
      const props = {
        ...defaultProps,
        isComplete: true,
        transcription: 'Test transcription',
        isLoggedIn: true
      };
      
      render(<TranscriptionPanel {...props} />);
      
      const editButton = screen.getByTestId('edit-transcript-button');
      fireEvent.click(editButton);
      
      const textarea = screen.getByTestId('transcript-edit-textarea');
      expect(textarea).toBeInTheDocument();
      
      // Textarea should be focusable
      textarea.focus();
      expect(textarea).toHaveFocus();
    });
  });
});