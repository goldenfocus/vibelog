import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

/**
 * GET /api/admin/check
 *
 * Check if the current user is an admin
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const adminSupabase = await createServerAdminClient();
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      isAdmin: profile?.is_admin === true,
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
