import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isAdmin } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

const updateSchema = z.object({
  key: z.string(),
  value: z.record(z.unknown()),
});

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = await createServerAdminClient();
    const { data, error } = await adminSupabase.from('vibe_brain_config').select('*').order('key');

    if (error) {
      console.error('[ADMIN] Failed to fetch config:', error);
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    return NextResponse.json({ configs: data });
  } catch (error) {
    console.error('[ADMIN] Config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { key, value } = parsed.data;

    const adminSupabase = await createServerAdminClient();
    const { data, error } = await adminSupabase
      .from('vibe_brain_config')
      .update({ value })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN] Failed to update config:', error);
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('[ADMIN] Config update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
