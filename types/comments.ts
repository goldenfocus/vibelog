/**
 * Shared TypeScript types for the VibeLog commenting system
 *
 * This file consolidates all comment-related types to ensure consistency
 * across components, APIs, and database interactions.
 */

// ============================================================================
// CORE COMMENT TYPES
// ============================================================================

export interface CommentAuthor {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/**
 * Base Comment Interface
 * Represents a simple comment (Tier 1)
 */
/**
 * Media attachment for comments
 */
export interface MediaAttachment {
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  alt_text?: string; // For accessibility and SEO
}

export interface Comment {
  id: string;
  vibelog_id: string;
  user_id: string;

  // Content
  content: string | null; // Text comment
  audio_url: string | null; // Voice comment URL
  voice_id: string | null; // TTS voice clone ID

  // Rich media attachments (photos, videos)
  attachments: MediaAttachment[];
  attachment_count: number;
  has_rich_media: boolean;
  media_description: string | null; // AI-generated description
  media_alt_texts: Record<string, string> | null; // Alt texts by attachment index

  // Threading
  parent_comment_id: string | null;
  thread_position: number;

  // Metadata
  created_at: string;
  updated_at: string;

  // Author data (joined from profiles)
  author: CommentAuthor;
}

/**
 * Enhanced Comment Interface (Mini-Vibelog)
 * Represents Tier 2: AI-enhanced comments with generated content
 */
export interface EnhancedComment extends Comment {
  // AI-generated content
  enhanced_content: string | null;
  enhanced_title: string | null;
  enhanced_audio_url: string | null;
  enhanced_cover_url: string | null;

  // Vibe analysis
  enhanced_vibe_scores: Record<string, number> | null;
  enhanced_primary_vibe: string | null;

  // Processing state
  processing_status: ProcessingStatus;
  processing_error: string | null;
  is_mini_vibelog: boolean;

  // Video support
  video_url: string | null;
  video_thumbnail_url: string | null;
  video_generation_status: VideoGenerationStatus;
  video_generated_at: string | null;

  // Comment tier classification
  comment_tier: 1 | 2 | 3;

  // Promotion tracking
  promoted_vibelog_id: string | null;
  promoted_at: string | null;

  // Engagement metrics
  likes_count: number;
  replies_count: number;
  views_count: number;

  // SEO and discoverability
  slug: string | null;
  is_public: boolean;
  seo_title: string | null;
  seo_description: string | null;

  // Conversation intelligence
  conversation_thread_id: string | null;
  ai_summary: string | null;
  conversation_context: Record<string, unknown> | null;

  // Moderation and safety
  is_flagged: boolean;
  flag_reason: string | null;
  moderation_status: ModerationStatus;
}

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed';

export type VideoGenerationStatus = 'idle' | 'generating' | 'completed' | 'failed';

export type ModerationStatus = 'approved' | 'pending' | 'rejected' | 'auto_approved';

export type CommentTier = 1 | 2 | 3;

export type ReactionType = 'like' | 'love' | 'mind_blown' | 'laughing' | 'fire';

// ============================================================================
// VIBE-AWARE TYPES
// ============================================================================

export interface VibeScores {
  joy: number; // 0-1
  energy: number; // 0-1
  trust: number; // 0-1
  curiosity: number; // 0-1
  empathy: number; // 0-1
  humor: number; // 0-1
  sarcasm: number; // 0-1 (safety check)
  aggression: number; // 0-1 (moderation)
}

export interface VibeAwareComment extends EnhancedComment {
  vibeScores: VibeScores;
  suggestedResponse?: string;
  conversationTone: 'supportive' | 'playful' | 'serious' | 'professional' | 'casual';
  toxicityScore: number; // 0-1
  requiresModeration: boolean;
  safetyFlags: string[]; // ["passive_aggressive", "dismissive", etc.]
}

// ============================================================================
// CONVERSATION THREADS
// ============================================================================

export interface ConversationThread {
  id: string;
  root_comment_id: string;
  vibelog_id: string;

