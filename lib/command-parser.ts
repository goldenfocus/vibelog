/**
 * Natural Language Command Parser
 *
 * Enhanced NLP parser with GPT-4 integration for understanding user commands
 * in the vibelog creation flow. Falls back to pattern matching if GPT-4 unavailable.
 *
 * @example
 * ```typescript
 * const parser = new CommandParser(apiKey);
 * const command = await parser.parse('make it more spicy');
 * // { type: 'change_tone', parameters: { tone: 'spicy' }, confidence: 0.95 }
 * ```
 */

import {
  CommandType,
  CommandParameters,
  ParsedCommand,
  COMMAND_PATTERNS,
} from './command-patterns';

/**
 * Configuration for the command parser
 */
export interface CommandParserConfig {
  openaiApiKey?: string;
  model?: string;
  confidenceThreshold?: number;
  useGPT4?: boolean;
  maxRetries?: number;
}

/**
 * Enhanced command parser with GPT-4 integration
 */
export class CommandParser {
  private config: Required<CommandParserConfig>;

  constructor(config: CommandParserConfig = {}) {
    this.config = {
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'gpt-4',
      confidenceThreshold: config.confidenceThreshold || 0.7,
      useGPT4: config.useGPT4 !== undefined ? config.useGPT4 : true,
      maxRetries: config.maxRetries || 2,
    };
  }

  /**
   * Parse user input into structured command
   *
   * Uses GPT-4 for intent classification, falls back to pattern matching
   */
  async parse(input: string): Promise<ParsedCommand> {
    const normalizedInput = input.trim();

    if (!normalizedInput) {
      return {
        type: 'unknown',
        intent: input,
        confidence: 0,
        reasoning: 'Empty input',
      };
    }

    // Try GPT-4 first if enabled
    if (this.config.useGPT4 && this.config.openaiApiKey) {
      try {
        const gptResult = await this.parseWithGPT4(normalizedInput);
        if (gptResult.confidence >= this.config.confidenceThreshold) {
          return gptResult;
        }
      } catch (error) {
        console.warn('GPT-4 parsing failed, falling back to patterns:', error);
      }
    }

    // Fall back to pattern matching
    return this.parseWithPatterns(normalizedInput);
  }

