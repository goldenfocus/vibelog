"""
VibeLog Voice Cloning with Coqui XTTS v2 on Modal
Fast, self-hosted alternative to ElevenLabs
"""

import modal
import io
import base64
from pathlib import Path

# Create Modal app
app = modal.App("vibelog-tts")

# Create image with Coqui TTS and dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "TTS==0.22.0",
        "torch==2.1.0",
        "torchaudio==2.1.0",
        "numpy",
        "scipy",
        "librosa",
        "soundfile",
        "fastapi",  # Required for web endpoints
    )
    .env({"COQUI_TOS_AGREED": "1"})  # Auto-accept Coqui TOS for non-commercial use
    # Model will be downloaded on first use
)

# GPU function for voice cloning + TTS
@app.function(
    image=image,
    gpu="T4",  # NVIDIA T4 - good balance of cost and performance
    timeout=300,  # 5 minutes max
    scaledown_window=120,  # Keep warm for 2 minutes
    memory=8192,  # 8GB RAM
)
def generate_speech(text: str, voice_audio_b64: str, language: str = "en"):
    """
    Generate speech using Coqui XTTS with voice cloning

    Args:
        text: Text to convert to speech
        voice_audio_b64: Base64 encoded audio sample of the voice to clone
        language: Language code (en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh-cn, ja, hu, ko, hi)

    Returns:
        Base64 encoded audio (WAV format)
    """
    from TTS.api import TTS
    import tempfile
    import os

    print(f"🎙️ Generating speech for text length: {len(text)} chars")

    # Initialize model (cached after first run)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    print("✅ Model loaded")

    # Decode voice audio from base64
    voice_audio_bytes = base64.b64decode(voice_audio_b64)
    print(f"✅ Decoded voice audio: {len(voice_audio_bytes)} bytes")

    # Create temp files for voice sample and output
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as voice_file:
        voice_file.write(voice_audio_bytes)
        voice_path = voice_file.name

    output_path = tempfile.mktemp(suffix=".wav")

    try:
        # Generate speech with voice cloning
        print(f"🎵 Generating speech in language: {language}")
        tts.tts_to_file(
            text=text,
            speaker_wav=voice_path,
            language=language,
            file_path=output_path
        )
        print("✅ Speech generated")

        # Read output and encode as base64
        with open(output_path, "rb") as audio_file:
            audio_bytes = audio_file.read()

        audio_b64 = base64.b64encode(audio_bytes).decode()
        print(f"✅ Output audio: {len(audio_bytes)} bytes")

        return audio_b64

    finally:
        # Cleanup temp files
        if os.path.exists(voice_path):
            os.unlink(voice_path)
        if os.path.exists(output_path):
            os.unlink(output_path)

# Web endpoint for API access
@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def tts_endpoint(data: dict):
    """
    API endpoint for text-to-speech with voice cloning

    Request body:
    {
        "text": "Text to speak",
        "voiceAudio": "base64_encoded_audio",
        "language": "en" (optional)
    }

    Response:
    {
        "audioBase64": "base64_encoded_wav_audio",
        "duration": 1.23
    }
    """
    import time

    # Validate input
    text = data.get("text")
    voice_audio = data.get("voiceAudio")
    language = data.get("language", "en")

    if not text:
        return {"error": "Missing 'text' field"}, 400

    if not voice_audio:
        return {"error": "Missing 'voiceAudio' field"}, 400

    # Validate language
    supported_languages = [
        "en", "es", "fr", "de", "it", "pt", "pl", "tr",
        "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi"
    ]
    if language not in supported_languages:
        return {
            "error": f"Unsupported language: {language}",
            "supported": supported_languages
        }, 400

    try:
        # Time the generation
        start_time = time.time()

        # Generate speech
        audio_b64 = generate_speech.remote(text, voice_audio, language)

        duration = time.time() - start_time

        return {
            "audioBase64": audio_b64,
            "duration": round(duration, 2),
            "language": language,
            "textLength": len(text)
        }

    except Exception as e:
        print(f"❌ Error generating speech: {str(e)}")
        return {
            "error": f"Failed to generate speech: {str(e)}"
        }, 500

# Health check endpoint
@app.function(image=image)
@modal.fastapi_endpoint(method="GET")
def health():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "service": "vibelog-tts",
        "model": "xtts_v2",
        "gpu": "T4"
    }
