// Vibe Brain - Platform AI with per-user memory
// Export all services for easy importing

export {
  generateEmbedding,
  embedContent,
  embedVibelog,
  embedComment,
  embedProfile,
  searchSimilarContent,
  deleteEmbedding,
  batchEmbedVibelogs,
} from './embedding-service';

export {
  storeMemory,
  retrieveMemories,
  getAllMemories,
  extractMemoriesFromConversation,
  deleteMemory,
  clearAllMemories,
} from './memory-service';

export {
  chat,
  getOrCreateConversation,
  getConversationHistory,
  getUserConversations,
} from './rag-engine';

export {
  getUserProfile,
  getPlatformStats,
  getTopCreators,
  getTrendingVibelogs,
  searchCreator,
} from './platform-queries';

export { VIBE_BRAIN_TOOLS } from './tools';
export { executeTool } from './tool-executor';

export { detectSubAgent, getSubAgentConfig, enhancePromptForSubAgent } from './sub-agents';
export type { SubAgentType } from './sub-agents';
