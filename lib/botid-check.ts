import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';

/**
 * Check if the request is from a bot and return a 403 response if it is.
 * Returns null if the request is legitimate, or a NextResponse if it's a bot.
 *
 * Usage in API routes:
 * ```ts
 * const botCheck = await checkAndBlockBots();
 * if (botCheck) return botCheck;
 * ```
 */
export async function checkAndBlockBots(): Promise<NextResponse | null> {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  return null;
}
