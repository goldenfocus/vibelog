import { useState, useCallback } from 'react';

import { getConversationEngine } from '@/lib/conversation-engine';
import { useConversationStore } from '@/state/conversation-state';
import type { VibelogContent } from '@/state/conversation-state';

/**
 * React hook for integrating conversation engine with UI components
 *
 * This hook provides a clean interface for UI components to interact with
 * the conversation state machine and engine.
 *
 * @example
 * ```tsx
 * function ChatInterface() {
 *   const {
 *     state,
 *     messages,
 *     content,
 *     sendMessage,
 *     isProcessing,
 *     error,
 *   } = useConversation();
 *
 *   return (
 *     <div>
 *       <h2>State: {state}</h2>
 *       <MessageList messages={messages} />
 *       <input
 *         onSubmit={(text) => sendMessage(text)}
 *         disabled={isProcessing}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useConversation() {
  const engine = getConversationEngine();

  // Subscribe to store updates
  const state = useConversationStore(state => state.state);
  const messages = useConversationStore(state => state.messages);
  const vibelogContent = useConversationStore(state => state.vibelogContent);
  const error = useConversationStore(state => state.error);

  // Local processing state
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Send a message to the conversation engine
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) {
        return;
      }

      setIsProcessing(true);
      try {
        await engine.processInput(message);
      } catch (err) {
        console.error('Error processing message:', err);
        useConversationStore.getState().setError('Failed to process message. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [engine]
  );

  /**
   * Reset the conversation
   */
  const reset = useCallback(() => {
    engine.reset();
  }, [engine]);

  /**
   * Update vibelog content directly (for manual edits)
   */
  const updateContent = useCallback((updates: Partial<VibelogContent>) => {
    useConversationStore.getState().updateContent(updates);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    useConversationStore.getState().setError(null);
  }, []);

  return {
    // State
    state,
    messages,
    content: vibelogContent,
    error,
    isProcessing,

    // Actions
    sendMessage,
    reset,
    updateContent,
    clearError,

    // Computed
    canPublish: state === 'editing' && vibelogContent.title && vibelogContent.content,
    isGenerating: state === 'generating',
    isEditing: state === 'editing',
    isPublishing: state === 'publishing',
  };
}

/**
 * Hook for just the conversation state (lightweight)
 */
export function useConversationState() {
  return useConversationStore(state => ({
    state: state.state,
    error: state.error,
  }));
}

/**
 * Hook for just the messages (for chat UI)
 */
export function useConversationMessages() {
  return useConversationStore(state => state.messages);
}

/**
 * Hook for just the vibelog content (for preview)
 */
export function useVibelogContent() {
  return useConversationStore(state => state.vibelogContent);
}
