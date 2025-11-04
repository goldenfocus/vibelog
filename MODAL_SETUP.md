# Modal.com Setup for VibeLog Voice Cloning

## Quick Setup (5 minutes)

### 1. Install Modal CLI

```bash
pip install modal
```

### 2. Authenticate with Modal

```bash
modal token new
```

This will open a browser window. Sign in with GitHub or Google.

### 3. Deploy the TTS Service

```bash
cd /Users/vibeyang/vibelog
modal deploy modal_tts.py
```

This will:

- Build the Docker image with Coqui TTS
- Download the XTTS v2 model (~1.8GB)
- Deploy to Modal's infrastructure
- Give you a webhook URL

### 4. Get Your API URL

After deployment, Modal will show you the endpoint URL:

```
✓ Created web function tts_endpoint => https://yourname--vibelog-tts-tts-endpoint.modal.run
✓ Created web function health => https://yourname--vibelog-tts-health.modal.run
```

Copy the `tts_endpoint` URL!

### 5. Add to .env.local

```bash
# Add these to your .env.local
MODAL_TTS_ENDPOINT=https://yourname--vibelog-tts-tts-endpoint.modal.run
MODAL_ENABLED=true
```

### 6. Test It

```bash
curl -X POST https://yourname--vibelog-tts-tts-endpoint.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of voice cloning!",
    "voiceAudio": "base64_encoded_audio_here",
    "language": "en"
  }'
```

## Cost Estimation

Modal charges for:

- **GPU time**: ~$0.0005/second (T4 GPU)
- **Cold starts**: Free (included)
- **Storage**: Free for model cache

**Example costs:**

- 1 second of audio generation: ~$0.0005
- 1000 audio clips (avg 3 seconds each): ~$1.50
- **Monthly (10,000 clips)**: ~$15

Compare to ElevenLabs: $600/month → **97% savings!**

## Monitoring

View logs and metrics:

```bash
modal app logs vibelog-tts
```

Or visit: https://modal.com/apps

## Updating the Service

To update after code changes:

```bash
modal deploy modal_tts.py
```

## Development Mode

For testing locally with Modal:

```bash
modal serve modal_tts.py
```

This creates a temporary endpoint you can use for development.

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Polish (pl)
- Turkish (tr)
- Russian (ru)
- Dutch (nl)
- Czech (cs)
- Arabic (ar)
- Chinese (zh-cn)
- Japanese (ja)
- Hungarian (hu)
- Korean (ko)
- Hindi (hi)

## Troubleshooting

### "ModuleNotFoundError: No module named 'TTS'"

The model is downloading. Wait a few seconds and try again.

### "CUDA out of memory"

Reduce the text length or upgrade to A10G GPU in modal_tts.py:

```python
@app.function(gpu="A10G", ...)
```

### Slow cold starts

First request after idle takes ~5-10 seconds. Subsequent requests are fast (<2s).
Increase `container_idle_timeout` to keep container warm longer.

## Next Steps

Once deployed, update your Next.js API route to use Modal instead of ElevenLabs!
