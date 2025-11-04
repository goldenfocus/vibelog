/**
 * Unit Tests for Conversation State Store
 *
 * Tests:
 * - Initial state
 * - State transitions
 * - Message management
 * - Content management
 * - Error handling
 * - State validation
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  useConversationStore,
  isValidTransition,
  getStateDescription,
} from '@/state/conversation-state';

describe('ConversationState Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useConversationStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useConversationStore.getState();

      expect(state.state).toBe('generating');
      expect(state.messages).toEqual([]);
      expect(state.vibelogContent).toEqual({});
      expect(state.error).toBeNull();
    });
  });

  describe('State Transitions', () => {
    describe('startGenerating', () => {
      it('should transition to generating state', () => {
        const { startGenerating } = useConversationStore.getState();

        startGenerating();

        const state = useConversationStore.getState();
        expect(state.state).toBe('generating');
        expect(state.error).toBeNull();
      });

      it('should be valid from any state', () => {
        const { startEditing, startGenerating } = useConversationStore.getState();

        startEditing();
        startGenerating();

        expect(useConversationStore.getState().state).toBe('generating');
      });
    });

    describe('startEditing', () => {
      it('should transition to editing state', () => {
        const { startEditing } = useConversationStore.getState();

        startEditing();

        expect(useConversationStore.getState().state).toBe('editing');
        expect(useConversationStore.getState().error).toBeNull();
      });

      it('should not allow transition from publishing', () => {
        const { startEditing, startPublishing } = useConversationStore.getState();

        // First go to editing to set up content
        startEditing();
        useConversationStore.getState().updateContent({ title: 'Test', content: 'Test content' });

        // Then try to publish and edit
        startPublishing();
        startEditing();

        const state = useConversationStore.getState();
        expect(state.state).toBe('publishing');
        expect(state.error).toContain('Cannot edit while publishing');
      });
    });

    describe('startPublishing', () => {
      beforeEach(() => {
        // Set up valid content
        const { startEditing, updateContent } = useConversationStore.getState();
        startEditing();
        updateContent({ title: 'Test Title', content: 'Test content' });
      });

      it('should transition to publishing state', () => {
        const { startPublishing } = useConversationStore.getState();

        startPublishing();

        expect(useConversationStore.getState().state).toBe('publishing');
        expect(useConversationStore.getState().error).toBeNull();
      });

      it('should not allow transition from generating', () => {
        const { startGenerating, startPublishing } = useConversationStore.getState();

        startGenerating();
        startPublishing();

        const state = useConversationStore.getState();
        expect(state.state).toBe('generating');
        expect(state.error).toContain('Cannot publish while generating');
      });

      it('should not allow publishing without content', () => {
        const { resetContent, startPublishing } = useConversationStore.getState();

        resetContent();
        startPublishing();

        const state = useConversationStore.getState();
        expect(state.state).toBe('editing');
        expect(state.error).toContain('Cannot publish without content and title');
      });

      it('should not allow publishing without title', () => {
        const { updateContent, startPublishing } = useConversationStore.getState();

        updateContent({ title: '', content: 'Some content' });
        startPublishing();

        expect(useConversationStore.getState().error).toBeTruthy();
      });
    });
  });

  describe('Message Management', () => {
    it('should add user messages', () => {
      const { addMessage } = useConversationStore.getState();

      addMessage('user', 'Test message');

      const messages = useConversationStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Test message');
      expect(messages[0].id).toBeDefined();
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add assistant messages', () => {
      const { addMessage } = useConversationStore.getState();

      addMessage('assistant', 'Response message');

      const messages = useConversationStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Response message');
    });

    it('should preserve message order', () => {
      const { addMessage } = useConversationStore.getState();

      addMessage('user', 'First');
      addMessage('assistant', 'Second');
      addMessage('user', 'Third');

      const messages = useConversationStore.getState().messages;
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('should generate unique message IDs', () => {
      const { addMessage } = useConversationStore.getState();

      addMessage('user', 'Message 1');
      addMessage('user', 'Message 2');

      const messages = useConversationStore.getState().messages;
      expect(messages[0].id).not.toBe(messages[1].id);
    });

    it('should clear all messages', () => {
      const { addMessage, clearMessages } = useConversationStore.getState();

      addMessage('user', 'Test 1');
      addMessage('user', 'Test 2');
      expect(useConversationStore.getState().messages).toHaveLength(2);

      clearMessages();

      expect(useConversationStore.getState().messages).toHaveLength(0);
    });
  });

  describe('Content Management', () => {
    it('should update content', () => {
      const { updateContent } = useConversationStore.getState();

      updateContent({ title: 'Test Title' });

      const content = useConversationStore.getState().vibelogContent;
      expect(content.title).toBe('Test Title');
    });

    it('should merge content updates', () => {
      const { updateContent } = useConversationStore.getState();

      updateContent({ title: 'Title' });
      updateContent({ content: 'Content' });

      const vibelogContent = useConversationStore.getState().vibelogContent;
      expect(vibelogContent.title).toBe('Title');
      expect(vibelogContent.content).toBe('Content');
    });

    it('should overwrite existing fields', () => {
      const { updateContent } = useConversationStore.getState();

      updateContent({ title: 'First Title' });
      updateContent({ title: 'Second Title' });

      expect(useConversationStore.getState().vibelogContent.title).toBe('Second Title');
    });

    it('should reset content', () => {
      const { updateContent, resetContent } = useConversationStore.getState();

      updateContent({ title: 'Title', content: 'Content' });
      expect(useConversationStore.getState().vibelogContent).not.toEqual({});

      resetContent();

      expect(useConversationStore.getState().vibelogContent).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should set error', () => {
      const { setError } = useConversationStore.getState();

      setError('Test error message');

      expect(useConversationStore.getState().error).toBe('Test error message');
    });

    it('should clear error', () => {
      const { setError } = useConversationStore.getState();

      setError('Test error');
      setError(null);

      expect(useConversationStore.getState().error).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should reset entire store to initial state', () => {
      const { startEditing, addMessage, updateContent, setError, reset } =
        useConversationStore.getState();

      // Modify all state
      startEditing();
      addMessage('user', 'Test');
      updateContent({ title: 'Title' });
      setError('Error');

      // Reset
      reset();

      const state = useConversationStore.getState();
      expect(state.state).toBe('generating');
      expect(state.messages).toEqual([]);
      expect(state.vibelogContent).toEqual({});
      expect(state.error).toBeNull();
    });
  });

  describe('Helper Functions', () => {
    describe('isValidTransition', () => {
      it('should validate transitions from generating', () => {
        expect(isValidTransition('generating', 'generating')).toBe(true);
        expect(isValidTransition('generating', 'editing')).toBe(true);
        expect(isValidTransition('generating', 'publishing')).toBe(false);
      });

      it('should validate transitions from editing', () => {
        expect(isValidTransition('editing', 'generating')).toBe(true);
        expect(isValidTransition('editing', 'editing')).toBe(true);
        expect(isValidTransition('editing', 'publishing')).toBe(true);
      });

      it('should validate transitions from publishing', () => {
        expect(isValidTransition('publishing', 'generating')).toBe(true);
        expect(isValidTransition('publishing', 'editing')).toBe(true);
        expect(isValidTransition('publishing', 'publishing')).toBe(false);
      });
    });

    describe('getStateDescription', () => {
      it('should return description for generating', () => {
        const desc = getStateDescription('generating');
        expect(desc).toBe('Generating your vibelog...');
      });

      it('should return description for editing', () => {
        const desc = getStateDescription('editing');
        expect(desc).toBe('Editing your content');
      });

      it('should return description for publishing', () => {
        const desc = getStateDescription('publishing');
        expect(desc).toBe('Publishing to platforms...');
      });
    });
  });

  describe('Zustand Store Behavior', () => {
    it('should allow subscription to state changes', () => {
      let callCount = 0;
      const unsubscribe = useConversationStore.subscribe(() => {
        callCount++;
      });

      useConversationStore.getState().startEditing();
      useConversationStore.getState().addMessage('user', 'test');

      expect(callCount).toBeGreaterThan(0);
      unsubscribe();
    });

    it('should persist updates across reads', () => {
      useConversationStore.getState().updateContent({ title: 'Test' });

      const content1 = useConversationStore.getState().vibelogContent;
      const content2 = useConversationStore.getState().vibelogContent;

      expect(content1).toBe(content2);
      expect(content1.title).toBe('Test');
    });
  });
});
