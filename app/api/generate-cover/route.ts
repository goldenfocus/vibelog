import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import crypto from 'crypto'
import { storage } from '@/lib/storage'
import { styleFromTone, buildImagePrompt, buildAltText, watermarkAndResize } from '@/lib/image'

export const runtime = 'nodejs'

type Body = {
  title: string
  summary?: string
  tone?: string
  username?: string
  tags?: string[]
  postId?: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body
    const title = (body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const { style, label } = styleFromTone(body.tone)
    const prompt = buildImagePrompt(title, body.summary, body.tone)

    // If OpenAI is not configured, return a placeholder
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key' || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      const alt = buildAltText(title, label, body.summary)
      return NextResponse.json({
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt,
        style,
        prompt,
        success: true
      })
    }

    let raw: Buffer
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const img = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      })
      const b64 = img.data?.[0]?.b64_json
      if (!b64) throw new Error('Image generation returned empty data')
      raw = Buffer.from(b64, 'base64')
    } catch (err) {
      console.error('OpenAI image generation error:', err)
      const alt = buildAltText(title, label, body.summary)
      return NextResponse.json({ url: '/og-image.png', width: 1200, height: 630, alt, style, prompt, success: true })
    }

    const { buffer, width, height } = await watermarkAndResize({
      image: raw,
      username: body.username,
      width: 1200,
      height: 630,
      title,
      description: body.summary,
      keywords: body.tags || [],
    })

    const hash = crypto.createHash('sha1').update(title + (body.summary || '')).digest('hex').slice(0, 10)
    const dir = body.postId ? `posts/${body.postId}` : `covers`
    const key = `${dir}/${slugify(title)}-${hash}-1200x630.jpg`

    let url = `/og-image.png`
    try {
      const uploaded = await storage.put(key, buffer, 'image/jpeg')
      url = uploaded?.url || url
    } catch (err) {
      console.error('Storage upload error:', err)
    }
    const alt = buildAltText(title, label, body.summary)

    return NextResponse.json({ url, path: key, width, height, alt, style, prompt, success: true })
  } catch (e) {
    console.error('generate-cover unexpected error', e)
    // Soft-fail with placeholder for better UX during MVP
    return NextResponse.json({ url: '/og-image.png', width: 1200, height: 630, alt: 'Cover image', style: 'cinematic', prompt: 'fallback', success: true })
  }
}
