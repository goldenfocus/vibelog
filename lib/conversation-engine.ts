import {
  useConversationStore,
  ConversationState,
  isValidTransition,
  VibelogContent,
} from '@/state/conversation-state';

/**
 * Command types recognized by the conversation engine
 */
export type CommandType =
  | 'generate'
  | 'edit'
  | 'regenerate'
  | 'publish'
  | 'approve'
  | 'cancel'
  | 'unknown';

/**
 * Parsed command from natural language input
 */
export interface ParsedCommand {
  type: CommandType;
  intent: string;
  parameters?: Record<string, unknown>;
  confidence: number; // 0-1, how confident we are in the parsing
}

/**
 * Command patterns for natural language understanding
 * These patterns match user intents to command types
 */
const COMMAND_PATTERNS: Record<CommandType, RegExp[]> = {
  generate: [
    /^(create|generate|write) /i,
    /^(let's|lets) (create|make|start)/i,
    /^make (a|an|some) /i, // "make a post" but not "make it"
    /^start /i,
  ],
  edit: [
    /^make it (more |less )?(spicy|spicier|casual|professional|funny)/i,
    /^(change|edit|update|modify) /i,
    /^(more|less) (spicy|spicier|casual|professional|funny)/i,
    /^(change|swap|replace) (the )?(image|photo|picture)/i,
  ],
  regenerate: [
    /^(try again|regenerate|start over|redo)/i,
    /(don't like it|not good|i don't like)/i,
  ],
  publish: [/^(publish|post|share|send)/i, /^(put it on|post (it )?to|share (it )?on)/i],
  approve: [
    /^(perfect|love it|looks? good|great|awesome)/i,
    /^(yes|yeah|yep|sure|ok|okay)/i,
    /^(let's publish|ready to publish)/i,
  ],
  cancel: [/^(cancel|stop|never ?mind|forget it)/i, /^(don't (publish|post|share))/i],
  unknown: [],
};

/**
 * Conversation Engine
 *
 * Orchestrates the conversational flow for vibelog creation and editing.
 * Handles state transitions, command parsing, and user interactions.
 *
 * @example
 * ```typescript
 * const engine = new ConversationEngine();
 *
 * // Process user input
 * const response = await engine.processInput('Create a vibelog about spa services');
 *
 * // Check current state
 * const state = engine.getCurrentState();
 * ```
 */
export class ConversationEngine {
  private store = useConversationStore.getState();

  constructor() {
    // Subscribe to store changes
    useConversationStore.subscribe(state => {
      this.store = state;
    });
  }

  /**
   * Process natural language input from user
   */
  async processInput(input: string): Promise<string> {
    // Add user message to conversation
    this.store.addMessage('user', input);

    // Parse the command
    const command = this.parseCommand(input);

    // Handle low confidence
    if (command.confidence < 0.7) {
      return this.handleUnknownCommand(input);
    }

    // Execute the command based on current state
    return await this.executeCommand(command);
  }

  /**
   * Parse natural language input into structured command
   *
   * Pattern matching order matters - more specific patterns should be checked first
   */
  parseCommand(input: string): ParsedCommand {
    const normalizedInput = input.trim();

    // Try to match against command patterns in specific order to avoid conflicts
    // Check more specific patterns first (regenerate, edit, approve) before general ones (generate)
    const orderedCommandTypes: CommandType[] = [
      'regenerate', // Check first: "start over" should match before "start" in generate
      'edit',
      'approve',
      'cancel',
      'publish',
      'generate',
      'unknown',
    ];

    for (const commandType of orderedCommandTypes) {
      const patterns = COMMAND_PATTERNS[commandType];
      for (const pattern of patterns) {
        if (pattern.test(normalizedInput)) {
          return {
            type: commandType,
            intent: normalizedInput,
            confidence: 0.9, // High confidence for pattern matches
          };
        }
      }
    }

    // If no pattern matches, return unknown with low confidence
    return {
      type: 'unknown',
      intent: normalizedInput,
      confidence: 0.3,
    };
  }

  /**
   * Execute a parsed command based on current state
   */
  private async executeCommand(command: ParsedCommand): Promise<string> {
    switch (command.type) {
      case 'generate':
        return this.handleGenerate(command);

      case 'edit':
        return this.handleEdit(command);

      case 'regenerate':
        return this.handleRegenerate(command);

      case 'publish':
        return this.handlePublish(command);

      case 'approve':
        return this.handleApprove(command);

      case 'cancel':
        return this.handleCancel(command);

      default:
        return this.handleUnknownCommand(command.intent);
    }
  }

  /**
   * Handle 'generate' command - create new vibelog
   */
  private async handleGenerate(command: ParsedCommand): Promise<string> {
    // Transition to generating state
    this.store.startGenerating();

    // Mock: In real implementation, this would call OpenAI API
    const mockContent: VibelogContent = {
      title: 'Your Vibelog Title',
      content: 'Generated content based on: ' + command.intent,
      teaser: 'A short teaser...',
    };

    // Update content in store
    this.store.updateContent(mockContent);

    // Transition to editing state (ready for feedback)
    this.store.startEditing();

    const response = "I've generated your vibelog! What would you like to change?";
    this.store.addMessage('assistant', response);

    return response;
  }

  /**
   * Handle 'edit' command - modify existing content
   */
  private async handleEdit(command: ParsedCommand): Promise<string> {
    const currentState = this.store.state;

    // Can only edit in 'editing' state
    if (currentState !== 'editing') {
      const error = 'Please wait for content generation to complete first.';
      this.store.setError(error);
      return error;
    }

    // Mock: Apply edit to content
    const updatedContent = {
      ...this.store.vibelogContent,
      content:
        (this.store.vibelogContent.content || '') + '\n[Edited based on: ' + command.intent + ']',
    };

    this.store.updateContent(updatedContent);

    const response = "I've updated your vibelog. How does it look now?";
    this.store.addMessage('assistant', response);

    return response;
  }

  /**
   * Handle 'regenerate' command - start over
   */
  private async handleRegenerate(_command: ParsedCommand): Promise<string> {
    // Clear current content and restart
    this.store.resetContent();
    this.store.startGenerating();

    const response = "Let's start fresh! What would you like to create?";
    this.store.addMessage('assistant', response);

    return response;
  }

  /**
   * Handle 'publish' command - post to platforms
   */
  private async handlePublish(_command: ParsedCommand): Promise<string> {
    // Attempt transition to publishing
    this.store.startPublishing();

    // Check if transition succeeded (error would be set if invalid)
    if (this.store.error) {
      return this.store.error;
    }

    // Mock: Publish to platforms
    const response = "Great! I'm publishing your vibelog to the platforms...";
    this.store.addMessage('assistant', response);

    // In real implementation, this would trigger actual publishing
    // and eventually transition back to generating for new vibelog

    return response;
  }

  /**
   * Handle 'approve' command - user approves content
   */
  private async handleApprove(_command: ParsedCommand): Promise<string> {
    if (this.store.state !== 'editing') {
      return "There's nothing to approve right now.";
    }

    // Implicitly transition to publishing
    return this.handlePublish(_command);
  }

  /**
   * Handle 'cancel' command - abort current operation
   */
  private async handleCancel(_command: ParsedCommand): Promise<string> {
    this.store.reset();

    const response = "No problem! Let me know when you'd like to create something new.";
    this.store.addMessage('assistant', response);

    return response;
  }

  /**
   * Handle unknown commands with helpful suggestions
   */
  private handleUnknownCommand(_input: string): string {
    const currentState = this.store.state;
    let suggestions: string[] = [];

    switch (currentState) {
      case 'generating':
        suggestions = ['"create a vibelog about..."', '"generate content about..."'];
        break;

      case 'editing':
        suggestions = ['"make it more spicy"', '"change the image"', '"publish it"', '"try again"'];
        break;

      case 'publishing':
        suggestions = ['Please wait for publishing to complete...'];
        break;
    }

    const response = `I'm not sure what you mean. Try saying: ${suggestions.join(', ')}`;
    this.store.addMessage('assistant', response);

    return response;
  }

  /**
   * Get current state
   */
  getCurrentState(): ConversationState {
    return this.store.state;
  }

  /**
   * Get conversation history
   */
  getMessages() {
    return this.store.messages;
  }

  /**
   * Get current vibelog content
   */
  getContent(): VibelogContent {
    return this.store.vibelogContent;
  }

  /**
   * Reset the entire conversation
   */
  reset(): void {
    this.store.reset();
  }

  /**
   * Validate a state transition
   */
  canTransitionTo(targetState: ConversationState): boolean {
    return isValidTransition(this.store.state, targetState);
  }
}

/**
 * Singleton instance for easy access
 */
let engineInstance: ConversationEngine | null = null;

/**
 * Get or create the conversation engine singleton
 */
export function getConversationEngine(): ConversationEngine {
  if (!engineInstance) {
    engineInstance = new ConversationEngine();
  }
  return engineInstance;
}

/**
 * Reset the conversation engine singleton (useful for testing)
 */
export function resetConversationEngine(): void {
  if (engineInstance) {
    engineInstance.reset();
  }
  engineInstance = null;
}
