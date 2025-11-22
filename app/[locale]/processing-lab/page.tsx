'use client';

import React, { useState } from 'react';

import ProcessingAnimation from '@/components/mic/ProcessingAnimation';
import { useI18n } from '@/components/providers/I18nProvider';

interface ProcessingLabState {
  id: string;
  name: string;
  description: string;
  props: any;
}

const PROCESSING_STATES: ProcessingLabState[] = [
  {
    id: 'short-recording-fast',
    name: 'Short Recording (Fast)',
    description: 'Animation with fast timing for 15s recording',
    props: {
      isVisible: true,
      recordingTime: 15,
    },
  },
  {
    id: 'medium-recording-moderate',
    name: 'Medium Recording (Moderate)',
    description: 'Animation with moderate timing for 60s recording',
    props: {
      isVisible: true,
      recordingTime: 60,
    },
  },
  {
    id: 'long-recording-slow',
    name: 'Long Recording (Slow)',
    description: 'Animation with slow timing for 180s recording',
    props: {
      isVisible: true,
      recordingTime: 180,
    },
  },
  {
    id: 'transcription-error',
    name: 'Transcription Error',
    description: 'Animation with transcription API error',
    props: {
      isVisible: true,
      recordingTime: 30,
      hasTranscriptionError: true,
    },
  },
  {
    id: 'vibelog-generation-error',
    name: 'Vibelog Generation Error',
    description: 'Animation with vibelog generation API error',
    props: {
      isVisible: true,
      recordingTime: 30,
      hasBlogError: true,
    },
  },
  {
    id: 'both-errors',
    name: 'Both API Errors',
    description: 'Animation with both transcription and blog errors',
    props: {
      isVisible: true,
      recordingTime: 30,
      hasTranscriptionError: true,
      hasBlogError: true,
    },
  },
  {
    id: 'custom-class',
    name: 'Custom Styling',
    description: 'Animation with custom CSS class',
    props: {
      isVisible: true,
      recordingTime: 30,
      className: 'border-4 border-red-500',
    },
  },
  {
    id: 'invisible-state',
    name: 'Invisible State',
    description: 'Animation when isVisible is false',
    props: {
      isVisible: false,
      recordingTime: 30,
    },
  },
];

// Enhanced ProcessingAnimation wrapper for testing different states
function TestableProcessingAnimation({
  testId,
  hasTranscriptionError = false,
  hasBlogError = false,
  ...props
}: any) {
  const [lastAction, setLastAction] = useState<string>('');
  const [animationCompleted, setAnimationCompleted] = useState(false);

  const mockHandlers = {
    onTranscribeComplete: async () => {
      if (hasTranscriptionError) {
        throw new Error('Mock transcription error');
      }
      setLastAction('transcription');
      console.log('Mock transcription completed');
      return 'Mock transcription result';
    },
    onGenerateComplete: async () => {
      if (hasBlogError) {
        throw new Error('Mock vibelog generation error');
      }
      setLastAction('vibelog-generation');
      console.log('Mock vibelog generation completed');
      return 'Mock vibelog content';
    },
    onAnimationComplete: () => {
      setLastAction('animation-complete');
      setAnimationCompleted(true);
      console.log('Mock animation completed');
    },
  };

  return (
    <div data-testid={testId}>
      <ProcessingAnimation {...props} {...mockHandlers} />

      {/* Debug info */}
      <div className="mt-4 rounded bg-muted/10 p-2 text-xs text-muted-foreground">
        Last action: {lastAction || 'none'} | Recording time: {props.recordingTime}s | Animation
        completed: {animationCompleted ? 'Yes' : 'No'} | Transcription error:{' '}
        {hasTranscriptionError ? 'Yes' : 'No'} | Vibelog error: {hasBlogError ? 'Yes' : 'No'}
      </div>
    </div>
  );
}

