import sharp from 'sharp'

export type CoverStyle =
  | 'cinematic'
  | 'editorial'
  | 'comic'
  | 'sci-fi'
  | 'watercolor'
  | 'painterly'

export function styleFromTone(tone?: string | null): { style: CoverStyle; label: string } {
  const t = (tone || '').toLowerCase()
  if (/(serious|analysis|analytical|expert|strategy|research)/.test(t)) return { style: 'editorial', label: 'minimalist editorial' }
  if (/(playful|fun|humor|casual)/.test(t)) return { style: 'comic', label: 'comic book / cartoon' }
  if (/(futuristic|tech|ai|cyber|neon|sci[- ]?fi|innovation)/.test(t)) return { style: 'sci-fi', label: 'neon sci‑fi / cyberpunk' }
  if (/(zen|calm|nature|mindful|outdoor|garden|forest|sea|mountain)/.test(t)) return { style: 'watercolor', label: 'watercolor / ink, soft gradients' }
  if (/(dark|moody|dramatic|chiaroscuro)/.test(t)) return { style: 'painterly', label: 'painterly chiaroscuro' }
  if (/(inspire|inspirational|hope|uplift|warm|story)/.test(t)) return { style: 'cinematic', label: 'cinematic, photo‑realistic, warm light' }
  return { style: 'cinematic', label: 'cinematic, photo‑realistic, warm light' }
}

export function buildImagePrompt(title: string, summary: string | undefined, tone: string | undefined) {
  const { label } = styleFromTone(tone)
  return (
    `Cover art for a blog post titled "${title}".\n` +
    `Vibe: ${tone || 'default'}. Visual style: ${label}.\n` +
    `Create a striking, shareable composition suitable for social previews.\n` +
    `High contrast, clear subject, strong focal point, depth, and pleasing color harmony.\n` +
    `No text or logos inside the image. No watermarks.\n` +
    `If the topic is abstract, use symbolic visual metaphors — avoid clutter.\n` +
    `Family-safe, copyright-safe.`
  )
}

export function buildAltText(title: string, styleLabel: string, summary?: string): string {
  // Simple, ≤140 chars, no emojis
  const base = summary ? `${summary.split(/[.!?]/)[0]}` : title
  let alt = `${base} — ${styleLabel} cover image`
  if (alt.length > 140) alt = alt.slice(0, 137) + '…'
  return alt
}

export function buildXmp({ title, description, creator = 'VibeLog.io', keywords = [] as string[] }) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const kw = keywords.map(k => `<rdf:li>${esc(k)}</rdf:li>`).join('')
  const xmp = `<?xpacket begin=\"﻿\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>\n` +
  `<x:xmpmeta xmlns:x=\"adobe:ns:meta/\">\n` +
  ` <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n` +
  `  <rdf:Description rdf:about=\"\">\n` +
  `   <dc:title><rdf:Alt><rdf:li xml:lang=\"x-default\">${esc(title)}</rdf:li></rdf:Alt></dc:title>\n` +
  `   <dc:description><rdf:Alt><rdf:li xml:lang=\"x-default\">${esc(description || '')}</rdf:li></rdf:Alt></dc:description>\n` +
  `   <dc:creator><rdf:Seq><rdf:li>${esc(creator)}</rdf:li></rdf:Seq></dc:creator>\n` +
  `   <dc:subject><rdf:Bag>${kw}</rdf:Bag></dc:subject>\n` +
  `  </rdf:Description>\n` +
  ` </rdf:RDF>\n` +
  `</x:xmpmeta>\n` +
  `<?xpacket end=\"w\"?>`
  return Buffer.from(xmp)
}

export async function watermarkAndResize(params: {
  image: Buffer
  username?: string
  width?: number
  height?: number
  title: string
  description?: string
  keywords?: string[]
}): Promise<{ buffer: Buffer; width: number; height: number }>
{
  const width = params.width ?? 1200
  const height = params.height ?? 630
  const username = params.username || 'anonymous'

  const base = sharp(params.image).resize(width, height, { fit: 'cover' })

  const xmp = buildXmp({ title: params.title, description: params.description, keywords: params.keywords ?? [] })

  // WATERMARKS DISABLED - Focus on core functionality first
  console.log('🚫 [WATERMARK] Watermarks disabled - returning clean image')

  const out = await base
    .withMetadata({ xmp } as any)
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true })

  return { buffer: out.data, width, height }
}

