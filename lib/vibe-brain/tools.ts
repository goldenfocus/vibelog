/**
 * Vibe Brain Tools - Function definitions for GPT tool calling
 *
 * These tools allow Vibe Brain to dynamically query the database
 * instead of relying on pre-fetched static context.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const VIBE_BRAIN_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchVibelogs',
      description:
        'Search vibelogs by keyword, topic, or content. Use this when users ask about specific topics or want to find vibelogs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - keywords, topic, or phrase to search for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 5, max 10)',
          },
          username: {
            type: 'string',
            description: 'Optional: filter by specific username',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getVibelog',
      description:
        'Get full details of a specific vibelog by its ID. Use when you need complete content.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The vibelog ID',
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchUsers',
      description:
        'Search for users by username, display name, or bio. Use when asked about specific creators.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - username or name to search for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 5, max 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getUserVibelogs',
      description:
        "Get vibelogs created by a specific user. Use when asked about someone's content.",
      parameters: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'The username to get vibelogs for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 5, max 10)',
          },
        },
        required: ['username'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTrending',
      description:
        'Get trending/popular vibelogs. Use when asked about trending content, popular vibes, or what to listen to.',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['today', 'week', 'month', 'all'],
            description: 'Time period for trending (default: week)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 5, max 10)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTopCreators',
      description:
        'Get the most active creators on the platform. Use when asked about top users or most prolific creators.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 5, max 10)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPlatformStats',
      description:
        'Get platform statistics like total users, vibelogs, comments. Use for general platform questions.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getVibelogComments',
      description:
        'Get comments on a specific vibelog. Use when asked about reactions or discussion on a vibe.',
      parameters: {
        type: 'object',
        properties: {
          vibelogId: {
            type: 'string',
            description: 'The vibelog ID to get comments for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of comments (default 5, max 20)',
          },
        },
        required: ['vibelogId'],
      },
    },
  },
];

// Tool result types for type safety
export interface VibelogResult {
  id: string;
  title: string;
  teaser: string | null;
  content: string | null;
  username: string;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
}

export interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  vibelogCount: number;
  isAdmin: boolean;
}

export interface CommentResult {
  id: string;
  content: string;
  username: string;
  createdAt: string;
}

export interface PlatformStatsResult {
  totalUsers: number;
  totalVibelogs: number;
  totalComments: number;
  vibelogsToday: number;
}

export type ToolResult =
  | { tool: 'searchVibelogs'; data: VibelogResult[] }
  | { tool: 'getVibelog'; data: VibelogResult | null }
  | { tool: 'searchUsers'; data: UserResult[] }
  | { tool: 'getUserVibelogs'; data: VibelogResult[] }
  | { tool: 'getTrending'; data: VibelogResult[] }
  | { tool: 'getTopCreators'; data: UserResult[] }
  | { tool: 'getPlatformStats'; data: PlatformStatsResult }
  | { tool: 'getVibelogComments'; data: CommentResult[] };
