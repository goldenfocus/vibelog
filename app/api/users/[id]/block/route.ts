/**
 * POST /api/users/[id]/block
 *
 * Block or unblock a user
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { blockUserSchema } from '@/lib/messages/validation';
import { toggleBlockUser } from '@/lib/messages/message-service';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }

    // 2. Validate params
    const targetUserId = params.id;

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parsed = blockUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    // 4. Toggle block using service
    const { data: success, error } = await toggleBlockUser(supabase, user.id, targetUserId, action);

    if (error) {
      console.error('[POST /api/users/[id]/block] Error:', error);
      return NextResponse.json({ error: 'Failed to block/unblock user' }, { status: 500 });
    }

    // 5. Return success response
    return NextResponse.json({
      success,
      relationship: action === 'block' ? 'blocked' : null,
    });
  } catch (error) {
    console.error('[POST /api/users/[id]/block] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
