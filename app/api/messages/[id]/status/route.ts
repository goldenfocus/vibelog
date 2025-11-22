/**
 * PUT /api/messages/[id]/status
 *
 * Update message delivery status (delivered/read)
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { updateMessageStatusSchema } from '@/lib/messages/validation';
import { updateMessageStatus } from '@/lib/messages/message-service';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = updateMessageStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { status } = parsed.data;
    const messageId = params.id;

    // 3. Update status using service
    const { data: success, error } = await updateMessageStatus(supabase, user.id, messageId, status);

    if (error) {
      console.error('[PUT /api/messages/[id]/status] Error:', error);
      return NextResponse.json({ error: 'Failed to update message status' }, { status: 500 });
    }

    // 4. Return success response
    return NextResponse.json({
      success,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PUT /api/messages/[id]/status] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