export default function ProcessingLabPage() {
  const { t: _t } = useI18n();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent">
            Processing Timeline Visual Lab
          </h1>
          <p className="text-lg text-muted-foreground">
            Visual testing laboratory for the Processing Timeline (single-step, adaptive pacing)
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              ⏩ PROCESSING TIMELINE
            </span>
          </div>
        </div>

        {/* State Selector */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Select Animation State to Test:</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROCESSING_STATES.map(state => (
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
                <div className="mt-2 text-xs text-electric">
                  data-testid={`processing-${state.id}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-center text-2xl font-bold">
            All Timeline States (Automated Visual Testing)
          </h2>

          {PROCESSING_STATES.map(state => (
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
                <div className="mt-2 text-xs text-muted-foreground">
                  Visible: {state.props.isVisible ? 'Yes' : 'No'} | Recording:{' '}
                  {state.props.recordingTime}s | Trans Error:{' '}
                  {state.props.hasTranscriptionError ? 'Yes' : 'No'} | Vibelog Error:{' '}
                  {state.props.hasBlogError ? 'Yes' : 'No'}
                </div>
              </div>

              {/* ProcessingAnimation Instance */}
              <div
                className="mx-auto max-w-4xl rounded-2xl border border-border/10 bg-card/30 p-8 backdrop-blur-sm"
                data-testid={`processing-${state.id}`}
              >
                <TestableProcessingAnimation
                  testId={`processing-animation-${state.id}`}
                  {...state.props}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Timing Comparison Section */}
        <div className="mt-16 rounded-xl bg-green-50 p-6 dark:bg-green-900/20">
          <h3 className="mb-3 font-semibold text-green-800 dark:text-green-400">
            ⏱️ Timing Comparison
          </h3>
          <p className="mb-4 text-sm text-green-700 dark:text-green-300">
            Compare animation speeds based on recording duration:
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4 dark:bg-card/30">
              <h4 className="mb-2 font-medium">Short (15s)</h4>
              <p className="text-xs text-muted-foreground">800ms per step</p>
              <TestableProcessingAnimation
                testId="timing-short"
                isVisible={true}
                recordingTime={15}
              />
            </div>
            <div className="rounded-lg bg-white p-4 dark:bg-card/30">
              <h4 className="mb-2 font-medium">Medium (60s)</h4>
              <p className="text-xs text-muted-foreground">1200ms per step</p>
              <TestableProcessingAnimation
                testId="timing-medium"
                isVisible={true}
                recordingTime={60}
              />
            </div>
            <div className="rounded-lg bg-white p-4 dark:bg-card/30">
              <h4 className="mb-2 font-medium">Long (180s)</h4>
              <p className="text-xs text-muted-foreground">1800ms per step</p>
              <TestableProcessingAnimation
                testId="timing-long"
                isVisible={true}
                recordingTime={180}
              />
            </div>
          </div>
        </div>

        {/* Error Handling Testing */}
        <div className="mt-8 rounded-xl bg-red-50 p-6 dark:bg-red-900/20">
          <h3 className="mb-3 font-semibold text-red-800 dark:text-red-400">
            🚨 Error Handling Testing
          </h3>
          <p className="mb-4 text-sm text-red-700 dark:text-red-300">
            Test animation behavior with API errors:
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-white p-4 dark:bg-card/30">
              <h4 className="mb-2 font-medium">Transcription Error</h4>
              <TestableProcessingAnimation
                testId="error-transcription"
                isVisible={true}
                recordingTime={30}
                hasTranscriptionError={true}
              />
            </div>
            <div className="rounded-lg bg-white p-4 dark:bg-card/30">
              <h4 className="mb-2 font-medium">Vibelog Generation Error</h4>
              <TestableProcessingAnimation
                testId="error-vibelog"
                isVisible={true}
                recordingTime={30}
                hasBlogError={true}
              />
            </div>
          </div>
        </div>

        {/* Mobile Viewport Testing */}
        <div className="mt-8 rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <h3 className="mb-3 font-semibold text-blue-800 dark:text-blue-400">📱 Mobile Testing</h3>
          <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
            Responsive design testing for mobile viewports
          </p>
          <div className="mx-auto max-w-sm rounded-lg bg-white p-4 dark:bg-card/30">
            <TestableProcessingAnimation testId="mobile-test" isVisible={true} recordingTime={30} />
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 rounded-xl bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <h4 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-400">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            All animation states, timing calculations, and API interactions are deterministic for
            consistent visual snapshots. The Processing Timeline, particle animations, and error
            handling are reproducible for testing.
          </p>
        </div>
      </div>
    </main>
  );
}
