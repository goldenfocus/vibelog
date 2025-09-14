import { NextResponse } from 'next/server'
import { createServerAdminClient } from '@/lib/supabaseAdmin'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'covers'

function contentTypeFor(path: string) {
  const p = path.toLowerCase()
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  if (p.endsWith('.png')) return 'image/png'
  if (p.endsWith('.webp')) return 'image/webp'
  if (p.endsWith('.gif')) return 'image/gif'
  if (p.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  context: any
) {
  try {
    const params = (context && context.params) ? context.params as { path: string[] } : { path: [] as string[] }
    const key = (params.path || []).join('/')
    if (!key) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    const supabase = await createServerAdminClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(key)
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const ab = await data.arrayBuffer()
    const buf = Buffer.from(ab)
    return new NextResponse(buf, {
      headers: {
        'content-type': contentTypeFor(key),
        // Cache aggressively at the edge/CDN; filenames are content-addressed by our hash
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    console.error('cdn proxy error', e)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
