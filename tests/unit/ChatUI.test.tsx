import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach, beforeAll } from 'vitest';

import ChatInterface from '@/components/conversation/ChatInterface';
import MessageList from '@/components/conversation/MessageList';
import VoiceInput from '@/components/conversation/VoiceInput';

import type { ConversationMessage } from '@/state/conversation-state';

const mocks = vi.hoisted(() => ({
  useConversation: vi.fn(),
  useSpeechRecognition: vi.fn(),
}));

vi.mock('@/hooks/useConversation', () => ({
  useConversation: mocks.useConversation,
}));

vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: mocks.useSpeechRecognition,
}));

describe('Conversation UI Components', () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useConversation
    mocks.useConversation.mockReturnValue({
      state: 'generating',
      messages: [],
      sendMessage: vi.fn().mockResolvedValue(undefined),
      isProcessing: false,
      error: null,
      clearError: vi.fn(),
      canPublish: false,
      isGenerating: true,
      isEditing: false,
      isPublishing: false,
    });

    // Default mock for useSpeechRecognition
    mocks.useSpeechRecognition.mockImplementation(() => ({
      liveTranscript: '',
      isSupported: true,
      resetTranscript: vi.fn(),
    }));

    // Provide a mock for navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    mocks.useConversation.mockReset();
    mocks.useSpeechRecognition.mockReset();
  });

  describe('MessageList', () => {
    it('shows empty state when there are no messages', () => {
      render(<MessageList messages={[]} />);

      expect(screen.getByTestId('message-list-empty')).toBeInTheDocument();
      expect(screen.getByText('Start the conversation')).toBeInTheDocument();
    });

    it('renders user and assistant messages with correct styling', () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! How can I help?',
          timestamp: new Date('2025-10-27T04:55:00Z'),
        },
        {
          id: '2',
          role: 'user',
          content: 'Make it punchier.',
          timestamp: new Date('2025-10-27T04:56:00Z'),
        },
      ];

      render(<MessageList messages={messages} />);

      expect(screen.getAllByTestId('message-bubble-assistant')).toHaveLength(1);
      expect(screen.getAllByTestId('message-bubble-user')).toHaveLength(1);
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
      expect(screen.getByText('Make it punchier.')).toBeInTheDocument();
    });

    it('shows loading indicator when assistant is processing', () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Generate a vibe for spa services.',
          timestamp: new Date(),
        },
      ];

      render(<MessageList messages={messages} isLoading />);

      expect(screen.getByTestId('message-list-loading')).toBeInTheDocument();
    });
  });

  describe('VoiceInput', () => {
    it('toggles recording state and emits transcript when stopped', async () => {
      const user = userEvent.setup();
      const transcriptRef = { value: 'Make the intro more playful' };
      const onTranscript = vi.fn();
      const onStateChange = vi.fn();
      const resetTranscript = vi.fn();

      mocks.useSpeechRecognition.mockImplementation(() => ({
        liveTranscript: transcriptRef.value,
        isSupported: true,
        resetTranscript,
      }));

      const { rerender } = render(
        <VoiceInput onTranscript={onTranscript} onRecordingStateChange={onStateChange} />
      );

      const toggle = screen.getByTestId('voice-toggle');
      await user.click(toggle);

      expect(onStateChange).toHaveBeenLastCalledWith('recording');
      expect(screen.getByTestId('voice-status')).toHaveTextContent('Listening…');

      // update transcript and re-render to mimic streaming text
      transcriptRef.value = 'Make the intro more playful';
      rerender(<VoiceInput onTranscript={onTranscript} onRecordingStateChange={onStateChange} />);

      await user.click(toggle);

      await waitFor(() => {
        expect(onTranscript).toHaveBeenCalledWith('Make the intro more playful');
      });
      expect(resetTranscript).toHaveBeenCalled();
    });

    it('shows permission error when microphone access is denied', async () => {
      const user = userEvent.setup();
      const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));

      Object.defineProperty(global.navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia,
        },
      });

      render(<VoiceInput />);

      await user.click(screen.getByTestId('voice-toggle'));

      expect(getUserMedia).toHaveBeenCalled();
      expect(
        screen.getByText('Microphone access denied. Check your browser permissions.')
      ).toBeInTheDocument();
    });
  });

  describe('ChatInterface', () => {
    it('renders current state and empty message list', () => {
      render(<ChatInterface />);

      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByText('Conversation State')).toBeInTheDocument();
      expect(screen.getByText('Generating')).toBeInTheDocument();
      expect(screen.getByTestId('message-list-empty')).toBeInTheDocument();
    });

    it('sends text input through the conversation hook', async () => {
      const user = userEvent.setup();
      const sendMessage = vi.fn().mockResolvedValue(undefined);
      mocks.useConversation.mockReturnValue({
        state: 'editing',
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'Here is your draft.',
            timestamp: new Date(),
          },
        ],
        sendMessage,
        isProcessing: false,
        error: null,
        clearError: vi.fn(),
        canPublish: true,
        isGenerating: false,
        isEditing: true,
        isPublishing: false,
      });

      render(<ChatInterface />);

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Make it shorter');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('Make it shorter'));
      expect((input as HTMLTextAreaElement).value).toBe('');
    });

    it('displays and clears error message', async () => {
      const user = userEvent.setup();
      const clearError = vi.fn();
      mocks.useConversation.mockReturnValue({
        state: 'editing',
        messages: [],
        sendMessage: vi.fn(),
        isProcessing: false,
        error: 'Cannot publish while generating.',
        clearError,
        canPublish: false,
        isGenerating: false,
        isEditing: true,
        isPublishing: false,
      });

      render(<ChatInterface />);

      expect(screen.getByText('Cannot publish while generating.')).toBeInTheDocument();

      await user.click(screen.getByText(/dismiss/i));
      expect(clearError).toHaveBeenCalled();
    });
  });
});
