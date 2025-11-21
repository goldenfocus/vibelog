import {
  generateDraftFromPrompt,
  saveDraft,
  publishToTwitter,
  ConversationDraft,
} from '@/lib/conversation-actions';
import { parseCommand, ParsedCommand } from '@/lib/conversation-commands';
import {
  useConversationStore,
  ConversationState,
  isValidTransition,
  VibelogContent,
} from '@/state/conversation-state';

export class ConversationEngine {
  private store = useConversationStore.getState();

  constructor() {
    // Subscribe to store changes
    useConversationStore.subscribe(state => {
      this.store = state;
    });
  }

  parseCommand(input: string): ParsedCommand {
    return parseCommand(input);
  }

  async processInput(input: string): Promise<string> {
    // Add user message to conversation
    this.store.addMessage('user', input);

    // Parse the command
    const command = parseCommand(input);

    // Handle low confidence
    if (command.confidence < 0.7) {
      return this.handleUnknownCommand(input);
    }

    // Execute the command based on current state
    return await this.executeCommand(command);
  }

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

  private async handleGenerate(command: ParsedCommand): Promise<string> {
    this.store.startGenerating();

    try {
      const draft = await generateDraftFromPrompt(command.intent);
      this.applyDraft(draft);
      this.store.startEditing();

      const response =
        "I've generated your vibelog draft. Want me to tweak it or publish a share link?";
      this.store.addMessage('assistant', response);
      return response;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate a draft. Please try a shorter request.';
      this.store.setError(message);
      this.store.addMessage('assistant', message);
      return message;
    }
  }

  private async handleEdit(command: ParsedCommand): Promise<string> {
    const currentState = this.store.state;

    // Can only edit in 'editing' state
    if (currentState !== 'editing') {
      const error = 'Please wait for content generation to complete first.';
      this.store.setError(error);
      return error;
    }

    const existingDraft =
      this.store.vibelogContent.fullContent ||
      this.store.vibelogContent.content ||
      this.store.vibelogContent.teaser ||
      '';

    this.store.startGenerating();
    try {
      // Re-run generation with edit instructions appended
      const draft = await generateDraftFromPrompt(
        `Edit this vibelog based on the request.\n\nREQUEST: ${command.intent}\n\nCURRENT:\n${existingDraft}`
      );

      this.applyDraft(draft);
      this.store.startEditing();

      const response = "I've updated your vibelog. Want another change or should I publish it?";
      this.store.addMessage('assistant', response);
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Edit failed — try a simpler request.';
      this.store.setError(message);
      this.store.startEditing();
      this.store.addMessage('assistant', message);
      return message;
    }
  }

  private async handleRegenerate(_command: ParsedCommand): Promise<string> {
    this.store.resetContent();
    this.store.startGenerating();
    const response = "Let's start fresh. Tell me what you want this vibelog to cover.";
    this.store.addMessage('assistant', response);
    return response;
  }

  private async handlePublish(_command: ParsedCommand): Promise<string> {
    const { vibelogContent } = this.store;
    if (!vibelogContent.fullContent && !vibelogContent.content) {
      const error = 'No content to publish yet — ask me to generate a draft first.';
      this.store.setError(error);
      return error;
    }

    this.store.startPublishing();
    const draft: ConversationDraft = {
      title: vibelogContent.title || 'Untitled Vibelog',
      fullContent: vibelogContent.fullContent || vibelogContent.content || '',
      teaser: vibelogContent.teaser || vibelogContent.content || '',
      detectedLanguage: 'en',
    };

    try {
      const saved = await saveDraft(draft);
      if (saved.vibelogId) {
        this.store.updateContent({
          id: saved.vibelogId,
          publicUrl: saved.publicUrl,
        });
      }

      const publishResult = saved.vibelogId ? await publishToTwitter(saved.vibelogId) : null;
      const response = publishResult?.shareUrl
        ? `Ready! Here's your share link: ${publishResult.shareUrl}`
        : saved.message || 'Published your vibelog.';

      this.store.addMessage('assistant', response);
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Publishing failed. Please try again.';
      this.store.setError(message);
      this.store.addMessage('assistant', message);
      // Allow user to continue editing after a failure
      this.store.startEditing();
      return message;
    }
  }

  private async handleApprove(_command: ParsedCommand): Promise<string> {
    if (this.store.state !== 'editing') {
      return "There's nothing to approve right now.";
    }

    // Implicitly transition to publishing
    return this.handlePublish(_command);
  }

  private async handleCancel(_command: ParsedCommand): Promise<string> {
    this.store.reset();

    const response = "No problem! Let me know when you'd like to create something new.";
    this.store.addMessage('assistant', response);

    return response;
  }

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

  getCurrentState(): ConversationState {
    return this.store.state;
  }

  getMessages() {
    return this.store.messages;
  }

  getContent(): VibelogContent {
    return this.store.vibelogContent;
  }

  reset(): void {
    this.store.reset();
  }

  canTransitionTo(targetState: ConversationState): boolean {
    return isValidTransition(this.store.state, targetState);
  }

  private applyDraft(draft: ConversationDraft) {
    const content: VibelogContent = {
      title: draft.title,
      content: draft.teaser,
      teaser: draft.teaser,
      fullContent: draft.fullContent,
    };
    this.store.updateContent(content);
  }
}

let engineInstance: ConversationEngine | null = null;

export function getConversationEngine(): ConversationEngine {
  if (!engineInstance) {
    engineInstance = new ConversationEngine();
  }
  return engineInstance;
}

export function resetConversationEngine(): void {
  if (engineInstance) {
    engineInstance.reset();
  }
  engineInstance = null;
}
