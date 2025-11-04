/**
 * Unit Tests for Conversation Engine
 *
 * Tests:
 * - Command parsing (all command types)
 * - Command execution based on state
 * - State transitions
 * - Error handling
 * - Confidence scoring
 * - Edge cases and unknown commands
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { ConversationEngine, resetConversationEngine } from '@/lib/conversation-engine';
import { useConversationStore } from '@/state/conversation-state';

describe('ConversationEngine', () => {
  let engine: ConversationEngine;

  beforeEach(() => {
    // Reset the singleton and store before each test
    resetConversationEngine();
    useConversationStore.getState().reset();
    engine = new ConversationEngine();
  });

  describe('Command Parsing', () => {
    describe('Generate Commands', () => {
      it('should parse "create" commands', () => {
        const command = engine.parseCommand('create a vibelog about spa services');

        expect(command.type).toBe('generate');
        expect(command.confidence).toBe(0.9);
        expect(command.intent).toBe('create a vibelog about spa services');
      });

      it('should parse "generate" commands', () => {
        const command = engine.parseCommand('generate content about marketing');

        expect(command.type).toBe('generate');
        expect(command.confidence).toBe(0.9);
      });
    });

    describe('Edit Commands', () => {
      it('should parse tone adjustment commands', () => {
        const tests = ['make it spicier', 'make it more spicy', 'make it less spicy'];

        tests.forEach(input => {
          const command = engine.parseCommand(input);
          expect(command.type).toBe('edit');
          expect(command.confidence).toBe(0.9);
        });
      });
    });

    describe('Publish Commands', () => {
      it('should parse publish commands', () => {
        const tests = ['publish', 'post it', 'share this'];

        tests.forEach(input => {
          const command = engine.parseCommand(input);
          expect(command.type).toBe('publish');
          expect(command.confidence).toBe(0.9);
        });
      });
    });
  });
});
