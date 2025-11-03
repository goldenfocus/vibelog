# Voice Cloning Troubleshooting Guide

## Common Issues and Solutions

### 1. "Voice cloning not configured" Error

**Symptoms**: Error message says "ElevenLabs API key is not configured"

**Solution**:

- Check that `ELEVENLABS_API_KEY` is set in your `.env.local` file
- Verify the API key is valid and has voice cloning permissions
- Restart your development server after adding the environment variable

### 2. "Audio file too small" Error

**Symptoms**: Error message says audio file must be at least 1KB

**Solution**:

- Record at least 1KB of audio (minimum requirement)
- For best results, record at least 30 seconds (512KB) of clear speech
- Ensure your microphone is working and picking up audio

### 3. "Audio file too large" Error

**Symptoms**: Error message says audio file must be under 25MB

**Solution**:

- ElevenLabs has a 25MB limit for voice cloning
- Try recording a shorter segment (under 5 minutes typically fits)
- Check audio file format - some formats compress better than others

### 4. "Rate limit exceeded" Error

**Symptoms**: Error message about too many requests

**Solution**:

- Wait before trying again (rate limits reset periodically)
- Sign in to get higher rate limits (100/hour vs 10/day for anonymous)
- Check your ElevenLabs account usage limits

### 5. "Network error" or Connection Issues

**Symptoms**: Error connecting to voice cloning service

**Solution**:

- Check your internet connection
- Verify ElevenLabs API is accessible (not blocked by firewall)
- Try again after a few seconds (may be temporary API issue)

### 6. "No voice ID returned" Error

**Symptoms**: Cloning appears to succeed but no voice ID is returned

**Solution**:

- Check server logs for detailed error messages
- Verify ElevenLabs API response format hasn't changed
- Ensure API key has correct permissions
- Check ElevenLabs account status and credits

### 7. Voice Cloning Enabled But Not Working

**Symptoms**: Voice cloning toggle is on but cloning doesn't happen

**Possible Causes**:

- Audio file is too small (<512KB threshold)
- Voice cloning disabled in user settings
- API key not configured
- Network or API errors (check browser console)

**Solution**:

- Check browser console for detailed error messages
- Verify audio recording is substantial (>30 seconds recommended)
- Ensure voice cloning toggle is enabled in settings
- Check that `ELEVENLABS_API_KEY` is configured

## Debugging Steps

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Look for `[VOICE-CLONE]` prefixed log messages
   - Check for error messages with details

2. **Check Server Logs**
   - Look for `🎤 [VOICE-CLONE]` log messages
   - Check for error details and API responses
   - Verify API key is being read correctly

3. **Verify Audio File**
   - Check audio file size (should be >512KB for best results)
   - Verify audio format is supported (webm, wav, mp4, etc.)
   - Ensure audio contains clear speech (not just silence)

4. **Test API Connection**
   - Verify ElevenLabs API is accessible
   - Check API key validity
   - Test with a simple curl request if needed

## API Response Formats

The code now handles multiple possible response formats from ElevenLabs:

- `voice_id` (snake_case)
- `voiceId` (camelCase)
- `id` (alternative)

Error messages are extracted from:

- `error.message`
- `detail.message`
- `message`
- Raw response text

## Environment Variables

Required:

- `ELEVENLABS_API_KEY` - Your ElevenLabs API key

Optional (for better debugging):

- `NODE_ENV=development` - Enables detailed error logging

## Minimum Requirements

- **Audio Size**: Minimum 1KB, recommended 512KB+ (30+ seconds)
- **Audio Format**: webm, wav, mp4, ogg, etc.
- **Quality**: Clear speech, minimal background noise
- **Duration**: At least 30 seconds for good quality clones

## Contact Support

If issues persist:

1. Check browser console for detailed error messages
2. Check server logs for API responses
3. Verify ElevenLabs account status and API key
4. Test with a known-good audio file
5. Contact support with error details and logs
