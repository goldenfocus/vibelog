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
