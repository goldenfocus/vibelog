#!/bin/bash

# Quick script to test if Gemini image generation is working

echo "🔍 Checking Gemini API configuration..."
echo ""

# Check if env file exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    exit 1
fi

# Check for GEMINI_API_KEY
if grep -q "GEMINI_API_KEY=AIzaSy" .env.local; then
    echo "✅ GEMINI_API_KEY is configured"
else
    echo "❌ GEMINI_API_KEY not found in .env.local"
    exit 1
fi

echo ""
echo "🧪 Testing Gemini API endpoint..."
echo ""
echo "Make sure your dev server is running (npm run dev)"
echo ""
echo "To test image generation, look for these console logs:"
echo "  ✅ '🖼️ [COVER-GEN] Generating image with Gemini 2.5 Flash'"
echo "  ❌ 'Gemini image generation error:' (means it failed)"
echo ""
echo "Common issues:"
echo "  1. API key invalid - check https://aistudio.google.com/apikey"
echo "  2. Model not available - try 'gemini-2.0-flash-preview-image-generation'"
echo "  3. Quota exceeded - check your Gemini API usage"
echo ""
