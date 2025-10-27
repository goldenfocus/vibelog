import { describe, it, expect, beforeEach } from 'vitest';

import { CommandParser, parseCommand } from '@/lib/command-parser';
import { COMMAND_EXAMPLES, CommandType } from '@/lib/command-patterns';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser({ useGPT4: false }); // Use pattern matching for tests
  });

  describe('Pattern Matching', () => {
    describe('Generate commands', () => {
      it('should recognize "create" commands', async () => {
        const command = await parser.parse('create a vibelog about yoga');
        expect(command.type).toBe('generate');
        expect(command.confidence).toBeGreaterThan(0.7);
      });

      it('should recognize "generate" commands', async () => {
        const command = await parser.parse('generate content about my spa');
        expect(command.type).toBe('generate');
      });

      it('should recognize "write" commands', async () => {
        const command = await parser.parse('write something cool');
        expect(command.type).toBe('generate');
      });

      it('should recognize "make" commands', async () => {
        const command = await parser.parse('make a post');
        expect(command.type).toBe('generate');
      });
    });

    describe('Edit commands', () => {
      it('should recognize "change" commands', async () => {
        const command = await parser.parse('change the title');
        expect(command.type).toBe('edit');
      });

      it('should recognize "update" commands', async () => {
        const command = await parser.parse('update the content');
        expect(command.type).toBe('edit');
      });

      it('should recognize "modify" commands', async () => {
        const command = await parser.parse('modify this section');
        expect(command.type).toBe('edit');
      });
    });

    describe('Regenerate commands', () => {
      it('should recognize "try again" commands', async () => {
        const command = await parser.parse('try again');
        expect(command.type).toBe('regenerate');
      });

      it('should recognize "start over" commands', async () => {
        const command = await parser.parse('start over');
        expect(command.type).toBe('regenerate');
      });

      it('should recognize negative feedback', async () => {
        const command = await parser.parse("I don't like it");
        expect(command.type).toBe('regenerate');
      });
    });

    describe('Publish commands', () => {
      it('should recognize "publish" commands', async () => {
        const command = await parser.parse('publish it');
        expect(command.type).toBe('publish');
      });

      it('should recognize "post" commands', async () => {
        const command = await parser.parse('post to Twitter');
        expect(command.type).toBe('publish');
      });

      it('should recognize "share" commands', async () => {
        const command = await parser.parse('share on Instagram');
        expect(command.type).toBe('publish');
      });
    });

    describe('Approve commands', () => {
      it('should recognize "perfect" commands', async () => {
        const command = await parser.parse('perfect');
        expect(command.type).toBe('approve');
      });

      it('should recognize "love it" commands', async () => {
        const command = await parser.parse('love it');
        expect(command.type).toBe('approve');
      });

      it('should recognize "yes" commands', async () => {
        const command = await parser.parse('yes');
        expect(command.type).toBe('approve');
      });

      it('should recognize "looks good" commands', async () => {
        const command = await parser.parse('looks good');
        expect(command.type).toBe('approve');
      });
    });

    describe('Cancel commands', () => {
      it('should recognize "cancel" commands', async () => {
        const command = await parser.parse('cancel');
        expect(command.type).toBe('cancel');
      });

      it('should recognize "stop" commands', async () => {
        const command = await parser.parse('stop');
        expect(command.type).toBe('cancel');
      });

      it('should recognize "never mind" commands', async () => {
        const command = await parser.parse('never mind');
        expect(command.type).toBe('cancel');
      });
    });

    describe('Change Image commands', () => {
      it('should recognize "change image" commands', async () => {
        const command = await parser.parse('change the image');
        expect(command.type).toBe('change_image');
      });

      it('should recognize "different picture" commands', async () => {
        const command = await parser.parse('different picture please');
        expect(command.type).toBe('change_image');
      });

      it('should recognize "swap photo" commands', async () => {
        const command = await parser.parse('swap the photo');
        expect(command.type).toBe('change_image');
      });

      it('should extract image style parameters', async () => {
        const command = await parser.parse('change to a professional image');
        expect(command.type).toBe('change_image');
        expect(command.parameters?.imageStyle).toBe('professional');
      });
    });

    describe('Change Tone commands', () => {
      it('should recognize "make it spicier" commands', async () => {
        const command = await parser.parse('make it spicier');
        expect(command.type).toBe('change_tone');
        expect(command.parameters?.tone).toBe('spicy');
      });

      it('should recognize "more casual" commands', async () => {
        const command = await parser.parse('more casual please');
        expect(command.type).toBe('change_tone');
        expect(command.parameters?.tone).toBe('casual');
      });

      it('should recognize "make it professional" commands', async () => {
        const command = await parser.parse('make it more professional');
        expect(command.type).toBe('change_tone');
        expect(command.parameters?.tone).toBe('professional');
      });

      it('should recognize "less serious" commands', async () => {
        const command = await parser.parse('less serious');
        expect(command.type).toBe('change_tone');
        expect(command.parameters?.tone).toBe('serious');
        expect(command.parameters?.intensity).toBe('less');
      });

      it('should recognize "funny" tone', async () => {
        const command = await parser.parse('make it funny');
        expect(command.type).toBe('change_tone');
        expect(command.parameters?.tone).toBe('funny');
      });

      it('should recognize "friendly" tone', async () => {
        const command = await parser.parse('more friendly');
        expect(command.type).toBe('change_tone');
        expect(command.parameters?.tone).toBe('friendly');
      });
    });

    describe('Add Section commands', () => {
      it('should recognize "add section" commands', async () => {
        const command = await parser.parse('add a section about pricing');
        expect(command.type).toBe('add_section');
      });

      it('should recognize "include" commands', async () => {
        const command = await parser.parse('include contact information');
        expect(command.type).toBe('add_section');
      });

      it('should recognize "can you add" commands', async () => {
        const command = await parser.parse('can you add benefits');
        expect(command.type).toBe('add_section');
      });
    });

    describe('Remove Section commands', () => {
      it('should recognize "remove" commands', async () => {
        const command = await parser.parse('remove the pricing section');
        expect(command.type).toBe('remove_section');
      });

      it('should recognize "delete" commands', async () => {
        const command = await parser.parse('delete that paragraph');
        expect(command.type).toBe('remove_section');
      });

      it('should recognize "don\'t include" commands', async () => {
        const command = await parser.parse("don't mention the address");
        expect(command.type).toBe('remove_section');
      });
    });

    describe('Make Longer commands', () => {
      it('should recognize "make it longer" commands', async () => {
        const command = await parser.parse('make it longer');
        expect(command.type).toBe('make_longer');
      });

      it('should recognize "add more details" commands', async () => {
        const command = await parser.parse('add more details');
        expect(command.type).toBe('make_longer');
      });

      it('should recognize "expand" commands', async () => {
        const command = await parser.parse('expand on this');
        expect(command.type).toBe('make_longer');
      });

      it('should recognize "too short" feedback', async () => {
        const command = await parser.parse('too short');
        expect(command.type).toBe('make_longer');
      });
    });

    describe('Make Shorter commands', () => {
      it('should recognize "make it shorter" commands', async () => {
        const command = await parser.parse('make it shorter');
        expect(command.type).toBe('make_shorter');
      });

      it('should recognize "condense" commands', async () => {
        const command = await parser.parse('condense this');
        expect(command.type).toBe('make_shorter');
      });

      it('should recognize "too long" feedback', async () => {
        const command = await parser.parse('too long');
        expect(command.type).toBe('make_shorter');
      });

      it('should recognize "more concise" commands', async () => {
        const command = await parser.parse('more concise please');
        expect(command.type).toBe('make_shorter');
      });
    });

    describe('Add Emoji commands', () => {
      it('should recognize "add emoji" commands', async () => {
        const command = await parser.parse('add more emoji');
        expect(command.type).toBe('add_emoji');
      });

      it('should recognize "needs emoji" commands', async () => {
        const command = await parser.parse('needs emoji');
        expect(command.type).toBe('add_emoji');
      });

      it('should recognize "put in emoji" commands', async () => {
        const command = await parser.parse('put in some emoji');
        expect(command.type).toBe('add_emoji');
      });
    });

    describe('Remove Emoji commands', () => {
      it('should recognize "remove emoji" commands', async () => {
        const command = await parser.parse('remove emoji');
        expect(command.type).toBe('remove_emoji');
      });

      it('should recognize "no emoji" commands', async () => {
        const command = await parser.parse('no emoji please');
        expect(command.type).toBe('remove_emoji');
      });

      it('should recognize "too many emoji" feedback', async () => {
        const command = await parser.parse('too many emojis');
        expect(command.type).toBe('remove_emoji');
      });
    });

    describe('Translate commands', () => {
      it('should recognize "translate to Spanish" commands', async () => {
        const command = await parser.parse('translate to Spanish');
        expect(command.type).toBe('translate');
        expect(command.parameters?.language).toBe('spanish');
      });

      it('should recognize "in French" commands', async () => {
        const command = await parser.parse('in French please');
        expect(command.type).toBe('translate');
        expect(command.parameters?.language).toBe('french');
      });

      it('should recognize "translate into Chinese" commands', async () => {
        const command = await parser.parse('translate into Chinese');
        expect(command.type).toBe('translate');
        expect(command.parameters?.language).toBe('chinese');
      });

      it('should recognize multiple languages', async () => {
        const languages = [
          'spanish',
          'french',
          'german',
          'italian',
          'chinese',
          'japanese',
          'korean',
          'portuguese',
        ];

        for (const lang of languages) {
          const command = await parser.parse(`translate to ${lang}`);
          expect(command.type).toBe('translate');
          expect(command.parameters?.language).toBe(lang.toLowerCase());
        }
      });
    });

    describe('Unknown commands', () => {
      it('should return unknown for random text', async () => {
        const command = await parser.parse('asdfghjkl');
        expect(command.type).toBe('unknown');
        expect(command.confidence).toBeLessThan(0.7);
      });

      it('should return unknown for unrelated questions', async () => {
        const command = await parser.parse('what is the weather');
        expect(command.type).toBe('unknown');
      });

      it('should return unknown for empty input', async () => {
        const command = await parser.parse('');
        expect(command.type).toBe('unknown');
        expect(command.confidence).toBe(0);
      });
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract tone parameters', async () => {
      const command = await parser.parse('make it more professional');
      expect(command.parameters?.tone).toBe('professional');
      expect(command.parameters?.intensity).toBe('more');
    });

    it('should extract intensity modifiers', async () => {
      const more = await parser.parse('very casual');
      expect(more.parameters?.intensity).toBe('more');

      const less = await parser.parse('less spicy');
      expect(less.parameters?.intensity).toBe('less');
    });

    it('should extract language for translation', async () => {
      const command = await parser.parse('translate to Japanese');
      expect(command.parameters?.language).toBe('japanese');
    });

    it('should extract image style', async () => {
      const command = await parser.parse('change to a minimalist image');
      expect(command.parameters?.imageStyle).toBe('minimalist');
    });

    it('should handle multiple parameters', async () => {
      const command = await parser.parse('make it very spicy');
      expect(command.parameters?.tone).toBe('spicy');
      expect(command.parameters?.intensity).toBe('more');
    });
  });

  describe('Batch Parsing', () => {
    it('should parse multiple commands in batch', async () => {
      const inputs = ['create a post', 'make it spicy', 'publish it'];
      const commands = await parser.parseBatch(inputs);

      expect(commands).toHaveLength(3);
      expect(commands[0].type).toBe('generate');
      expect(commands[1].type).toBe('change_tone');
      expect(commands[2].type).toBe('publish');
    });

    it('should handle empty batch', async () => {
      const commands = await parser.parseBatch([]);
      expect(commands).toHaveLength(0);
    });
  });

  describe('Confidence Thresholds', () => {
    it('should have high confidence for pattern matches', async () => {
      const command = await parser.parse('create a vibelog');
      expect(command.confidence).toBeGreaterThan(0.7);
    });

    it('should have low confidence for unknown commands', async () => {
      const command = await parser.parse('xyzabc123');
      expect(command.confidence).toBeLessThan(0.7);
    });

    it('should provide suggestions for low confidence', async () => {
      const command = await parser.parse('random text');
      const suggestions = parser.getSuggestions(command);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should not provide suggestions for high confidence', async () => {
      const command = await parser.parse('publish it');
      const suggestions = parser.getSuggestions(command);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('State Validation', () => {
    it('should allow generate in any state', async () => {
      const command = await parser.parse('create a post');
      expect(parser.canExecute(command, 'generating')).toBe(true);
      expect(parser.canExecute(command, 'editing')).toBe(true);
      expect(parser.canExecute(command, 'publishing')).toBe(true);
    });

    it('should only allow edit commands in editing state', async () => {
      const command = await parser.parse('make it spicier');
      expect(parser.canExecute(command, 'editing')).toBe(true);
      expect(parser.canExecute(command, 'generating')).toBe(false);
      expect(parser.canExecute(command, 'publishing')).toBe(false);
    });

    it('should not allow publish in generating state', async () => {
      const command = await parser.parse('publish it');
      expect(parser.canExecute(command, 'generating')).toBe(false);
      expect(parser.canExecute(command, 'editing')).toBe(true);
    });

    it('should provide error message for invalid state', async () => {
      const command = await parser.parse('make it spicier');
      const error = parser.getExecutionError(command, 'generating');
      expect(error).toContain('wait');
    });

    it('should return empty error for valid state', async () => {
      const command = await parser.parse('make it spicier');
      const error = parser.getExecutionError(command, 'editing');
      expect(error).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case insensitive input', async () => {
      const lower = await parser.parse('create a post');
      const upper = await parser.parse('CREATE A POST');
      const mixed = await parser.parse('CrEaTe A pOsT');

      expect(lower.type).toBe('generate');
      expect(upper.type).toBe('generate');
      expect(mixed.type).toBe('generate');
    });

    it('should handle input with extra whitespace', async () => {
      const command = await parser.parse('  create  a  post  ');
      expect(command.type).toBe('generate');
    });

    it('should handle very long input', async () => {
      const longInput = 'create a vibelog ' + 'about my business '.repeat(100);
      const command = await parser.parse(longInput);
      expect(command.type).toBe('generate');
    });

    it('should handle special characters', async () => {
      const command = await parser.parse('create a post! @#$%');
      expect(command.type).toBe('generate');
    });

    it('should prioritize more specific patterns', async () => {
      const command = await parser.parse('start over');
      expect(command.type).toBe('regenerate'); // Not 'generate' even though "start" matches
    });
  });

  describe('Integration with COMMAND_EXAMPLES', () => {
    it('should recognize all example commands', async () => {
      const commandTypes: CommandType[] = [
        'generate',
        'edit',
        'regenerate',
        'publish',
        'approve',
        'cancel',
        'change_image',
        'change_tone',
        'add_section',
        'remove_section',
        'make_longer',
        'make_shorter',
        'add_emoji',
        'remove_emoji',
        'translate',
      ];

      for (const commandType of commandTypes) {
        const examples = COMMAND_EXAMPLES[commandType];
        for (const example of examples) {
          const command = await parser.parse(example);
          expect(command.type).toBe(commandType);
        }
      }
    });
  });

  describe('Helper Functions', () => {
    it('should work with parseCommand helper', async () => {
      const command = await parseCommand('create a post', { useGPT4: false });
      expect(command.type).toBe('generate');
    });

    it('should handle custom confidence threshold', async () => {
      const customParser = new CommandParser({
        useGPT4: false,
        confidenceThreshold: 0.9,
      });

      const command = await customParser.parse('create a post');
      const suggestions = customParser.getSuggestions(command);

      // With 0.9 threshold, even pattern matches might need suggestions
      expect(suggestions).toBeDefined();
    });
  });
});
