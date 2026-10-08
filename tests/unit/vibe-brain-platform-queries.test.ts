import { describe, it, expect, vi, beforeEach } from 'vitest';

type Op = [string, ...unknown[]];
type Result = { data: unknown; error: unknown };

const db = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; ops: Op[] }>,
  results: {} as Record<string, Result>,
}));

// Minimal chainable stand-in for the Supabase query builder: records each call
// and resolves to the canned result for the table (or an error for unknown tables).
vi.mock('@/lib/supabaseAdmin', () => ({
  createServerAdminClient: async () => ({
    from: (table: string) => {
      const entry = { table, ops: [] as Op[] };
      db.calls.push(entry);
      const builder: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'in', 'order', 'limit']) {
        builder[op] = (...args: unknown[]) => {
          entry.ops.push([op, ...args]);
          return builder;
        };
      }
      builder.then = (resolve: (r: Result) => unknown) =>
        resolve(
          db.results[table] ?? {
            data: null,
            error: { message: `relation "${table}" does not exist` },
          }
        );
      return builder;
    },
  }),
}));

import { getTrendingVibelogs } from '@/lib/vibe-brain/platform-queries';

describe('getTrendingVibelogs', () => {
  beforeEach(() => {
    db.calls.length = 0;
    db.results = {
      vibelogs: {
        data: [
          {
            id: 'v1',
            title: 'One',
            teaser: null,
            created_at: '2026-01-01',
            user_id: 'u1',
            profiles: [{ username: 'yan' }],
          },
          {
            id: 'v2',
            title: 'Two',
            teaser: null,
            created_at: '2026-01-02',
            user_id: 'u1',
            profiles: [{ username: 'yan' }],
          },
        ],
        error: null,
      },
      reactions: {
        data: [{ reactable_id: 'v1' }, { reactable_id: 'v1' }, { reactable_id: 'v2' }],
        error: null,
      },
    };
  });

  it('counts reactions from the polymorphic reactions table, scoped to vibelogs', async () => {
    const result = await getTrendingVibelogs(2);

    expect(result.map(v => [v.id, v.reactionCount])).toEqual([
      ['v1', 2],
      ['v2', 1],
    ]);

    const reactionsCall = db.calls.find(c => c.table === 'reactions');
    expect(reactionsCall?.ops).toContainEqual(['eq', 'reactable_type', 'vibelog']);
    expect(reactionsCall?.ops).toContainEqual(['in', 'reactable_id', ['v1', 'v2']]);
  });
});
