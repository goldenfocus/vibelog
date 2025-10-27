import { describe, it, expect, beforeEach } from 'vitest';

import {
  ConversationEngine,
  getConversationEngine,
  resetConversationEngine,
} from '@/lib/conversation-engine';
import { useConversationStore } from '@/state/conversation-state';

describe('ConversationEngine', () => {
  let engine: ConversationEngine;

  beforeEach(() => {
    // Reset store and create fresh engine
    useConversationStore.getState().reset();
    resetConversationEngine();
    engine = new ConversationEngine();
  });

  describe('Command parsing', () => {
    describe('Generate commands', () => {
      it('should recognize "create" command', () => {
        const command = engine.parseCommand('create a vibelog');
        expect(command.type).toBe('generate');
        expect(command.confidence).toBeGreaterThan(0.8);
      });

      it('should recognize "generate" command', () => {
        const command = engine.parseCommand('generate content');
        expect(command.type).toBe('generate');
      });

      it('should recognize "make" command', () => {
        const command = engine.parseCommand('make a post');
        expect(command.type).toBe('generate');
      });

      it('should recognize "write" command', () => {
        const command = engine.parseCommand('write something');
        expect(command.type).toBe('generate');
      });
    });

    describe('Edit commands', () => {
      it('should recognize "make it spicier" command', () => {
        const command = engine.parseCommand('make it spicier');
        expect(command.type).toBe('edit');
      });

      it('should recognize "change the image" command', () => {
        const command = engine.parseCommand('change the image');
        expect(command.type).toBe('edit');
      });

      it('should recognize "more professional" command', () => {
        const command = engine.parseCommand('more professional');
        expect(command.type).toBe('edit');
      });

      it('should recognize "edit" command', () => {
        const command = engine.parseCommand('edit this');
        expect(command.type).toBe('edit');
      });
    });

    describe('Regenerate commands', () => {
      it('should recognize "try again" command', () => {
        const command = engine.parseCommand('try again');
        expect(command.type).toBe('regenerate');
      });

      it('should recognize "start over" command', () => {
        const command = engine.parseCommand('start over');
        expect(command.type).toBe('regenerate');
      });

      it('should recognize "redo" command', () => {
        const command = engine.parseCommand('redo');
        expect(command.type).toBe('regenerate');
      });
    });

    describe('Publish commands', () => {
      it('should recognize "publish" command', () => {
        const command = engine.parseCommand('publish it');
        expect(command.type).toBe('publish');
      });

      it('should recognize "post" command', () => {
        const command = engine.parseCommand('post to twitter');
        expect(command.type).toBe('publish');
      });

      it('should recognize "share" command', () => {
        const command = engine.parseCommand('share on social media');
        expect(command.type).toBe('publish');
      });
    });

    describe('Approve commands', () => {
      it('should recognize "perfect" command', () => {
        const command = engine.parseCommand('perfect');
        expect(command.type).toBe('approve');
      });

      it('should recognize "love it" command', () => {
        const command = engine.parseCommand('love it');
        expect(command.type).toBe('approve');
      });

      it('should recognize "yes" command', () => {
        const command = engine.parseCommand('yes');
        expect(command.type).toBe('approve');
      });

      it('should recognize "looks good" command', () => {
        const command = engine.parseCommand('looks good');
        expect(command.type).toBe('approve');
      });
    });

    describe('Cancel commands', () => {
      it('should recognize "cancel" command', () => {
        const command = engine.parseCommand('cancel');
        expect(command.type).toBe('cancel');
      });

      it('should recognize "stop" command', () => {
        const command = engine.parseCommand('stop');
        expect(command.type).toBe('cancel');
      });

      it('should recognize "never mind" command', () => {
        const command = engine.parseCommand('never mind');
        expect(command.type).toBe('cancel');
      });
    });

    describe('Unknown commands', () => {
      it('should return unknown for unrecognized input', () => {
        const command = engine.parseCommand('asdfghjkl');
        expect(command.type).toBe('unknown');
        expect(command.confidence).toBeLessThan(0.7);
      });
    });
  });

  describe('Command execution', () => {
    describe('Generate command', () => {
      it('should transition to generating state', async () => {
        await engine.processInput('create a vibelog');
        const state = engine.getCurrentState();
        expect(state).toBe('editing'); // Goes to editing after generating
      });

      it('should add user message', async () => {
        await engine.processInput('create a vibelog');
        const messages = engine.getMessages();
        expect(messages.some(m => m.role === 'user' && m.content === 'create a vibelog')).toBe(
          true
        );
      });

      it('should add assistant response', async () => {
        await engine.processInput('create a vibelog');
        const messages = engine.getMessages();
        expect(messages.some(m => m.role === 'assistant')).toBe(true);
      });

      it('should update content', async () => {
        await engine.processInput('create a vibelog');
        const content = engine.getContent();
        expect(content.title).toBeDefined();
        expect(content.content).toBeDefined();
      });
    });

    describe('Edit command', () => {
      beforeEach(async () => {
        // Setup: generate initial content
        await engine.processInput('create a vibelog');
      });

      it('should modify content in editing state', async () => {
        const contentBefore = engine.getContent().content;
        await engine.processInput('make it spicier');
        const contentAfter = engine.getContent().content;

        expect(contentAfter).not.toBe(contentBefore);
      });

      it('should not allow edit in generating state', async () => {
        engine.reset();
        const response = await engine.processInput('make it spicier');

        expect(response).toContain('wait');
      });

      it('should add user and assistant messages', async () => {
        const messageCountBefore = engine.getMessages().length;
        await engine.processInput('make it more professional');
        const messageCountAfter = engine.getMessages().length;

        expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
      });
    });

    describe('Regenerate command', () => {
      beforeEach(async () => {
        await engine.processInput('create a vibelog');
      });

      it('should reset content', async () => {
        await engine.processInput('try again');
        const state = engine.getCurrentState();
        expect(state).toBe('generating');
      });

      it('should add appropriate message', async () => {
        await engine.processInput('try again');
        const messages = engine.getMessages();
        const lastMessage = messages[messages.length - 1];

        expect(lastMessage.role).toBe('assistant');
        expect(lastMessage.content).toContain('start fresh');
      });
    });

    describe('Publish command', () => {
      beforeEach(async () => {
        await engine.processInput('create a vibelog');
      });

      it('should transition to publishing state with valid content', async () => {
        await engine.processInput('publish it');
        const state = engine.getCurrentState();
        expect(state).toBe('publishing');
      });

      it('should not allow publishing from generating state', async () => {
        engine.reset();
        const response = await engine.processInput('publish it');

        expect(response).toContain('review content first');
      });

      it('should not allow publishing without content', async () => {
        engine.reset();
        useConversationStore.getState().startEditing();

        const response = await engine.processInput('publish');

        expect(response).toContain('without content and title');
      });
    });

    describe('Approve command', () => {
      beforeEach(async () => {
        await engine.processInput('create a vibelog');
      });

      it('should trigger publishing', async () => {
        await engine.processInput('perfect');
        const state = engine.getCurrentState();
        expect(state).toBe('publishing');
      });

      it('should not work in generating state', async () => {
        engine.reset();
        const response = await engine.processInput('perfect');

        expect(response).toContain('nothing to approve');
      });
    });

    describe('Cancel command', () => {
      beforeEach(async () => {
        await engine.processInput('create a vibelog');
      });

      it('should reset the conversation', async () => {
        await engine.processInput('cancel');

        const state = engine.getCurrentState();
        const messages = engine.getMessages();
        const content = engine.getContent();

        expect(state).toBe('generating');
        expect(messages.length).toBeGreaterThan(0); // Has the cancel message
        expect(content).toEqual({});
      });
    });

    describe('Unknown command handling', () => {
      it('should provide helpful suggestions in generating state', async () => {
        const response = await engine.processInput('blahblahblah');

        expect(response).toContain('not sure');
        expect(response).toContain('Try saying');
      });

      it('should provide context-appropriate suggestions', async () => {
        await engine.processInput('create something');
        const response = await engine.processInput('something random');

        expect(response).toContain('not sure');
      });
    });
  });

  describe('State management', () => {
    it('should get current state', () => {
      const state = engine.getCurrentState();
      expect(state).toBe('generating');
    });

    it('should get messages', async () => {
      await engine.processInput('create a vibelog');
      const messages = engine.getMessages();
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should get content', async () => {
      await engine.processInput('create a vibelog');
      const content = engine.getContent();
      expect(content).toBeDefined();
    });

    it('should reset conversation', async () => {
      await engine.processInput('create a vibelog');
      engine.reset();

      expect(engine.getCurrentState()).toBe('generating');
      expect(engine.getMessages()).toEqual([]);
      expect(engine.getContent()).toEqual({});
    });

    it('should check if transition is valid', () => {
      expect(engine.canTransitionTo('editing')).toBe(true);
      expect(engine.canTransitionTo('publishing')).toBe(false);
    });
  });

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const engine1 = getConversationEngine();
      const engine2 = getConversationEngine();
      expect(engine1).toBe(engine2);
    });

    it('should reset singleton', () => {
      const engine1 = getConversationEngine();
      resetConversationEngine();
      const engine2 = getConversationEngine();
      expect(engine1).not.toBe(engine2);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete flow: generate -> edit -> publish', async () => {
      // Generate
      await engine.processInput('create a vibelog about my spa');
      expect(engine.getCurrentState()).toBe('editing');

      // Edit
      await engine.processInput('make it more professional');
      expect(engine.getCurrentState()).toBe('editing');

      // Publish
      await engine.processInput('publish it');
      expect(engine.getCurrentState()).toBe('publishing');
    });

    it('should handle regenerate flow', async () => {
      await engine.processInput('create something');
      await engine.processInput("I don't like it");
      expect(engine.getCurrentState()).toBe('generating');
    });

    it('should accumulate messages throughout conversation', async () => {
      await engine.processInput('create a vibelog');
      await engine.processInput('make it spicier');
      await engine.processInput('perfect');

      const messages = engine.getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(6); // 3 user + 3 assistant
    });

    it('should maintain content through edits', async () => {
      await engine.processInput('create a vibelog');
      const contentAfterGenerate = engine.getContent();

      await engine.processInput('make it spicier');
      const contentAfterEdit = engine.getContent();

      expect(contentAfterEdit.title).toBe(contentAfterGenerate.title);
      expect(contentAfterEdit.content).not.toBe(contentAfterGenerate.content);
    });
  });

  describe('Error handling', () => {
    it('should handle low confidence commands gracefully', async () => {
      const response = await engine.processInput('xyz123abc');
      expect(response).toContain('not sure');
    });

    it('should prevent invalid state transitions', async () => {
      const response = await engine.processInput('publish');
      expect(response).toContain('review content first');
    });

    it('should validate content before publishing', async () => {
      useConversationStore.getState().startEditing();
      const response = await engine.processInput('publish');
      expect(response).toContain('without content and title');
    });
  });
});
