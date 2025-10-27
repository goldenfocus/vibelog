/**
 * Command Pattern Definitions
 *
 * This file defines all command types and their associated patterns for
 * natural language understanding in the vibelog creation flow.
 */

/**
 * Command types that the system can recognize
 */
export type CommandType =
  | 'generate' // Create new content
  | 'edit' // Modify existing content
  | 'regenerate' // Start over
  | 'publish' // Post to platforms
  | 'approve' // User likes it, proceed to publish
  | 'cancel' // Abort operation
  | 'change_image' // Replace cover image
  | 'change_tone' // Adjust writing style
  | 'add_section' // Add content section
  | 'remove_section' // Remove content section
  | 'make_longer' // Expand content
  | 'make_shorter' // Condense content
  | 'add_emoji' // Add more emojis
  | 'remove_emoji' // Remove emojis
  | 'translate' // Translate to another language
  | 'unknown'; // Unrecognized command

/**
 * Parameters that can be extracted from commands
 */
export interface CommandParameters {
  tone?: 'spicy' | 'casual' | 'professional' | 'funny' | 'serious' | 'friendly';
  language?: string;
  section?: string;
  imageStyle?: string;
  intensity?: 'more' | 'less' | 'very';
  target?: string; // Generic target for the command
  [key: string]: string | undefined; // Allow additional string parameters
}

/**
 * Structured command object
 */
export interface ParsedCommand {
  type: CommandType;
  intent: string; // Original user input
  parameters?: CommandParameters;
  confidence: number; // 0-1, confidence in the parsing
  reasoning?: string; // Why this command was chosen (for debugging)
}

/**
 * Pattern matching rules for each command type
 * These are fallback patterns if GPT-4 is unavailable
 */
