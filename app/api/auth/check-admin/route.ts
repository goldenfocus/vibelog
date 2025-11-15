/**
 * Check Admin Status API
 * Returns whether the current user has admin privileges
 */

import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isAdmin: false });
    }

    const adminStatus = await isAdmin(user.id);

    return NextResponse.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error('[Check Admin API] Error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
