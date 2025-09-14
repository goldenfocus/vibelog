"use client";

import React, { useState } from "react";
import ProcessingAnimation from "@/components/mic/ProcessingAnimation";
import { useI18n } from "@/components/providers/I18nProvider";

interface ProcessingLabState {
  id: string;
  name: string;
  description: string;
  props: any;
}

const PROCESSING_STATES: ProcessingLabState[] = [
  {
    id: "short-recording-fast",
    name: "Short Recording (Fast)",
    description: "Animation with fast timing for 15s recording",
    props: {
      isVisible: true,
      recordingTime: 15
    }
  },
  {
    id: "medium-recording-moderate",
    name: "Medium Recording (Moderate)",
    description: "Animation with moderate timing for 60s recording",
    props: {
      isVisible: true,
      recordingTime: 60
    }
  },
  {
    id: "long-recording-slow",
    name: "Long Recording (Slow)",
    description: "Animation with slow timing for 180s recording",
    props: {
      isVisible: true,
      recordingTime: 180
    }
  },
  {
    id: "transcription-error",
    name: "Transcription Error",
    description: "Animation with transcription API error",
    props: {
      isVisible: true,
      recordingTime: 30,
      hasTranscriptionError: true
    }
  },
  {
    id: "blog-generation-error",
    name: "Blog Generation Error", 
    description: "Animation with blog generation API error",
    props: {
      isVisible: true,
      recordingTime: 30,
      hasBlogError: true
    }
  },
  {
    id: "both-errors",
    name: "Both API Errors",
    description: "Animation with both transcription and blog errors",
    props: {
      isVisible: true,
      recordingTime: 30,
      hasTranscriptionError: true,
      hasBlogError: true
    }
  },
  {
    id: "custom-class",
    name: "Custom Styling",
    description: "Animation with custom CSS class",
    props: {
      isVisible: true,
      recordingTime: 30,
      className: "border-4 border-red-500"
    }
  },
  {
    id: "invisible-state",
    name: "Invisible State",
    description: "Animation when isVisible is false",
    props: {
      isVisible: false,
      recordingTime: 30
    }
  }
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
        throw new Error('Mock blog generation error');
      }
      setLastAction('blog-generation');
      console.log('Mock blog generation completed');
      return 'Mock blog content';
    },
    onAnimationComplete: () => {
      setLastAction('animation-complete');
      setAnimationCompleted(true);
      console.log('Mock animation completed');
    }
  };

  return (
    <div data-testid={testId}>
      <ProcessingAnimation
        {...props}
        {...mockHandlers}
      />
      
      {/* Debug info */}
      <div className="mt-4 p-2 bg-muted/10 rounded text-xs text-muted-foreground">
        Last action: {lastAction || 'none'} | 
        Recording time: {props.recordingTime}s | 
        Animation completed: {animationCompleted ? 'Yes' : 'No'} |
        Transcription error: {hasTranscriptionError ? 'Yes' : 'No'} |
        Blog error: {hasBlogError ? 'Yes' : 'No'}
      </div>
    </div>
  );
}

export default function ProcessingLabPage() {
  const { t } = useI18n();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-electric bg-clip-text text-transparent">
            Processing Timeline Visual Lab
          </h1>
          <p className="text-muted-foreground text-lg">
            Visual testing laboratory for the Processing Timeline (single-step, adaptive pacing)
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-3 py-1 rounded-full">
              ⏩ PROCESSING TIMELINE
            </span>
          </div>
        </div>

        {/* State Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Select Animation State to Test:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROCESSING_STATES.map((state) => (
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
                  data-testid="processing-{state.id}"
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-2xl font-bold text-center">All Timeline States (Automated Visual Testing)</h2>
          
          {PROCESSING_STATES.map((state) => (
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
                <div className="mt-2 text-xs text-muted-foreground">
                  Visible: {state.props.isVisible ? 'Yes' : 'No'} | 
                  Recording: {state.props.recordingTime}s | 
                  Trans Error: {state.props.hasTranscriptionError ? 'Yes' : 'No'} |
                  Blog Error: {state.props.hasBlogError ? 'Yes' : 'No'}
                </div>
              </div>
              
              {/* ProcessingAnimation Instance */}
              <div 
                className="max-w-4xl mx-auto bg-card/30 backdrop-blur-sm rounded-2xl p-8 border border-border/10"
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
        <div className="mt-16 p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <h3 className="font-semibold mb-3 text-green-800 dark:text-green-400">⏱️ Timing Comparison</h3>
          <p className="text-sm text-green-700 dark:text-green-300 mb-4">
            Compare animation speeds based on recording duration:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-card/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Short (15s)</h4>
              <p className="text-xs text-muted-foreground">800ms per step</p>
              <TestableProcessingAnimation
                testId="timing-short"
                isVisible={true}
                recordingTime={15}
              />
            </div>
            <div className="bg-white dark:bg-card/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Medium (60s)</h4>
              <p className="text-xs text-muted-foreground">1200ms per step</p>
              <TestableProcessingAnimation
                testId="timing-medium"
                isVisible={true}
                recordingTime={60}
              />
            </div>
            <div className="bg-white dark:bg-card/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Long (180s)</h4>
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
        <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <h3 className="font-semibold mb-3 text-red-800 dark:text-red-400">🚨 Error Handling Testing</h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            Test animation behavior with API errors:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-card/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Transcription Error</h4>
              <TestableProcessingAnimation
                testId="error-transcription"
                isVisible={true}
                recordingTime={30}
                hasTranscriptionError={true}
              />
            </div>
            <div className="bg-white dark:bg-card/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Blog Generation Error</h4>
              <TestableProcessingAnimation
                testId="error-blog"
                isVisible={true}
                recordingTime={30}
                hasBlogError={true}
              />
            </div>
          </div>
        </div>

        {/* Mobile Viewport Testing */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-400">📱 Mobile Testing</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            Responsive design testing for mobile viewports
          </p>
          <div className="max-w-sm mx-auto bg-white dark:bg-card/30 p-4 rounded-lg">
            <TestableProcessingAnimation
              testId="mobile-test"
              isVisible={true}
              recordingTime={30}
            />
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            All animation states, timing calculations, and API interactions are deterministic for consistent visual snapshots. 
            The Processing Timeline, particle animations, and error handling are reproducible for testing.
          </p>
        </div>
      </div>
    </div>
  );
}