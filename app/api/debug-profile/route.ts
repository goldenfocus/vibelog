import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username parameter required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, display_name, is_public, total_vibelogs')
    .eq('username', username)
    .single();

  return NextResponse.json({
    found: !!profile,
    profile: profile || null,
    error: error?.message || null,
  });
}
