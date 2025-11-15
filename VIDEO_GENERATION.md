# Video Generation Feature

AI-powered video generation for vibelogs using Google Veo 3.1 via fal.ai

## ✨ Features

- **Text-to-Video**: Generate videos from vibelog content
- **Image-to-Video**: Use cover images to guide video generation
- **Automatic Storage**: Videos stored in Supabase Storage
- **Status Tracking**: Real-time generation status with error handling
- **User-Friendly UI**: Simple "Generate AI Video" button

## 🚀 Quick Start

1. **Create a vibelog** (or open an existing one you own)
2. **Click "Generate AI Video"** button
3. **Wait 1-2 minutes** for generation
4. **Video appears automatically** when ready

## 📁 Architecture

### Database Schema
```sql
-- vibelogs table additions
video_url                 TEXT
video_duration            INTEGER
video_width               INTEGER
video_height              INTEGER
video_generation_status   TEXT (pending/generating/completed/failed)
video_generation_error    TEXT
video_generated_at        TIMESTAMPTZ
```

### File Structure
```
lib/video/
  ├── generator.ts    # fal.ai video generation
  ├── storage.ts      # Supabase Storage upload
  ├── types.ts        # TypeScript interfaces
  └── index.ts        # Exports

app/api/video/
  ├── generate/route.ts  # POST /api/video/generate
  └── status/route.ts    # GET /api/video/status

components/video/
  ├── VideoPlayer.tsx     # HTML5 video player
  ├── VideoGenerator.tsx  # Generation UI with status
  └── index.ts            # Exports
```

### Updated Components
- `VibelogCard.tsx` - Shows video in feed
- `PublicVibelogContent.tsx` - Full video view

## 🔑 Environment Variables

```bash
# fal.ai API (for video generation with Google Veo 3.1)
FAL_API_KEY=your_fal_api_key_here
```

Get your API key from: https://fal.ai/dashboard/keys

## 💰 Cost Breakdown

- **Provider**: fal.ai
- **Model**: Google Veo 3.1 Fast
- **Price**: ~$0.10/second
- **8-second video**: ~$0.80
- **Comparison**: 75% cheaper than direct Google API ($3.20)

## 🎯 How It Works

1. User clicks "Generate AI Video" on their vibelog
2. `POST /api/video/generate` endpoint triggered
3. Request sent to fal.ai with:
   - Text prompt (vibelog content/teaser)
   - Cover image (optional)
   - Aspect ratio (16:9 default)
4. fal.ai queues video generation (Google Veo 3.1)
5. Backend polls for completion (~1-2 minutes)
6. Generated video downloaded from fal.ai
7. Video uploaded to Supabase Storage
8. Database updated with video URL and metadata
9. UI refreshes to show video

## 🔒 Security

- **Authorization**: Only vibelog author can generate videos
- **API Key**: Stored server-side only (never exposed to client)
- **Rate Limiting**: Prevents duplicate generation attempts
- **Error Handling**: Graceful fallbacks with user-friendly messages

## 🐛 Troubleshooting

### Video Generation Failed
- Check `video_generation_error` column in database
- Verify FAL_API_KEY is set correctly
- Ensure Supabase Storage bucket exists (`vibelog-assets`)
- Check API logs for detailed error messages

### Video Not Appearing
- Refresh the page
- Check `video_generation_status` is 'completed'
- Verify `video_url` is not null
- Check browser console for errors

### Generation Stuck
- Maximum wait time: 2 minutes
- If stuck longer, status will be 'failed'
- Check fal.ai dashboard for quota/limits
- Retry generation after fixing issues

## 📊 Database Queries

```sql
-- Check video generation status
SELECT id, title, video_generation_status, video_generation_error
FROM vibelogs
WHERE video_generation_status IS NOT NULL;

-- Count generated videos
SELECT COUNT(*) FROM vibelogs WHERE video_url IS NOT NULL;

-- Find failed generations
SELECT id, title, video_generation_error
FROM vibelogs
WHERE video_generation_status = 'failed';
```

## 🔄 API Endpoints

### Generate Video
```bash
POST /api/video/generate
Content-Type: application/json

{
  "vibelogId": "uuid",
  "prompt": "optional custom prompt",
  "imageUrl": "optional image URL",
  "aspectRatio": "16:9" | "9:16"
}
```

### Check Status
```bash
GET /api/video/status?vibelogId=uuid
```

## 🎨 UI Components

### VideoPlayer
```tsx
<VideoPlayer
  videoUrl={vibelog.video_url}
  autoPlay={false}
  muted={false}
  loop={false}
/>
```

### VideoGenerator
```tsx
<VideoGenerator
  vibelogId={vibelog.id}
  onVideoGenerated={(url) => console.log('Video ready:', url)}
/>
```

## 📝 Future Enhancements

- [ ] Video editing (trim, crop, filters)
- [ ] Multiple video styles (cinematic, energetic, calm)
- [ ] Video thumbnails/previews
- [ ] Batch video generation
- [ ] Video analytics (views, completion rate)
- [ ] Social media sharing optimizations
- [ ] Vibe-influenced video generation (use vibe scores to adjust style)

## 🤝 Credits

- **Video Generation**: Google Veo 3.1 (via fal.ai)
- **Storage**: Supabase Storage
- **Implementation**: Vibelog Team

---

**Built with ❤️ for Vibelog**