  /**
   * Parse using GPT-4 for advanced natural language understanding
   */
  private async parseWithGPT4(input: string): Promise<ParsedCommand> {
    const systemPrompt = `You are a command parser for a vibelog creation tool. Analyze user input and return a structured JSON object.

Available command types:
- generate: Create new vibelog content
- edit: Modify existing content
- regenerate: Start over with new content
- publish: Publish to social platforms
- approve: User likes it, proceed to publish
- cancel: Cancel current operation
- change_image: Change cover image
- change_tone: Adjust writing tone/style (spicy, casual, professional, funny, serious, friendly)
- add_section: Add new content section
- remove_section: Remove content section
- make_longer: Expand content
- make_shorter: Condense content
- add_emoji: Add more emojis
- remove_emoji: Remove emojis
- translate: Translate to another language
- unknown: Unrecognized command

Return JSON format:
{
  "type": "command_type",
  "confidence": 0.0-1.0,
  "parameters": { "key": "value" },
  "reasoning": "why you chose this command"
}

Examples:
Input: "make it spicier"
Output: {"type": "change_tone", "confidence": 0.95, "parameters": {"tone": "spicy", "intensity": "more"}, "reasoning": "User wants to increase spiciness"}

Input: "change the photo"
Output: {"type": "change_image", "confidence": 0.90, "parameters": {}, "reasoning": "User wants to replace the cover image"}

Input: "translate to spanish"
Output: {"type": "translate", "confidence": 0.98, "parameters": {"language": "spanish"}, "reasoning": "User wants Spanish translation"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in GPT-4 response');
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    return {
      type: parsed.type as CommandType,
      intent: input,
      parameters: parsed.parameters,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  }

  /**
   * Parse using regex pattern matching (fallback method)
   */
  private parseWithPatterns(input: string): ParsedCommand {
    // Try to match against command patterns in priority order
    const orderedCommandTypes: CommandType[] = [
      'regenerate', // Check specific commands first
      'change_image',
      'change_tone',
      'add_section',
      'remove_section',
      'make_longer',
      'make_shorter',
      'add_emoji',
      'remove_emoji',
      'translate',
      'approve',
      'cancel',
      'publish',
      'edit',
      'generate', // Generic commands last
      'unknown',
    ];

    for (const commandType of orderedCommandTypes) {
      const patterns = COMMAND_PATTERNS[commandType];
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          // Extract parameters from the input
          const parameters = this.extractParameters(input, commandType);

          return {
            type: commandType,
            intent: input,
            parameters,
            confidence: 0.85, // Pattern matches are fairly confident
            reasoning: `Matched pattern: ${pattern.toString()}`,
          };
        }
      }
    }

    // No pattern matched
    return {
      type: 'unknown',
      intent: input,
      confidence: 0.3,
      reasoning: 'No matching patterns found',
    };
  }

  /**
   * Extract parameters from input text based on command type
   */
  private extractParameters(
    input: string,
    commandType: CommandType
  ): CommandParameters | undefined {
    const params: CommandParameters = {};

    // Extract tone
    const toneMatch = input.match(/(spicy|spicier|casual|professional|funny|serious|friendly)/i);
    if (toneMatch) {
      let tone = toneMatch[1].toLowerCase();
      if (tone === 'spicier') {
        tone = 'spicy';
      }
      params.tone = tone as CommandParameters['tone'];
    }

    // Extract intensity
    if (input.match(/\b(more|very)\b/i)) {
      params.intensity = 'more';
    } else if (input.match(/\b(less|reduce|decrease)\b/i)) {
      params.intensity = 'less';
    }

    // Extract language for translation
    const langMatch = input.match(
      /\b(spanish|french|german|italian|chinese|japanese|korean|portuguese|russian|arabic)\b/i
    );
    if (langMatch) {
      params.language = langMatch[1].toLowerCase();
    }

    // Extract section/target
    const sectionMatch = input.match(/\b(about|section|paragraph)\s+(.+?)(?:\s|$)/i);
    if (sectionMatch) {
      params.section = sectionMatch[2];
    }

    // Extract image style
    if (commandType === 'change_image') {
      const styleMatch = input.match(
        /\b(professional|casual|artistic|minimalist|colorful|dark|bright)\b/i
      );
      if (styleMatch) {
        params.imageStyle = styleMatch[1].toLowerCase();
      }
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  /**
   * Batch parse multiple commands
   */
  async parseBatch(inputs: string[]): Promise<ParsedCommand[]> {
    return Promise.all(inputs.map(input => this.parse(input)));
  }

  /**
   * Get suggestions for low-confidence commands
   */
  getSuggestions(command: ParsedCommand): string[] {
    if (command.confidence >= this.config.confidenceThreshold) {
      return [];
    }

    const suggestions: string[] = [
      'Try being more specific',
      'Example: "make it more casual"',
      'Example: "change the image"',
      'Example: "translate to Spanish"',
    ];

    return suggestions;
  }

  /**
   * Validate if a command can be executed in the current state
   */
  canExecute(command: ParsedCommand, currentState: string): boolean {
    // Commands that can only run in editing state
    const editingOnlyCommands: CommandType[] = [
      'edit',
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

    if (editingOnlyCommands.includes(command.type) && currentState !== 'editing') {
      return false;
    }

    // Publish commands require editing state
    if (
      (command.type === 'publish' || command.type === 'approve') &&
      currentState === 'generating'
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get human-readable error message for invalid commands
   */
  getExecutionError(command: ParsedCommand, currentState: string): string {
    if (this.canExecute(command, currentState)) {
      return '';
    }

    if (currentState === 'generating') {
      return 'Please wait for content generation to complete first.';
    }

    if (currentState === 'publishing') {
      return 'Cannot modify content while publishing. Please wait.';
    }

    return `Cannot execute "${command.type}" command in "${currentState}" state.`;
  }
}

/**
 * Create a command parser instance with default configuration
 */
export function createCommandParser(config?: CommandParserConfig): CommandParser {
  return new CommandParser(config);
}

/**
 * Quick parse function for simple use cases
 */
export async function parseCommand(
  input: string,
  config?: CommandParserConfig
): Promise<ParsedCommand> {
  const parser = new CommandParser(config);
  return parser.parse(input);
}
