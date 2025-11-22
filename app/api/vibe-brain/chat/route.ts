import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { checkAndBlockBots } from '@/lib/botid-check';
import { createServerSupabaseClient } from '@/lib/supabase';
import { chat, getOrCreateConversation, getConversationHistory } from '@/lib/vibe-brain';

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    // 🛡️ BOT PROTECTION: Block automated bots
    const botCheck = await checkAndBlockBots();
    if (botCheck) {
      return botCheck;
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to chat with Vibe Brain ;)' },
        { status: 401 }
      );
    }

    // Check daily cost limit
    const limitExceeded = await isDailyLimitExceeded();
    if (limitExceeded) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again tomorrow.' },
        { status: 503 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { message, conversationId } = parsed.data;

    // Check for onboarding questions
    const lowerMessage = message.toLowerCase().trim();
    const isOnboarding =
      lowerMessage === 'what is vibelog?' ||
      lowerMessage === 'what is vibelog' ||
      lowerMessage === 'how does it work?' ||
      lowerMessage === 'how does it work' ||
      lowerMessage === 'show me some examples' ||
      lowerMessage === 'show me some examples.';

    // Get or create conversation
    const { id: activeConversationId, isNew } = await getOrCreateConversation(
      user.id,
      conversationId
    );

    // Get conversation history if continuing
    const history = isNew ? [] : await getConversationHistory(activeConversationId, user.id);

    // Generate response with onboarding hint if needed
    const response = await chat(user.id, activeConversationId, message, history, isOnboarding);

    return NextResponse.json({
      message: response.message,
      sources: response.sources,
      conversationId: activeConversationId,
      tokensUsed: response.tokensUsed,
    });
  } catch (error) {
    console.error('[VIBE BRAIN API] Error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
// Trigger redeploy
