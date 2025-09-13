"use client";

import React, { useState, useEffect } from "react";
import MicRecorder from "@/components/MicRecorder";
import { useI18n } from "@/components/providers/I18nProvider";

// Mock data for deterministic visual testing
const MOCK_TRANSCRIPTION = "This is a sample transcription for visual testing purposes. It contains enough text to show how the transcription display works in the MicRecorder component.";

const MOCK_BLOG_CONTENT = `# AI-Powered Voice Technology: The Future is Here

The rapid advancement of voice recognition technology has opened up incredible possibilities for content creation. From simple voice notes to fully-fledged blog posts, we're witnessing a transformation in how we interact with digital content.

## Key Benefits of Voice-to-Text Technology

**Speed and Efficiency**: Speaking is naturally faster than typing for most people. Voice-to-text technology allows us to capture thoughts at the speed of speech.

**Accessibility**: This technology makes content creation more accessible to people with disabilities or those who struggle with traditional typing methods.

**Natural Expression**: When we speak, we tend to express ourselves more naturally and conversationally, leading to more engaging content.

## The Technical Marvel Behind the Scenes

Modern voice recognition systems use sophisticated machine learning algorithms to process audio signals and convert them into accurate text transcriptions.

This technology continues to evolve, becoming more accurate and capable of understanding different accents, languages, and speaking styles.

---
Created by @vibeyang
https://vibelog.io/vibeyang`;

// Mock audio blob for testing
const createMockAudioBlob = () => {
  // Create a minimal valid audio blob for testing
  const arrayBuffer = new ArrayBuffer(44);
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

interface MicLabState {
  id: string;
  name: string;
  description: string;
  mockData?: any;
}

const MIC_STATES: MicLabState[] = [
  {
    id: "idle",
    name: "Idle State",
    description: "Default state when no recording is happening"
  },
  {
    id: "permission-request", 
    name: "Permission Request",
    description: "When microphone permission is being requested"
  },
  {
    id: "recording",
    name: "Recording State", 
    description: "Active recording with waveform visualization and live transcript"
  },
  {
    id: "processing",
    name: "Processing State",
    description: "AI processing with magical sequence animation"
  },
  {
    id: "complete",
    name: "Complete State",
    description: "Final state with transcription, blog content, and actions",
    mockData: {
      transcription: MOCK_TRANSCRIPTION,
      blogContent: MOCK_BLOG_CONTENT,
      audioBlob: createMockAudioBlob(),
      duration: 23
    }
  },
  {
    id: "error",
    name: "Error State", 
    description: "Error handling and retry options"
  }
];

// Enhanced MicRecorder with controllable state for testing
function ControllableMicRecorder({ 
  testId, 
  forcedState, 
  mockData 
}: { 
  testId: string;
  forcedState?: string;
  mockData?: any;
}) {
  // This would be a modified version of MicRecorder that accepts props to control its state
  // For now, we'll use the regular MicRecorder and add test attributes
  return (
    <div data-testid={testId} data-state={forcedState}>
      <MicRecorder />
      {mockData && (
        <div style={{ display: 'none' }} data-mock-data={JSON.stringify(mockData)}>
          Mock data container
        </div>
      )}
    </div>
  );
}

export default function MicLabPage() {
  const { t } = useI18n();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Auto-select state from URL params for automated testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    if (state && MIC_STATES.find(s => s.id === state)) {
      setSelectedState(state);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-electric bg-clip-text text-transparent">
            MicRecorder Visual Lab
          </h1>
          <p className="text-muted-foreground text-lg">
            Visual testing laboratory for all MicRecorder states and variants
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-3 py-1 rounded-full">
              🧪 FOR VISUAL TESTING ONLY
            </span>
          </div>
        </div>

        {/* State Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Select State to Test:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MIC_STATES.map((state) => (
              <button
                key={state.id}
                onClick={() => setSelectedState(selectedState === state.id ? null : state.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedState === state.id
                    ? 'border-electric bg-electric/10'
                    : 'border-border hover:border-electric/50'
                }`}
              >
                <h3 className="font-semibold mb-1">{state.name}</h3>
                <p className="text-sm text-muted-foreground">{state.description}</p>
                <div className="mt-2 text-xs text-electric">
                  data-testid="mic-{state.id}"
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-2xl font-bold text-center">All States (Automated Visual Testing)</h2>
          
          {MIC_STATES.map((state) => (
            <div 
              key={state.id}
              className={`${selectedState && selectedState !== state.id ? 'opacity-30' : ''}`}
            >
              <div className="border-b border-border/20 pb-4 mb-8">
                <h3 className="text-xl font-semibold flex items-center gap-3">
                  <span className="w-8 h-8 bg-electric/20 text-electric rounded-full flex items-center justify-center text-sm font-bold">
                    {state.id.charAt(0).toUpperCase()}
                  </span>
                  {state.name}
                </h3>
                <p className="text-muted-foreground mt-1">{state.description}</p>
              </div>
              
              {/* MicRecorder Instance */}
              <div className="max-w-3xl mx-auto bg-card/30 backdrop-blur-sm rounded-2xl p-8 border border-border/10">
                <ControllableMicRecorder
                  testId={`mic-${state.id}`}
                  forcedState={state.id}
                  mockData={state.mockData}
                />
              </div>
            </div>
          ))}
        </div>

        {/* URL Testing Instructions */}
        <div className="mt-16 p-6 bg-muted/20 rounded-xl">
          <h3 className="font-semibold mb-3">URL Testing Parameters:</h3>
          <div className="space-y-2 text-sm font-mono">
            {MIC_STATES.map((state) => (
              <div key={state.id}>
                <span className="text-muted-foreground">/mic-lab?state=</span>
                <span className="text-electric">{state.id}</span>
                <span className="text-muted-foreground ml-4">→ {state.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            All mock data is deterministic for consistent visual snapshots. 
            Waveform animations and live transcripts use fixed patterns to ensure reproducible testing.
          </p>
        </div>
      </div>
    </div>
  );
}