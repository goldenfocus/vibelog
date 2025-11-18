import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { NotificationPreferences } from '@/types/notifications';

const UpdatePreferencesSchema = z.object({
  comment_in_app: z.boolean().optional(),
  comment_email: z.boolean().optional(),
  comment_push: z.boolean().optional(),

  reply_in_app: z.boolean().optional(),
  reply_email: z.boolean().optional(),
  reply_push: z.boolean().optional(),

  reaction_in_app: z.boolean().optional(),
  reaction_email: z.boolean().optional(),
  reaction_push: z.boolean().optional(),

  mention_in_app: z.boolean().optional(),
  mention_email: z.boolean().optional(),
  mention_push: z.boolean().optional(),

  follow_in_app: z.boolean().optional(),
  follow_email: z.boolean().optional(),
  follow_push: z.boolean().optional(),

  vibelog_like_in_app: z.boolean().optional(),
  vibelog_like_email: z.boolean().optional(),
  vibelog_like_push: z.boolean().optional(),

  group_similar: z.boolean().optional(),
  group_window_minutes: z.number().min(5).max(1440).optional(),

  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  quiet_hours_end: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),

  max_emails_per_day: z.number().min(0).max(100).optional(),
  digest_enabled: z.boolean().optional(),
  digest_frequency: z.enum(['daily', 'weekly']).optional(),
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok (we'll create defaults)
      console.error('Error fetching notification preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, create defaults
    if (!data) {
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default preferences:', insertError);
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
      }

      return NextResponse.json(newPrefs as NotificationPreferences);
    }

    return NextResponse.json(data as NotificationPreferences);
  } catch (error) {
    console.error('Error in GET /api/notifications/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = UpdatePreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updates = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    };

    // Update preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json(data as NotificationPreferences);
  } catch (error) {
    console.error('Error in PATCH /api/notifications/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
