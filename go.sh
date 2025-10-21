#!/bin/bash

# One-command setup and start for Gemini image generation
# Usage: ./go.sh

set -e

clear

echo "
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║            Gemini 2.5 Flash Image - Auto Setup             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"

cd "$(dirname "$0")"

echo "📍 Working directory: $(pwd)"
echo ""

# Step 1: Install dependencies
echo "📦 [1/3] Installing dependencies..."
npm install --silent
echo "✅ Dependencies installed"
echo ""

# Step 2: Verify configuration
echo "🔑 [2/3] Verifying configuration..."
if grep -q "AIzaSyDNr4p4ep2HzTT3ZPF1nuECSvlbV3drgQo" .env.local 2>/dev/null; then
    echo "✅ GEMINI_API_KEY configured"
else
    echo "⚠️  Warning: GEMINI_API_KEY not found, using placeholder images"
fi
echo ""

# Step 3: Start the server
echo "🚀 [3/3] Starting development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Setup complete! Server starting..."
echo ""
echo "📱 Mobile images: 9:16 portrait (1080x1920)"
echo "💻 Desktop images: 16:9 landscape (1920x1080)"
echo ""
echo "Test it by recording a vibelog at http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
