import { NextRequest, NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createServerAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');

    const adminSupabase = await createServerAdminClient();

    let query = adminSupabase
      .from('user_memories')
      .select(
        `
        id,
        user_id,
        fact,
        category,
        importance,
        created_at,
        expires_at
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[ADMIN] Failed to fetch memories:', error);
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
    }

    // Get unique categories for filtering
    const { data: categories } = await adminSupabase
      .from('user_memories')
      .select('category')
      .limit(100);

    const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])];

    return NextResponse.json({
      memories: data,
      total: count,
      categories: uniqueCategories,
    });
  } catch (error) {
    console.error('[ADMIN] Memories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('id');

    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });
    }

    const adminSupabase = await createServerAdminClient();
    const { error } = await adminSupabase.from('user_memories').delete().eq('id', memoryId);

    if (error) {
      console.error('[ADMIN] Failed to delete memory:', error);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Memory delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