  // AI-generated thread metadata
  thread_title: string | null;
  thread_summary: string | null;
  primary_vibe: string | null;
  participant_count: number;
  comment_count: number;

  // Discoverability
  is_featured: boolean;
  slug: string | null;

  created_at: string;
  updated_at: string;
}

export interface ThreadWithComments extends ConversationThread {
  comments: EnhancedComment[];
  participants: CommentAuthor[];
}

// ============================================================================
// REACTIONS
// ============================================================================

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface CommentWithReactions extends EnhancedComment {
  reactions: CommentReaction[];
  reactionCounts: Record<ReactionType, number>;
  userReaction?: ReactionType; // Current user's reaction (if any)
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request body for creating a new comment
 */
export interface CreateCommentRequest {
  vibelogId: string;
  content?: string; // Text comment
  audioUrl?: string; // Voice comment
  videoUrl?: string; // Video comment
  parentCommentId?: string; // For threading
  voiceId?: string; // TTS voice clone
  attachments?: MediaAttachment[]; // Rich media attachments (photos, videos)
}

/**
 * Request body for updating a comment
 */
export interface UpdateCommentRequest {
  content?: string;
  audioUrl?: string;
  videoUrl?: string;
}

/**
 * Request body for enhancing a comment into a mini-vibelog
 */
export interface EnhanceCommentRequest {
  autoVideo?: boolean; // Generate video automatically?
  voiceCloneId?: string; // Voice clone for TTS
  customPrompt?: string; // Custom AI prompt override
}

/**
 * Response from enhancement API
 */
export interface EnhanceCommentResponse {
  jobId: string;
  estimatedTime: number; // in seconds
}

/**
 * Processing status response
 */
export interface ProcessingStatusResponse {
  status: ProcessingStatus;
  progress: number; // 0-100
  currentStep: string; // "Transcribing audio..."
  error?: string;
}

/**
 * Request body for promoting comment to vibelog
 */
export interface PromoteCommentRequest {
  title?: string; // Override AI-generated title
  generateVideo?: boolean; // Generate video for promoted vibelog
  publishImmediately?: boolean;
}

/**
 * Response from promotion API
 */
export interface PromoteCommentResponse {
  vibelogId: string;
  url: string; // /@username/vibelog-slug
}

/**
 * Request body for reacting to a comment
 */
export interface ReactToCommentRequest {
  reactionType: ReactionType;
}

/**
 * Request body for flagging a comment
 */
export interface FlagCommentRequest {
  reason: string;
  details?: string;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Props for Comments component (container)
 */
export interface CommentsProps {
  vibelogId: string;
  maxDepth?: number; // Max threading depth (default: 5)
  defaultSort?: 'newest' | 'oldest' | 'best'; // Sort order
  showComposer?: boolean; // Show comment input (default: true)
}

/**
 * Props for CommentsList component
 */
export interface CommentsListProps {
  comments: EnhancedComment[];
  vibelogId: string;
  isAdmin?: boolean;
  onCommentDeleted?: (commentId: string) => void;
  onCommentUpdated?: (comment: EnhancedComment) => void;
  maxDepth?: number;
  currentDepth?: number;
}

/**
 * Props for CommentItem component
 */
export interface CommentItemProps {
  comment: EnhancedComment;
  vibelogId: string;
  isAdmin?: boolean;
  onDelete?: (commentId: string) => void;
  onUpdate?: (comment: EnhancedComment) => void;
  onReply?: (parentCommentId: string) => void;
  depth?: number;
  maxDepth?: number;
}

/**
 * Props for CommentInput/CommentComposer component
 */
export interface CommentComposerProps {
  vibelogId: string;
  parentCommentId?: string; // For threaded replies
  onCommentAdded?: (comment: EnhancedComment) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Props for VideoMode component (new)
 */
export interface VideoModeProps {
  onVideoRecorded: (videoBlob: Blob) => void;
  onCancel?: () => void;
  maxDuration?: number; // in seconds (default: 120)
}

/**
 * Props for TierSelector component (new)
 */
export interface TierSelectorProps {
  suggestedTier: CommentTier;
  onTierSelected: (tier: CommentTier) => void;
  aiSuggestion?: string;
}

/**
 * Props for MiniVibelogCard component (new)
 */
export interface MiniVibelogCardProps {
  comment: EnhancedComment;
  onPromote?: () => void;
  onShare?: () => void;
}

/**
 * Props for CommentReactions component (new)
 */
export interface CommentReactionsProps {
  comment: CommentWithReactions;
  onReact: (reactionType: ReactionType) => void;
}

/**
 * Props for ProcessingStatus component (new)
 */
export interface ProcessingStatusProps {
  commentId: string;
  status: ProcessingStatus;
  progress: number;
  currentStep: string;
  error?: string;
}

// ============================================================================
// SMART COMPOSER STATE
// ============================================================================

export interface SmartComposerState {
  mode: 'text' | 'voice' | 'video';
  suggestedTier: CommentTier;
  aiSuggestion: string | null;
  autoEnhance: boolean; // Auto-generate AI content?
  autoVideo: boolean; // Auto-generate video?
  contentLength: number; // Character/duration count
  vibeAnalysis?: VibeScores; // Real-time vibe detection
}

// ============================================================================
// DATABASE TYPES (for Supabase queries)
// ============================================================================

/**
 * Raw database row type (before joins)
 */
export interface CommentRow {
  id: string;
  vibelog_id: string;
  user_id: string;
  content: string | null;
  audio_url: string | null;
  voice_id: string | null;
  parent_comment_id: string | null;
  thread_position: number;
  created_at: string;
  updated_at: string;

  // Enhanced fields
  enhanced_content: string | null;
  enhanced_title: string | null;
  enhanced_audio_url: string | null;
  enhanced_cover_url: string | null;
  enhanced_vibe_scores: Record<string, number> | null;
  enhanced_primary_vibe: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  is_mini_vibelog: boolean;

  // Video fields
  video_url: string | null;
  video_thumbnail_url: string | null;
  video_generation_status: VideoGenerationStatus;
  video_generated_at: string | null;

  // Tier and promotion
  comment_tier: CommentTier;
  promoted_vibelog_id: string | null;
  promoted_at: string | null;

  // Engagement
  likes_count: number;
  replies_count: number;
  views_count: number;

  // SEO
  slug: string | null;
  is_public: boolean;
  seo_title: string | null;
  seo_description: string | null;

  // Conversation
  conversation_thread_id: string | null;
  ai_summary: string | null;
  conversation_context: Record<string, unknown> | null;

  // Moderation
  is_flagged: boolean;
  flag_reason: string | null;
  moderation_status: ModerationStatus;
}

/**
 * Type for Supabase query with author join
 */
export interface CommentWithAuthor extends CommentRow {
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial comment for optimistic UI updates
 */
export type PartialComment = Partial<EnhancedComment> & {
  id: string;
  vibelog_id: string;
};

/**
 * Comment filter options
 */
export interface CommentFilter {
  tier?: CommentTier[];
  status?: ProcessingStatus[];
  hasVideo?: boolean;
  hasAudio?: boolean;
  isThreaded?: boolean;
  userId?: string;
}

/**
 * Comment sort options
 */
export type CommentSortOption =
  | 'newest' // created_at DESC
  | 'oldest' // created_at ASC
  | 'best' // likes_count DESC
  | 'most_replied' // replies_count DESC
  | 'trending'; // weighted score

/**
 * Pagination options
 */
export interface CommentPagination {
  page: number;
  limit: number;
  sortBy: CommentSortOption;
  filter?: CommentFilter;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Note: All types are already exported via 'export interface' declarations above
// No need for re-export type statement
