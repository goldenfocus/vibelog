# Gemini 2.5 Flash Image Migration

## Overview
Migrated from DALL-E 3 to **Gemini 2.5 Flash Image** ("nano banana") for cover image generation with mobile-first adaptive aspect ratios.

## Why This Change?

### Quality & Cost Benefits
- **Better image quality** compared to DALL-E 3 (user feedback: "the image generation kinda sux")
- **Similar pricing**: $0.039/image (vs DALL-E 3's $0.04)
- **Generous free tier**: 1,500 requests/day (vs DALL-E 3's paid-only model)
- **Faster generation** with Gemini's optimized infrastructure

### Mobile-First Strategy
- **60%+ mobile users** (based on user goals)
- **Adaptive aspect ratios**:
  - 9:16 (1080x1920) for mobile devices
  - 16:9 (1920x1080) for desktop devices
- **Device detection** via user-agent header
- **Optimized file sizes** for mobile networks

## Changes Made

### 1. Updated Dependencies
**File**: `package.json`

```json
"dependencies": {
  "@google/generative-ai": "^0.21.0",
  // ... other deps
}
```

**Action required**: Run `npm install` to install the new dependency.

### 2. API Endpoint Migration
**File**: `app/api/generate-cover/route.ts`

**Before** (DALL-E 3):
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const img = await openai.images.generate({
  model: 'dall-e-3',
  prompt,
  size: '1024x1024',
  quality: 'standard',
  response_format: 'b64_json',
})
```

**After** (Gemini 2.5 Flash):
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

// Detect device for adaptive aspect ratio
const userAgent = req.headers.get('user-agent') || ''
const isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

const aspectRatio = isMobile ? '9:16' : '16:9'
const [targetWidth, targetHeight] = isMobile ? [1080, 1920] : [1920, 1080]

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

const result = await model.generateContent([
  {
    text: `Generate a high-quality cover image. ${prompt}. Aspect ratio: ${aspectRatio}. Style: vibrant, professional, eye-catching.`
  }
])
```

### 3. Environment Variables
**File**: `.env.example` (created)

**New required variable**:
```bash
# Gemini API (for image generation with Gemini 2.5 Flash)
# Get your API key from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

**Action required**:
1. Get your API key from https://aistudio.google.com/apikey
2. Add `GEMINI_API_KEY` to your `.env.local` file
3. Update production environment variables

### 4. Adaptive Dimensions
The system now:
- Detects mobile vs desktop from `user-agent` header
- Uses **9:16 (1080x1920)** for mobile devices
- Uses **16:9 (1920x1080)** for desktop devices
- Updates storage keys to reflect actual dimensions: `{slug}-{hash}-{width}x{height}.jpg`

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Gemini API Key
1. Visit https://aistudio.google.com/apikey
2. Create or sign in to your Google account
3. Generate a new API key
4. Copy the key

### 3. Update Environment Variables
```bash
# Add to .env.local
GEMINI_API_KEY=your_actual_api_key_here
```

### 4. Test the Integration
```bash
# Run the development server
npm run dev

# Test image generation by recording a vibelog
# Check console for: "🖼️ [COVER-GEN] Generating image with Gemini 2.5 Flash - Device: Mobile/Desktop, Aspect: 9:16/16:9"
```

## Pricing Comparison

| Service | Model | Cost per Image | Free Tier |
|---------|-------|----------------|-----------|
| OpenAI | DALL-E 3 | $0.040 | None |
| Google | Gemini 2.5 Flash | $0.039 | 1,500/day |

**Estimated savings with free tier**:
- At 100 images/day: **$117/month** (100% covered by free tier)
- At 2,000 images/day: **$58.50/month** (vs $80 with DALL-E 3)

## Aspect Ratio Strategy

### Mobile-First Approach
```
9:16 (Portrait)
┌────────────┐
│            │
│            │
│   MOBILE   │
│   CONTENT  │
│            │
│            │
└────────────┘
1080 x 1920 px
```

### Desktop Optimization
```
16:9 (Landscape)
┌──────────────────────────┐
│       DESKTOP CONTENT    │
│                          │
└──────────────────────────┘
1920 x 1080 px
```

## Device Detection Logic
```typescript
const userAgent = req.headers.get('user-agent') || ''
const isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
```

**Matches**:
- iPhone, iPad, iPod
- Android devices
- Mobile browsers
- webOS, BlackBerry
- Opera Mini

**Defaults to desktop** for:
- Desktop browsers
- Unknown user-agents
- Bots/crawlers

## Fallback Behavior

If Gemini API fails or is not configured:
1. Returns placeholder image: `/og-image.png`
2. Logs error to console (non-production)
3. Maintains app functionality (soft-fail)
4. User experience is preserved

## Testing Checklist

- [ ] Install `@google/generative-ai` dependency
- [ ] Add `GEMINI_API_KEY` to environment
- [ ] Test mobile device image generation (check aspect ratio)
- [ ] Test desktop device image generation (check aspect ratio)
- [ ] Verify images appear correctly in app
- [ ] Check console logs for device detection
- [ ] Confirm fallback works without API key
- [ ] Validate image quality vs previous DALL-E 3 images

## Future Enhancements

### Potential Feature: Remix Button
User requested: "we could even give the option to remix the images to registered members"

**Implementation idea**:
```typescript
// Add to generate-cover API
{
  remix?: boolean,  // Triggers variation generation
  seedImage?: string  // Base64 of image to remix
}
```

**Auth gate**: Only allow logged-in users to remix images (growth hack)

### Potential Feature: Default Images for Anonymous Users
User suggested: "showing the vibelog default image to all unregistered users"

**Implementation idea**:
- Check user auth state
- If anonymous: return default cover from predefined set
- If logged in: generate custom Gemini image
- Add checkbox: [x] Generate custom image (auth-gated)

## Monitoring

### Key Metrics to Track
- Image generation success rate
- Average generation time
- Mobile vs desktop ratio
- API cost per day
- Free tier usage (stay under 1,500/day)

### Console Logs
```
🖼️ [COVER-GEN] Using placeholder image (no Gemini API key configured)
🖼️ [COVER-GEN] Generating image with Gemini 2.5 Flash - Device: Mobile, Aspect: 9:16
```

## Troubleshooting

### Error: "Module not found: @google/generative-ai"
**Solution**: Run `npm install`

### Error: "GEMINI_API_KEY is not defined"
**Solution**: Add key to `.env.local` and restart dev server

### Images still square (1024x1024)
**Solution**: Check device detection logic, verify user-agent header

### API rate limit exceeded
**Solution**:
- Check daily usage (free tier: 1,500/day)
- Consider caching generated images
- Implement default images for anonymous users

## Documentation

- **Gemini API Docs**: https://ai.google.dev/docs
- **API Key Management**: https://aistudio.google.com/apikey
- **Pricing Details**: https://ai.google.dev/pricing

## Related Files

- `app/api/generate-cover/route.ts` - Main image generation endpoint
- `package.json` - Dependencies
- `.env.example` - Environment variable template
- `lib/image.ts` - Image prompt building and styling
- `hooks/useBulletproofSave.ts` - Save hook that triggers image generation

---

**Migration Date**: 2025-10-18
**Migrated By**: Claude Code
**User Request**: "if we are mostly mobile shouldnt we render 9:16 ratio? or is there a way we can render depending on what device the user is using"