export const COMMAND_PATTERNS: Record<CommandType, RegExp[]> = {
  generate: [
    /^(create|generate|write) /i,
    /^make (a|an|some) /i,
    /^(let's|lets) (create|make|start|write)/i,
    /^start /i,
    /^new vibelog/i,
  ],

  edit: [
    /^(change|edit|update|modify|fix|adjust) /i,
    /^can you (change|edit|update|modify)/i,
    /^please (change|edit|update|modify)/i,
  ],

  regenerate: [
    /^(try again|regenerate|start over|redo|restart)/i,
    /(don't like it|i don't like|not good|try something (else|different))/i,
    /^different (version|take|approach)/i,
  ],

  publish: [
    /^(publish|post|share|send|upload)/i,
    /^(put it on|post (it )?to|share (it )?on|send (it )?to)/i,
    /^go live/i,
  ],

  approve: [
    /^(perfect|love it|looks? good|great|awesome|amazing|excellent)/i,
    /^(yes|yeah|yep|yup|sure|ok|okay|sounds good)/i,
    /^(let's publish|ready to publish|ready to go)/i,
    /^(that'?s? good|that'?s? great|that'?s? perfect)/i,
  ],

  cancel: [
    /^(cancel|stop|abort|never ?mind|forget it|discard)/i,
    /^(don't (publish|post|share|send))/i,
    /^quit$/i,
  ],

  change_image: [
    /^(change|swap|replace|update) (to )?(a |an |the )?(\w+ )?(image|photo|picture|cover)/i,
    /^(new|different|another) (\w+ )?(image|photo|picture|cover)/i,
    /^(find|get|show me) (a|an)? ?different (image|photo)/i,
  ],

  change_tone: [
    /^make (it )?(more |less |very )?(spicy|spicier|casual|professional|funny|serious|friendly)/i,
    /^(more|less|very) (spicy|casual|professional|funny|serious|friendly)/i,
    /^(change|adjust) (the )?tone/i,
  ],

  add_section: [
    /^add (a|an|some|more) (section|paragraph|part|chapter|about)/i,
    /^add more (about|on|regarding)/i,
    /^include /i,
    /^insert (a|an|some)/i,
    /^can you add/i,
  ],

  remove_section: [
    /^(remove|delete|cut|take out) (the|this|that)/i,
    /^get rid of (?!the emoji|emoji)/i, // Don't match emoji removal
    /^don't (include|mention)/i,
  ],

  make_longer: [
    /^make (it )?(longer|more detailed|bigger)/i,
    /^(expand|elaborate|write more)/i,
    /^add more (details|content|text|words)/i,
    /^(too short|needs more)/i,
  ],

  make_shorter: [
    /^make (it )?(shorter|more concise|brief|smaller)/i,
    /^(more concise|condense|summarize|trim|cut down)/i,
    /^(too long|too much)/i,
  ],

  add_emoji: [
    /^(add|include) (more |some )?emoji/i,
    /^put (in |more )(some |more )?emoji/i,
    /^more emoji/i,
    /^(needs?|wants?) (more )?emoji/i,
  ],

  remove_emoji: [
    /^(remove|delete|no) emoji/i,
    /^get rid of (the )?emoji/i,
    /^take out (the )?emoji/i,
    /^(less|fewer) emoji/i,
    /^too many emoji/i,
  ],

  translate: [
    /^translate (to|into|in)/i,
    /^(in|into) (spanish|french|german|chinese|japanese)/i,
    /^make it in/i,
  ],

  unknown: [],
};

/**
 * Example commands for each type (used for testing)
 */
export const COMMAND_EXAMPLES: Record<CommandType, string[]> = {
  generate: [
    'create a vibelog about my spa',
    'generate content about yoga classes',
    'write something about my new product',
    "let's make a post for Instagram",
  ],

  edit: ['change the title', 'update the content', 'modify the teaser', 'fix the grammar'],

  regenerate: ['try again', "I don't like it", 'start over', 'try something different'],

  publish: ['publish it', 'post to Twitter', 'share on Instagram', 'send to all platforms'],

  approve: ['perfect', 'love it', 'looks good', "let's publish this"],

  cancel: ['cancel', "don't publish", 'never mind', 'forget it'],

  change_image: [
    'change the image',
    'different picture please',
    'swap the photo',
    'new cover image',
  ],

  change_tone: [
    'make it spicier',
    'more casual please',
    'make it more professional',
    'less serious',
  ],

  add_section: [
    'add a section about benefits',
    'include pricing',
    'add more about location',
    'can you add contact info',
  ],

  remove_section: [
    'remove the pricing section',
    'delete that paragraph',
    "don't mention the address",
    'take out the last part',
  ],

  make_longer: ['make it longer', 'add more details', 'expand on this', 'needs more content'],

  make_shorter: ['make it shorter', 'too long, condense it', 'trim it down', 'more concise please'],

  add_emoji: ['add more emoji', 'needs emoji', 'put in some emoji', 'more emojis please'],

  remove_emoji: ['remove emoji', 'no emoji please', 'too many emojis', 'get rid of the emoji'],

  translate: [
    'translate to Spanish',
    'make it in French',
    'translate into Chinese',
    'in German please',
  ],

  unknown: ['asdfghjkl', 'what is the weather', 'tell me a joke', 'how are you'],
};

/**
 * Get human-readable description of command type
 */
export function getCommandDescription(type: CommandType): string {
  const descriptions: Record<CommandType, string> = {
    generate: 'Create new vibelog content',
    edit: 'Modify existing content',
    regenerate: 'Start over with new content',
    publish: 'Publish to social platforms',
    approve: 'Approve and proceed to publish',
    cancel: 'Cancel current operation',
    change_image: 'Change cover image',
    change_tone: 'Adjust writing tone/style',
    add_section: 'Add new content section',
    remove_section: 'Remove content section',
    make_longer: 'Expand content',
    make_shorter: 'Condense content',
    add_emoji: 'Add more emojis',
    remove_emoji: 'Remove emojis',
    translate: 'Translate to another language',
    unknown: 'Unrecognized command',
  };

  return descriptions[type];
}
