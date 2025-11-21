import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isDailyLimitExceeded } from '@/lib/ai-cost-tracker';
import { createServerSupabaseClient } from '@/lib/supabase';
import { chat, getOrCreateConversation, getConversationHistory } from '@/lib/vibe-brain';

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
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

    // Get or create conversation
    const { id: activeConversationId, isNew } = await getOrCreateConversation(
      user.id,
      conversationId
    );

    // Get conversation history if continuing
    const history = isNew ? [] : await getConversationHistory(activeConversationId, user.id);

    // Generate response
    const response = await chat(user.id, activeConversationId, message, history);

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
