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

interface PastConversation {
  id: string;
  title: string | null;
  messageCount: number;
  updatedAt: string;
}

interface VibeBrainState {
  // UI state
  isOpen: boolean;
  isMinimized: boolean;
  showHistory: boolean;
  hasSeenNotification: boolean;

  // Chat state
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // History state
  pastConversations: PastConversation[];
  loadingHistory: boolean;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  maximize: () => void;
  toggleHistory: () => void;
  dismissNotification: () => void;

  // Chat actions
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
  setError: (error: string | null) => void;
  loadPastConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
}

export const useVibeBrainStore = create<VibeBrainState>((set, get) => ({
  // Initial state
  isOpen: false,
  isMinimized: false,
  showHistory: false,
  hasSeenNotification:
    typeof window !== 'undefined' ? localStorage.getItem('vibe-brain-seen') === 'true' : false,
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,
  pastConversations: [],
  loadingHistory: false,

  // UI actions
  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set({ isOpen: false }),
  toggle: () => {
    const { isOpen, isMinimized, hasSeenNotification } = get();
    if (isOpen && !isMinimized) {
      set({ isOpen: false });
    } else {
      set({ isOpen: true, isMinimized: false });
      // Dismiss notification on first open
      if (!hasSeenNotification) {
        get().dismissNotification();
      }
    }
  },
  minimize: () => set({ isMinimized: true }),
  maximize: () => set({ isMinimized: false }),
  toggleHistory: () => {
    const { showHistory, pastConversations } = get();
    if (!showHistory && pastConversations.length === 0) {
      // Load conversations when opening history for the first time
      get().loadPastConversations();
    }
    set({ showHistory: !showHistory });
  },
  dismissNotification: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibe-brain-seen', 'true');
    }
    set({ hasSeenNotification: true });
  },

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
      showHistory: false,
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
      showHistory: false,
    }),

  setError: error => set({ error }),

  loadPastConversations: async () => {
    set({ loadingHistory: true });
    try {
      const response = await fetch('/api/vibe-brain/conversations');
      if (response.ok) {
        const data = await response.json();
        set({ pastConversations: data.conversations || [], loadingHistory: false });
      } else {
        set({ loadingHistory: false });
      }
    } catch {
      set({ loadingHistory: false });
    }
  },

  loadConversation: async (conversationId: string) => {
    set({ isLoading: true, showHistory: false });
    try {
      const response = await fetch(
        `/api/vibe-brain/conversations?conversationId=${conversationId}`
      );
      if (response.ok) {
        const data = await response.json();
        const messages: Message[] = (data.messages || []).map(
          (m: { role: string; content: string; sources?: unknown[] }, i: number) => ({
            id: `${m.role}-${i}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            sources: m.sources,
            timestamp: new Date(),
          })
        );
        set({ conversationId, messages, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
