/**
 * Session management for anonymous users
 * Generates and persists a unique session ID for tracking anonymous vibelogs
 */

const SESSION_KEY = 'vibelog_session_id';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create a session ID for the current user
 * Persisted in localStorage for anonymous user tracking
 */
export function getSessionId(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side, no session
  }

  try {
    let sessionId = localStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  } catch (error) {
    console.warn('Failed to get/set session ID:', error);
    // Fallback to in-memory session ID for this page load
    return generateSessionId();
  }
}

/**
 * Clear the current session ID
 * Used when user signs in (ownership transferred to user account)
 */
export function clearSessionId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear session ID:', error);
  }
}
