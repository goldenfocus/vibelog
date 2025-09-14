import { createServerAdminClient } from '@/lib/supabaseAdmin'
import { createClient } from '@supabase/supabase-js'

export type PutResult = { url: string; path: string }

export interface Storage {
  put(path: string, buf: Buffer, contentType: string): Promise<PutResult>
  publicUrl(path: string): string
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'covers'
const CDN_BASE_URL = (process.env.CDN_BASE_URL || '').replace(/\/$/, '') || ''

function publicUrl(path: string): string {
  if (CDN_BASE_URL) return `${CDN_BASE_URL}/${path}`

  // Use direct Supabase storage URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
  }

  // Fallback to local path
  return `/${path}`
}

async function ensureBucket(supabase: any, bucket: string) {
  try {
    const { data, error } = await supabase.storage.getBucket(bucket)
    if (error || !data) {
      await supabase.storage.createBucket(bucket, {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 10485760, // 10MB
      })
    }
  } catch (_) {
    // ignore
  }
}

function supabaseStorage(): Storage {
  return {
    async put(path, buf, contentType) {
      // Use direct service role client to bypass RLS issues
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      await ensureBucket(supabase, BUCKET)

      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType,
        upsert: true,
      })

      if (error) throw error
      return { url: publicUrl(path), path }
    },
    publicUrl,
  }
}

export const storage: Storage = supabaseStorage()
export { publicUrl }
