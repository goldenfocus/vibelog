"""
VibeLog Voice Cloning with Coqui XTTS v2 on Modal
Fast, self-hosted alternative to ElevenLabs
"""

import io
import base64
from pathlib import Path
from fastapi import HTTPException
import io
import base64
from pathlib import Path
from fastapi import HTTPException
from modal.app import App
from modal.image import Image
from modal.partial_function import fastapi_endpoint

# Create Modal app
app = App("vibelog-tts")

# Create image with Coqui TTS and dependencies
# Use latest compatible versions to fix PyTorch _pytree errors
image = (
    Image.debian_slim(python_version="3.11")
    .pip_install(
        "TTS==0.22.0",
        "torch==2.1.2",  # Use 2.1.2 to fix _pytree issues
        "torchaudio==2.1.2",  # Match torchaudio version
        "numpy<2.0",  # TTS requires numpy <2.0
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

    # Detect audio format from file signature (magic bytes)
    # WAV: starts with "RIFF"
    # WebM: starts with 0x1A 0x45 0xDF 0xA3
    # MP4: starts with "ftyp" at offset 4
    if voice_audio_bytes.startswith(b'RIFF'):
        audio_ext = '.wav'
    elif voice_audio_bytes.startswith(b'\x1a\x45\xdf\xa3'):
        audio_ext = '.webm'
    elif len(voice_audio_bytes) > 8 and voice_audio_bytes[4:8] == b'ftyp':
        audio_ext = '.mp4'
    else:
        # Default to WAV, Coqui will try to parse it
        audio_ext = '.wav'

    print(f"🔍 Detected audio format: {audio_ext}")

    # Create temp files for voice sample and output
    # Use detected format for input, WAV for output
    with tempfile.NamedTemporaryFile(suffix=audio_ext, delete=False) as voice_file:
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
@fastapi_endpoint(method="POST")
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

    if not text or not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Missing 'text' field")

    if not voice_audio or not isinstance(voice_audio, str):
        raise HTTPException(status_code=400, detail="Missing 'voiceAudio' field")

    # Validate language
    supported_languages = [
        "en", "es", "fr", "de", "it", "pt", "pl", "tr",
        "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi"
    ]
    if language not in supported_languages:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Unsupported language: {language}",
                "supported": supported_languages,
            },
        )

    try:
        # Time the generation
        start_time = time.time()

        # Generate speech
        audio_b64 = generate_speech.remote(text, voice_audio, language)

        if not audio_b64 or not isinstance(audio_b64, str):
            raise HTTPException(status_code=500, detail="Modal TTS returned empty audio data")

        duration = time.time() - start_time

        return {
            "audioBase64": audio_b64,
            "duration": round(duration, 2),
            "language": language,
            "textLength": len(text),
        }

    except Exception as e:
        print(f"❌ Error generating speech: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate speech: {str(e)}")

# Health check endpoint
@app.function(image=image)
@fastapi_endpoint(method="GET")
def health():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "service": "vibelog-tts",
        "model": "xtts_v2",
        "gpu": "T4"
    }
