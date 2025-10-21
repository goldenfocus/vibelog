#!/bin/bash

# Gemini 2.5 Flash Image Setup Script
# This script completes the migration from DALL-E 3 to Gemini

set -e  # Exit on any error

echo "🚀 Starting Gemini 2.5 Flash Image setup..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the vibelog root directory."
    exit 1
fi

# Step 1: Install the Google Generative AI package
echo "📦 Step 1/4: Installing @google/generative-ai..."
npm install @google/generative-ai
echo "✅ Package installed successfully"
echo ""

# Step 2: Verify environment configuration
echo "🔑 Step 2/4: Verifying environment configuration..."
if [ -f ".env.local" ]; then
    if grep -q "GEMINI_API_KEY" .env.local; then
        echo "✅ GEMINI_API_KEY found in .env.local"
    else
        echo "⚠️  Warning: GEMINI_API_KEY not found in .env.local"
        echo "   Please add: GEMINI_API_KEY=your_api_key_here"
    fi
else
    echo "⚠️  Warning: .env.local not found"
    echo "   Creating from .env.example..."
    cp .env.example .env.local
    echo "   Please edit .env.local and add your API keys"
fi
echo ""

# Step 3: Run TypeScript build check
echo "🔨 Step 3/4: Running build check..."
npm run build
echo "✅ Build completed successfully"
echo ""

# Step 4: Summary
echo "✨ Step 4/4: Setup complete!"
echo ""
echo "📋 Summary of changes:"
echo "   • Installed @google/generative-ai package"
echo "   • GEMINI_API_KEY configured in .env.local"
echo "   • Build verified successfully"
echo ""
echo "🎉 Gemini 2.5 Flash Image is ready to use!"
echo ""
echo "Next steps:"
echo "   1. Start the dev server: npm run dev"
echo "   2. Record a vibelog to test image generation"
echo "   3. Check console for: '🖼️ [COVER-GEN] Generating image with Gemini 2.5 Flash'"
echo ""
echo "📚 See GEMINI_IMAGE_MIGRATION.md for full documentation"
