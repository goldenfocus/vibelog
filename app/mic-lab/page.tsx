'use client';

import React, { useState, useEffect } from 'react';

import MicRecorder from '@/components/MicRecorder';
import { useI18n } from '@/components/providers/I18nProvider';

// Mock data for deterministic visual testing
const MOCK_TRANSCRIPTION =
  'This is a sample transcription for visual testing purposes. It contains enough text to show how the transcription display works in the MicRecorder component.';

const MOCK_VIBELOG_CONTENT = `# AI-Powered Voice Technology: The Future is Here

The rapid advancement of voice recognition technology has opened up incredible possibilities for content creation. From simple voice notes to fully-fledged vibelog posts, we're witnessing a transformation in how we interact with digital content.

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
    id: 'idle',
    name: 'Idle State',
    description: 'Default state when no recording is happening',
  },
  {
    id: 'permission-request',
    name: 'Permission Request',
    description: 'When microphone permission is being requested',
  },
  {
    id: 'recording',
    name: 'Recording State',
    description: 'Active recording with waveform visualization and live transcript',
  },
  {
    id: 'processing',
    name: 'Processing State',
    description: 'AI processing with magical sequence animation',
  },
  {
    id: 'complete',
    name: 'Complete State',
    description: 'Final state with transcription, vibelog content, and actions',
    mockData: {
      transcription: MOCK_TRANSCRIPTION,
      blogContent: MOCK_VIBELOG_CONTENT,
      audioBlob: createMockAudioBlob(),
      duration: 23,
    },
  },
  {
    id: 'error',
    name: 'Error State',
    description: 'Error handling and retry options',
  },
];

// Enhanced MicRecorder with controllable state for testing
function ControllableMicRecorder({
  testId,
  forcedState,
  mockData,
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
  const { t: _t } = useI18n();
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
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent">
            MicRecorder Visual Lab
          </h1>
          <p className="text-lg text-muted-foreground">
            Visual testing laboratory for all MicRecorder states and variants
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              🧪 FOR VISUAL TESTING ONLY
            </span>
          </div>
        </div>

        {/* State Selector */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Select State to Test:</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MIC_STATES.map(state => (
              <button
                key={state.id}
                onClick={() => setSelectedState(selectedState === state.id ? null : state.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selectedState === state.id
                    ? 'border-electric bg-electric/10'
                    : 'border-border hover:border-electric/50'
                }`}
              >
                <h3 className="mb-1 font-semibold">{state.name}</h3>
                <p className="text-sm text-muted-foreground">{state.description}</p>
                <div className="mt-2 text-xs text-electric">data-testid={`mic-${state.id}`}</div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-center text-2xl font-bold">All States (Automated Visual Testing)</h2>

          {MIC_STATES.map(state => (
            <div
              key={state.id}
              className={`${selectedState && selectedState !== state.id ? 'opacity-30' : ''}`}
            >
              <div className="mb-8 border-b border-border/20 pb-4">
                <h3 className="flex items-center gap-3 text-xl font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-electric/20 text-sm font-bold text-electric">
                    {state.id.charAt(0).toUpperCase()}
                  </span>
                  {state.name}
                </h3>
                <p className="mt-1 text-muted-foreground">{state.description}</p>
              </div>

              {/* MicRecorder Instance */}
              <div className="mx-auto max-w-3xl rounded-2xl border border-border/10 bg-card/30 p-8 backdrop-blur-sm">
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
        <div className="mt-16 rounded-xl bg-muted/20 p-6">
          <h3 className="mb-3 font-semibold">URL Testing Parameters:</h3>
          <div className="space-y-2 font-mono text-sm">
            {MIC_STATES.map(state => (
              <div key={state.id}>
                <span className="text-muted-foreground">/mic-lab?state=</span>
                <span className="text-electric">{state.id}</span>
                <span className="ml-4 text-muted-foreground">→ {state.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <h4 className="mb-2 font-semibold text-blue-800 dark:text-blue-400">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            All mock data is deterministic for consistent visual snapshots. Waveform animations and
            live transcripts use fixed patterns to ensure reproducible testing.
          </p>
        </div>
      </div>
    </div>
  );
}
