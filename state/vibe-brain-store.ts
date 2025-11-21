import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    type: 'vibelog' | 'comment' | 'profile';
    id: string;
    title?: string;
    username?: string;
    snippet: string;
  }>;
  timestamp: Date;
}

interface VibeBrainState {
  // UI state
  isOpen: boolean;
  isMinimized: boolean;

  // Chat state
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  maximize: () => void;

  // Chat actions
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
  setError: (error: string | null) => void;
}

export const useVibeBrainStore = create<VibeBrainState>((set, get) => ({
  // Initial state
  isOpen: false,
  isMinimized: false,
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  // UI actions
  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set({ isOpen: false }),
  toggle: () => {
    const { isOpen, isMinimized } = get();
    if (isOpen && !isMinimized) {
      set({ isOpen: false });
    } else {
      set({ isOpen: true, isMinimized: false });
    }
  },
  minimize: () => set({ isMinimized: true }),
  maximize: () => set({ isMinimized: false }),

  // Chat actions
  sendMessage: async (content: string) => {
    const { conversationId, messages } = get();

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      error: null,
    });

    try {
      const response = await fetch('/api/vibe-brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          ...(conversationId && { conversationId }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        sources: data.sources,
        timestamp: new Date(),
      };

      set(state => ({
        messages: [...state.messages, assistantMessage],
        conversationId: data.conversationId,
        isLoading: false,
      }));
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  },

  clearConversation: () =>
    set({
      conversationId: null,
      messages: [],
      error: null,
    }),

  setError: error => set({ error }),
}));
