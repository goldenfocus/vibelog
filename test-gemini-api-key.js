#!/usr/bin/env node

/**
 * Test if Gemini API key has access to image generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDNr4p4ep2HzTT3ZPF1nuECSvlbV3drgQo';

async function testModels() {
  console.log('🔍 Testing Gemini API key capabilities...\n');

  const genAI = new GoogleGenerativeAI(API_KEY);

  // Test 1: Try to list available models
  console.log('📋 Attempting to list available models...');
  try {
    const models = await genAI.listModels();
    console.log('✅ Models available:');
    models.forEach(model => {
      console.log(`  - ${model.name} (${model.displayName})`);
      if (model.name.includes('image')) {
        console.log(`    ⭐ IMAGE MODEL FOUND!`);
      }
    });
  } catch (err) {
    console.error('❌ Error listing models:', err.message);
  }

  console.log('\n');

  // Test 2: Try text generation (should work on free tier)
  console.log('📝 Testing text generation (should work)...');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent('Say hi in 3 words');
    const response = await result.response;
    console.log('✅ Text generation works:', response.text());
  } catch (err) {
    console.error('❌ Text generation failed:', err.message);
  }

  console.log('\n');

  // Test 3: Try image generation with gemini-2.5-flash-image
  console.log('🖼️  Testing image generation with gemini-2.5-flash-image...');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'A red apple' }] }],
    });
    const response = await result.response;
    console.log('✅ Image generation works!');
    console.log('   Parts returned:', response.candidates[0].content.parts.length);
  } catch (err) {
    console.error('❌ Image generation failed:', err.message);
    if (err.message.includes('429') || err.message.includes('quota')) {
      console.log('\n💡 Diagnosis: API key does NOT have free tier image generation enabled');
      console.log('   Solutions:');
      console.log('   1. Enable billing in Google Cloud Console');
      console.log('   2. Or fall back to DALL-E 3 (which you have OpenAI key for)');
    }
  }

  console.log('\n');
}

testModels().catch(console.error);
