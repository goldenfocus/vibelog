/**
 * Message API Validation Schemas
 *
 * Zod schemas for validating all messaging API requests
 */

import { z } from 'zod';

// =====================================================
// MESSAGE SCHEMAS
// =====================================================

/**
 * Send message request schema
 */
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  contentType: z.enum(['text', 'image', 'file', 'voice', 'video']).optional().default('text'),
  parentMessageId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        type: z.string(),
        url: z.string().url(),
        name: z.string(),
        size: z.number().positive(),
        mimeType: z.string().optional(),
      })
    )
    .max(10, 'Maximum 10 attachments allowed')
    .optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Get messages query params schema
 */
export const getMessagesSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().datetime().optional(),
  parentMessageId: z.string().uuid().optional(),
});

/**
 * Update message status schema
 */
export const updateMessageStatusSchema = z.object({
  status: z.enum(['delivered', 'read']),
});

/**
 * Toggle reaction schema
 */
export const toggleReactionSchema = z.object({
  emoji: z.string().min(1).max(20),
  action: z.enum(['add', 'remove']),
});

// =====================================================
// CONVERSATION SCHEMAS
// =====================================================

/**
 * Create DM conversation schema
 */
export const createDMConversationSchema = z.object({
  participantId: z.string().uuid('Invalid participant ID'),
});

/**
 * Create group conversation schema
 */
export const createGroupConversationSchema = z.object({
  participantIds: z
    .array(z.string().uuid())
    .min(1, 'At least 1 participant required')
    .max(10, 'Maximum 10 participants allowed'),
  title: z.string().min(1).max(100),
});

/**
 * Mute/unmute conversation schema
 */
export const muteConversationSchema = z.object({
  action: z.enum(['mute', 'unmute']),
});

/**
 * Archive/unarchive conversation schema
 */
export const archiveConversationSchema = z.object({
  action: z.enum(['archive', 'unarchive']),
});

// =====================================================
// USER RELATIONSHIP SCHEMAS
// =====================================================

/**
 * Block/unblock user schema
 */
export const blockUserSchema = z.object({
  action: z.enum(['block', 'unblock']),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type UpdateMessageStatusInput = z.infer<typeof updateMessageStatusSchema>;
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
export type CreateDMConversationInput = z.infer<typeof createDMConversationSchema>;
export type CreateGroupConversationInput = z.infer<typeof createGroupConversationSchema>;
export type MuteConversationInput = z.infer<typeof muteConversationSchema>;
export type ArchiveConversationInput = z.infer<typeof archiveConversationSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
