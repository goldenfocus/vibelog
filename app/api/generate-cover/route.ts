import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { styleFromTone, buildImagePrompt, buildAltText, watermarkAndResize } from '@/lib/image';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';

type Body = {
  title: string;
  summary?: string;
  tone?: string;
  username?: string;
  tags?: string[];
  postId?: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const title = (body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    const { style, label } = styleFromTone(body.tone);
    const prompt = buildImagePrompt(title, body.summary, body.tone);

    // Detect device from user-agent for adaptive aspect ratio (mobile-first)
    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );

    // DALL-E 3 only supports 1024x1024, 1024x1792, 1792x1024
    const dalleSize = isMobile ? '1024x1792' : '1792x1024'; // Portrait for mobile, landscape for desktop
    const [targetWidth, targetHeight] = isMobile ? [1080, 1920] : [1920, 1080];

    console.log(
      `🖼️ [COVER-GEN] Generating image with DALL-E 3 - Device: ${isMobile ? 'Mobile' : 'Desktop'}, Size: ${dalleSize}`
    );

    // Generate image with DALL-E 3 (try first)
    let raw: Buffer | null = null;
    let generationSource = 'unknown';

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const img = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size: dalleSize,
        quality: 'standard',
        response_format: 'b64_json',
      });

      const b64 = img.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error('DALL-E 3 returned empty data');
      }
      raw = Buffer.from(b64, 'base64');
      generationSource = 'dall-e-3';

      console.log('✅ Image generated successfully with DALL-E 3');
    } catch (dalleErr) {
      console.error('❌ DALL-E 3 generation error:', dalleErr);

      // Fallback to Stability AI (more permissive content policy)
      if (process.env.STABILITY_API_KEY) {
        try {
          console.log('🔄 Falling back to Stability AI...');

          // Stability AI uses different dimensions - use 1024x1024 and we'll resize
          const stabilityResponse = await fetch(
            'https://api.stability.ai/v2beta/stable-image/generate/sd3',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                Accept: 'image/*',
              },
              body: (() => {
                const formData = new FormData();
                formData.append('prompt', prompt);
                formData.append('output_format', 'jpeg');
                formData.append('aspect_ratio', isMobile ? '9:16' : '16:9');
                formData.append('model', 'sd3-large-turbo'); // Fast and cheap
                return formData;
              })(),
            }
          );

          if (!stabilityResponse.ok) {
            const errorText = await stabilityResponse.text();
            throw new Error(`Stability AI error: ${stabilityResponse.status} ${errorText}`);
          }

          const arrayBuffer = await stabilityResponse.arrayBuffer();
          raw = Buffer.from(arrayBuffer);
          generationSource = 'stability-ai';

          console.log('✅ Image generated successfully with Stability AI');
        } catch (stabilityErr) {
          console.error('❌ Stability AI generation error:', stabilityErr);
          // Final fallback to placeholder
          raw = null;
        }
      }

      // If both failed, return placeholder
      if (!raw) {
        console.warn('⚠️ All image generation methods failed, using placeholder');
        const alt = buildAltText(title, label, body.summary);
        return NextResponse.json({
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt,
          style,
          prompt,
          success: true,
          source: 'placeholder',
        });
      }
    }

    const { buffer, width, height } = await watermarkAndResize({
      image: raw,
      username: body.username,
      width: targetWidth,
      height: targetHeight,
      title,
      description: body.summary,
      keywords: body.tags || [],
    });

    const hash = crypto
      .createHash('sha1')
      .update(title + (body.summary || ''))
      .digest('hex')
      .slice(0, 10);
    const dir = body.postId ? `posts/${body.postId}` : `covers`;
    const key = `${dir}/${slugify(title)}-${hash}-${targetWidth}x${targetHeight}.jpg`;

    let url = `/og-image.png`;
    try {
      const uploaded = await storage.put(key, buffer, 'image/jpeg');
      url = uploaded?.url || url;
    } catch (err) {
      console.error('Storage upload error:', err);
    }
    const alt = buildAltText(title, label, body.summary);

    return NextResponse.json({
      url,
      path: key,
      width,
      height,
      alt,
      style,
      prompt,
      success: true,
      source: generationSource, // Track which AI generated the image
    });
  } catch (e) {
    console.error('generate-cover unexpected error', e);
    // Soft-fail with placeholder for better UX during MVP
    return NextResponse.json({
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Cover image',
      style: 'cinematic',
      prompt: 'fallback',
      success: true,
      source: 'error-fallback',
    });
  }
}
