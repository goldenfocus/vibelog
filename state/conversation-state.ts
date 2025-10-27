import { create } from 'zustand';

/**
 * Conversation state machine states
 *
 * Flow: generating → editing → publishing
 */
export type ConversationState = 'generating' | 'editing' | 'publishing';

/**
 * Message in the conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Vibelog content being worked on
 */
export interface VibelogContent {
  title?: string;
  content?: string;
  teaser?: string;
  coverImageUrl?: string;
  audioUrl?: string;
}

/**
 * Conversation store state
 */
interface ConversationStore {
  // Current state
  state: ConversationState;

  // Conversation history
  messages: ConversationMessage[];

  // Current vibelog being edited
  vibelogContent: VibelogContent;

  // Error state
  error: string | null;

  // State transition functions
  startGenerating: () => void;
  startEditing: () => void;
  startPublishing: () => void;

  // Message management
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;

  // Content management
  updateContent: (updates: Partial<VibelogContent>) => void;
  resetContent: () => void;

  // Error handling
  setError: (error: string | null) => void;

  // Reset entire store
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  state: 'generating' as ConversationState,
  messages: [] as ConversationMessage[],
  vibelogContent: {} as VibelogContent,
  error: null,
};

/**
 * Conversation state store
 *
 * Manages the 3-state machine for conversational vibelog editing:
 * - generating: AI is creating initial content
 * - editing: User/AI are iterating on content
 * - publishing: Content is being posted to platforms
 *
 * @example
 * ```typescript
 * const { state, startGenerating, addMessage } = useConversationStore();
 *
 * // Start generating
 * startGenerating();
 * addMessage('user', 'Create a vibelog about my spa services');
 *
 * // Transition to editing
 * startEditing();
 * addMessage('assistant', 'Here's your vibelog. What would you like to change?');
 * ```
 */
export const useConversationStore = create<ConversationStore>((set, get) => ({
  ...initialState,

  /**
   * Transition to 'generating' state
   * Valid from: any state (can restart generation)
   */
  startGenerating: () => {
    set({
      state: 'generating',
      error: null,
    });
  },

  /**
   * Transition to 'editing' state
   * Valid from: generating (after content created)
   * Valid from: editing (continue editing)
   * Invalid from: publishing (must complete or cancel first)
   */
  startEditing: () => {
    const currentState = get().state;

    // Validate transition
    if (currentState === 'publishing') {
      set({
        error: 'Cannot edit while publishing. Please wait for publishing to complete.',
      });
      return;
    }

    set({
      state: 'editing',
      error: null,
    });
  },

  /**
   * Transition to 'publishing' state
   * Valid from: editing (after user approves)
   * Invalid from: generating (must review first)
   * Invalid from: publishing (already publishing)
   */
  startPublishing: () => {
    const currentState = get().state;

    // Validate transition
    if (currentState === 'generating') {
      set({
        error: 'Cannot publish while generating. Please review content first.',
      });
      return;
    }

    if (currentState === 'publishing') {
      set({
        error: 'Already publishing. Please wait.',
      });
      return;
    }

    // Check if we have content to publish
    const { vibelogContent } = get();
    if (!vibelogContent.content || !vibelogContent.title) {
      set({
        error: 'Cannot publish without content and title.',
      });
      return;
    }

    set({
      state: 'publishing',
      error: null,
    });
  },

  /**
   * Add a message to the conversation
   */
  addMessage: (role: 'user' | 'assistant', content: string) => {
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      role,
      content,
      timestamp: new Date(),
    };

    set(state => ({
      messages: [...state.messages, message],
    }));
  },

  /**
   * Clear all messages
   */
  clearMessages: () => {
    set({ messages: [] });
  },

  /**
   * Update vibelog content
   */
  updateContent: (updates: Partial<VibelogContent>) => {
    set(state => ({
      vibelogContent: {
        ...state.vibelogContent,
        ...updates,
      },
    }));
  },

  /**
   * Reset vibelog content
   */
  resetContent: () => {
    set({ vibelogContent: {} });
  },

  /**
   * Set error message
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Reset entire store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));

/**
 * Helper to check if a state transition is valid
 */
export function isValidTransition(from: ConversationState, to: ConversationState): boolean {
  const validTransitions: Record<ConversationState, ConversationState[]> = {
    generating: ['generating', 'editing'], // Can restart or move to editing
    editing: ['generating', 'editing', 'publishing'], // Can restart, continue, or publish
    publishing: ['generating', 'editing'], // After publishing, can start new or go back to edit
  };

  return validTransitions[from].includes(to);
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: ConversationState): string {
  const descriptions: Record<ConversationState, string> = {
    generating: 'Generating your vibelog...',
    editing: 'Editing your content',
    publishing: 'Publishing to platforms...',
  };

  return descriptions[state];
}
