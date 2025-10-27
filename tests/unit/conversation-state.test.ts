import { describe, it, expect, beforeEach } from 'vitest';

import {
  useConversationStore,
  isValidTransition,
  getStateDescription,
} from '@/state/conversation-state';

// Helper to get fresh state
const getState = () => useConversationStore.getState();

describe('Conversation State Store', () => {
  beforeEach(() => {
    // Reset store before each test
    getState().reset();
  });

  describe('Initial state', () => {
    it('should start in generating state', () => {
      expect(getState().state).toBe('generating');
    });

    it('should have empty messages', () => {
      expect(getState().messages).toEqual([]);
    });

    it('should have empty content', () => {
      expect(getState().vibelogContent).toEqual({});
    });

    it('should have no error', () => {
      expect(getState().error).toBeNull();
    });
  });

  describe('State transitions', () => {
    describe('startGenerating', () => {
      it('should transition to generating state', () => {
        getState().startEditing(); // First go to editing
        getState().startGenerating();

        expect(getState().state).toBe('generating');
      });

      it('should clear error when transitioning', () => {
        getState().setError('Test error');
        getState().startGenerating();

        expect(getState().error).toBeNull();
      });
    });

    describe('startEditing', () => {
      it('should transition from generating to editing', () => {
        getState().startEditing();

        expect(getState().state).toBe('editing');
      });

      it('should not transition from publishing to editing', () => {
        // Setup content first
        getState().updateContent({ title: 'Test', content: 'Test content' });
        getState().startEditing();
        getState().startPublishing();

        // Try to transition to editing
        getState().startEditing();

        // Should still be in publishing
        expect(getState().state).toBe('publishing');
        expect(getState().error).toContain('Cannot edit while publishing');
      });

      it('should allow staying in editing state', () => {
        getState().startEditing();
        getState().startEditing(); // Call again

        expect(getState().state).toBe('editing');
        expect(getState().error).toBeNull();
      });
    });

    describe('startPublishing', () => {
      it('should transition from editing to publishing with valid content', () => {
        getState().updateContent({ title: 'Test Title', content: 'Test Content' });
        getState().startEditing();
        getState().startPublishing();

        expect(getState().state).toBe('publishing');
        expect(getState().error).toBeNull();
      });

      it('should not transition from generating to publishing', () => {
        getState().updateContent({ title: 'Test', content: 'Test' });
        getState().startPublishing();

        expect(getState().state).toBe('generating');
        expect(getState().error).toContain('Cannot publish while generating');
      });

      it('should not publish without title', () => {
        getState().updateContent({ content: 'Test Content' });
        getState().startEditing();
        getState().startPublishing();

        expect(getState().state).toBe('editing');
        expect(getState().error).toContain('Cannot publish without content and title');
      });

      it('should not publish without content', () => {
        getState().updateContent({ title: 'Test Title' });
        getState().startEditing();
        getState().startPublishing();

        expect(getState().state).toBe('editing');
        expect(getState().error).toContain('Cannot publish without content and title');
      });

      it('should not allow publishing while already publishing', () => {
        getState().updateContent({ title: 'Test', content: 'Test' });
        getState().startEditing();
        getState().startPublishing();
        getState().startPublishing(); // Try again

        expect(getState().state).toBe('publishing');
        expect(getState().error).toContain('Already publishing');
      });
    });
  });

  describe('Message management', () => {
    it('should add user message', () => {
      getState().addMessage('user', 'Hello');

      const messages = getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
    });

    it('should add assistant message', () => {
      getState().addMessage('assistant', 'Hi there!');

      const messages = getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Hi there!');
    });

    it('should add multiple messages in order', () => {
      getState().addMessage('user', 'First');
      getState().addMessage('assistant', 'Second');
      getState().addMessage('user', 'Third');

      const messages = getState().messages;
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('should generate unique message IDs', () => {
      getState().addMessage('user', 'Message 1');
      getState().addMessage('user', 'Message 2');

      const messages = getState().messages;
      const ids = messages.map(m => m.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should include timestamp in messages', () => {
      const before = new Date();
      getState().addMessage('user', 'Test');
      const after = new Date();

      const message = getState().messages[0];
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should clear all messages', () => {
      getState().addMessage('user', 'Message 1');
      getState().addMessage('assistant', 'Message 2');
      getState().clearMessages();

      expect(getState().messages).toEqual([]);
    });
  });

  describe('Content management', () => {
    it('should update title', () => {
      getState().updateContent({ title: 'My Title' });

      expect(getState().vibelogContent.title).toBe('My Title');
    });

    it('should update content', () => {
      getState().updateContent({ content: 'My content' });

      expect(getState().vibelogContent.content).toBe('My content');
    });

    it('should update multiple fields', () => {
      getState().updateContent({
        title: 'Title',
        content: 'Content',
        teaser: 'Teaser',
      });

      expect(getState().vibelogContent).toEqual({
        title: 'Title',
        content: 'Content',
        teaser: 'Teaser',
      });
    });

    it('should merge updates with existing content', () => {
      getState().updateContent({ title: 'Title' });
      getState().updateContent({ content: 'Content' });

      expect(getState().vibelogContent).toEqual({
        title: 'Title',
        content: 'Content',
      });
    });

    it('should reset content', () => {
      getState().updateContent({ title: 'Title', content: 'Content' });
      getState().resetContent();

      expect(getState().vibelogContent).toEqual({});
    });
  });

  describe('Error handling', () => {
    it('should set error message', () => {
      getState().setError('Test error');

      expect(getState().error).toBe('Test error');
    });

    it('should clear error message', () => {
      getState().setError('Test error');
      getState().setError(null);

      expect(getState().error).toBeNull();
    });
  });

  describe('Reset functionality', () => {
    it('should reset all state to initial', () => {
      // Modify all state
      getState().startEditing();
      getState().addMessage('user', 'Test');
      getState().updateContent({ title: 'Test' });
      getState().setError('Test error');

      // Reset
      getState().reset();

      // Check everything is back to initial
      expect(getState().state).toBe('generating');
      expect(getState().messages).toEqual([]);
      expect(getState().vibelogContent).toEqual({});
      expect(getState().error).toBeNull();
    });
  });
});

describe('Helper functions', () => {
  describe('isValidTransition', () => {
    it('should allow generating -> generating', () => {
      expect(isValidTransition('generating', 'generating')).toBe(true);
    });

    it('should allow generating -> editing', () => {
      expect(isValidTransition('generating', 'editing')).toBe(true);
    });

    it('should not allow generating -> publishing', () => {
      expect(isValidTransition('generating', 'publishing')).toBe(false);
    });

    it('should allow editing -> generating', () => {
      expect(isValidTransition('editing', 'generating')).toBe(true);
    });

    it('should allow editing -> editing', () => {
      expect(isValidTransition('editing', 'editing')).toBe(true);
    });

    it('should allow editing -> publishing', () => {
      expect(isValidTransition('editing', 'publishing')).toBe(true);
    });

    it('should allow publishing -> generating', () => {
      expect(isValidTransition('publishing', 'generating')).toBe(true);
    });

    it('should allow publishing -> editing', () => {
      expect(isValidTransition('publishing', 'editing')).toBe(true);
    });

    it('should not allow publishing -> publishing', () => {
      expect(isValidTransition('publishing', 'publishing')).toBe(false);
    });
  });

  describe('getStateDescription', () => {
    it('should return description for generating', () => {
      expect(getStateDescription('generating')).toBe('Generating your vibelog...');
    });

    it('should return description for editing', () => {
      expect(getStateDescription('editing')).toBe('Editing your content');
    });

    it('should return description for publishing', () => {
      expect(getStateDescription('publishing')).toBe('Publishing to platforms...');
    });
  });
});
