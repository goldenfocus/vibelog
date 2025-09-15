import { createServerAdminClient } from '@/lib/supabaseAdmin'

export type PutResult = { url: string; path: string }

export interface Storage {
  put(path: string, buf: Buffer, contentType: string): Promise<PutResult>
  publicUrl(path: string): string
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'vibelog-covers'

function publicUrl(path: string): string {
  // Use Supabase storage URL directly - it's fast, reliable, and globally distributed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  }
  return `/${path}`
}

function supabaseStorage(): Storage {
  return {
    async put(path, buf, contentType) {
      const supabase = await createServerAdminClient()
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
