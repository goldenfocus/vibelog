/**
 * Reactions Components
 *
 * QuickReactions - New unified component (tap=❤️, long-press=9 reactions)
 * ReactionBar - Legacy universal reaction bar
 * ReactionButton - Legacy single emoji button
 * ReactionPicker - Legacy full emoji picker (deprecated)
 */

// New unified component
export { QuickReactions, QUICK_REACTIONS, DEFAULT_REACTION } from './QuickReactions';
export type { QuickReaction } from './QuickReactions';

// Legacy components (for backwards compatibility)
export { ReactionBar } from './ReactionBar';
export { ReactionButton } from './ReactionButton';
export { ReactionPicker } from './ReactionPicker';
