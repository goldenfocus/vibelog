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

  // Watermark SVG (≤3% height) - fixed positioning
  const fontSize = Math.round(height * 0.035)
  const margin = Math.max(16, Math.round(height * 0.025))
  const text = `Created on vibelog.io/${username}`

  // Calculate actual text width for better positioning
  const estimatedTextWidth = text.length * fontSize * 0.55
  const watermarkWidth = Math.min(estimatedTextWidth + 32, width - 32)
  const watermarkHeight = fontSize + 16

  // Create a smaller, properly sized SVG overlay
  const svg = Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${watermarkWidth}' height='${watermarkHeight}' viewBox='0 0 ${watermarkWidth} ${watermarkHeight}'>
      <defs>
        <filter id='shadow' x='-50%' y='-50%' width='200%' height='200%'>
          <feDropShadow dx='1' dy='1' stdDeviation='3' flood-color='rgba(0,0,0,0.8)'/>
        </filter>
        <linearGradient id='metallic' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' style='stop-color:#e6f3ff;stop-opacity:1' />
          <stop offset='50%' style='stop-color:#4a90e2;stop-opacity:1' />
          <stop offset='100%' style='stop-color:#2c5aa0;stop-opacity:1' />
        </linearGradient>
      </defs>
      <rect x='2' y='2' width='${watermarkWidth - 4}' height='${watermarkHeight - 4}' rx='6' fill='rgba(0,0,0,0.6)' />
      <text x='${watermarkWidth / 2}' y='${watermarkHeight / 2 + fontSize / 3}' text-anchor='middle' font-family='Inter,system-ui,Segoe UI,Roboto,sans-serif' font-size='${fontSize}' font-weight='600' fill='url(#metallic)' filter='url(#shadow)'>${text}</text>
    </svg>`
  )

  const xmp = buildXmp({ title: params.title, description: params.description, keywords: params.keywords ?? [] })
  const out = await base
    .composite([{
      input: svg,
      left: width - watermarkWidth - margin,
      top: height - watermarkHeight - margin
    }])
    .withMetadata({ xmp } as any)
    .jpeg({ quality: 92 })
    .toBuffer({ resolveWithObject: true })

  return { buffer: out.data, width, height }
}

