import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createServerAdminClient } from '@/lib/supabaseAdmin'

type WindowUnit = 's' | 'm' | 'h'

export type RateLimitOptions = {
  limit: number
  window: `${number} ${WindowUnit}`
}

export type RateLimitResult = {
  success: boolean
  remaining?: number
  reset?: number
  limit?: number
}

// Simple in-memory fallback limiter for dev/local or if Supabase is unreachable
const memoryStore = new Map<string, { count: number; resetAt: number; limit: number; windowMs: number }>()

function parseWindowToMs(window: `${number} ${WindowUnit}`): number {
  const [numStr, unit] = window.split(' ') as [string, WindowUnit]
  const n = parseInt(numStr, 10)
  switch (unit) {
    case 's':
      return n * 1000
    case 'm':
      return n * 60 * 1000
    case 'h':
      return n * 60 * 60 * 1000
  }
}

function getIP(req: NextRequest): string {
  // NextRequest in Next 15 doesn't expose req.ip; use headers
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  if (!fwd) return 'unknown'
  // First IP in the list
  return fwd.split(',')[0].trim() || 'unknown'
}

/**
 * Rate limit by actor (userId if provided; otherwise IP).
 * Stores the actor string in the `ip` column to avoid a schema change.
 */
export async function rateLimit(
  req: NextRequest,
  key: string,
  opts: RateLimitOptions,
  actorOverride?: string,
): Promise<RateLimitResult> {
  const actor = actorOverride || getIP(req)
  const id = `${key}:${actor}`
  const windowMs = parseWindowToMs(opts.window)
  const windowSeconds = Math.ceil(windowMs / 1000)
  const now = Date.now()

  try {
    const supabase = await createServerAdminClient()

    // Fetch existing counter
    const { data: row, error: selErr } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('key', key)
      .eq('ip', actor)
      .maybeSingle()

    if (selErr) {
      throw selErr
    }

    const resetAt = (ms: number) => new Date(ms).toISOString()
    const newResetISO = resetAt(now + windowMs)

    if (!row) {
      // First request in window: insert row
      const { data: inserted, error: insErr } = await supabase
        .from('rate_limits')
        .insert({ key, ip: actor, window_seconds: windowSeconds, count: 1, reset_at: newResetISO })
        .select('count, reset_at')
        .single()

      if (insErr) throw insErr

      return {
        success: true,
        remaining: Math.max(0, opts.limit - inserted.count),
        reset: new Date(inserted.reset_at as unknown as string).getTime(),
        limit: opts.limit,
      }
    }

    const currentReset = new Date(row.reset_at as unknown as string).getTime()
    let nextCount = 1
    let nextResetISO = newResetISO

    if (currentReset > now) {
      // Still within window, increment count
      nextCount = (row.count as unknown as number) + 1
      nextResetISO = resetAt(currentReset)
    }

    const { data: updated, error: updErr } = await supabase
      .from('rate_limits')
      .update({ count: nextCount, window_seconds: windowSeconds, reset_at: nextResetISO })
      .eq('key', key)
      .eq('ip', actor)
      .select('count, reset_at')
      .single()

    if (updErr) throw updErr

    const allowed = nextCount <= opts.limit
    return {
      success: allowed,
      remaining: Math.max(0, opts.limit - updated.count),
      reset: new Date(updated.reset_at as unknown as string).getTime(),
      limit: opts.limit,
    }
  } catch (e) {
    // Fallback to memory store if Supabase fails or is not configured
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase rate limiter error, using memory fallback:', (e as Error).message)
    }
    const entry = memoryStore.get(id)
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs
      memoryStore.set(id, { count: 1, resetAt, limit: opts.limit, windowMs })
      return { success: true, remaining: opts.limit - 1, reset: resetAt, limit: opts.limit }
    }
    entry.count += 1
    const success = entry.count <= entry.limit
    return { success, remaining: Math.max(0, entry.limit - entry.count), reset: entry.resetAt, limit: entry.limit }
  }
}

export function tooManyResponse(info?: RateLimitResult) {
  const headers: Record<string, string> = {}
  if (info) {
    const now = Date.now()
    const retrySeconds = info.reset ? Math.max(0, Math.ceil((info.reset - now) / 1000)) : undefined
    if (retrySeconds !== undefined) headers['Retry-After'] = String(retrySeconds)
    if (info.limit !== undefined) headers['X-RateLimit-Limit'] = String(info.limit)
    if (info.remaining !== undefined) headers['X-RateLimit-Remaining'] = String(info.remaining)
    if (info.reset !== undefined) headers['X-RateLimit-Reset'] = String(Math.ceil(info.reset / 1000))
  }

  return NextResponse.json(
    {
      error: 'Too Many Requests',
      ...(info ? { limit: info.limit, remaining: info.remaining, reset: info.reset } : {}),
    },
    { status: 429, headers },
  )
}
