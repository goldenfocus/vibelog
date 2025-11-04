/**
 * Client Log Collection Endpoint
 *
 * Receives logs from client-side and processes them
 * Rate-limited to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { rateLimit, tooManyResponse } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 100 logs per minute per IP
    const rl = await rateLimit(request, 'client-logs', { limit: 100, window: '1 m' });
    if (!rl.success) {
      return tooManyResponse(rl);
    }

    // Get user ID if authenticated (for better tracking)
    const supa = await createServerSupabaseClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth?.user?.id;

    // Parse log entry
    const logEntry = await request.json();

    // Validate log entry structure
    if (!logEntry.message || !logEntry.level) {
      return NextResponse.json({ error: 'Invalid log entry' }, { status: 400 });
    }

    // Create API logger with context
    const apiLogger = logger.child({
      source: 'client',
      userId,
      component: logEntry.component,
      userAgent: logEntry.userAgent,
      url: logEntry.url,
    });

    // Log based on level
    const logLevel = logEntry.level;
    const message = `[CLIENT] ${logEntry.message}`;
    const context = logEntry.context || {};

    switch (true) {
      case logLevel >= 50: // FATAL
        apiLogger.fatal(message, context);
        break;
      case logLevel >= 40: // ERROR
        apiLogger.error(message, context);
        break;
      case logLevel >= 30: // WARN
        apiLogger.warn(message, context);
        break;
      case logLevel >= 20: // INFO
        apiLogger.info(message, context);
        break;
      case logLevel >= 10: // DEBUG
        apiLogger.debug(message, context);
        break;
      default: // TRACE
        apiLogger.trace(message, context);
    }

    // TODO: Send to external log aggregation service
    // - Datadog
    // - Logtail
    // - CloudWatch Logs
    // - Logflare

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Failed to process client log', { error });
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 });
  }
}
