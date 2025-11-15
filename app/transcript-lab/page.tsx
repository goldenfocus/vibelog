'use client';

import React, { useState } from 'react';

import TranscriptionPanel from '@/components/mic/TranscriptionPanel';
import { useI18n } from '@/components/providers/I18nProvider';

// Mock data for deterministic visual testing
const MOCK_TRANSCRIPTS = {
  short: 'Hello world, this is a short test.',
  medium:
    'This is a medium-length transcription that contains enough text to demonstrate how the component handles moderate content. It includes multiple sentences and provides a good example of typical transcription length.',
  long: 'This is a much longer transcription that demonstrates how the TranscriptionPanel component handles extensive content. It contains multiple paragraphs and sentences to show text wrapping, scrolling behavior, and how the character and word counters work with larger amounts of text. This type of content would typically result from longer recordings and helps us test the visual layout with substantial text content. The component should gracefully handle this amount of text while maintaining readability and proper spacing throughout the interface.',
  withPunctuation: "Hello! How are you? I'm doing well, thanks. What about you?",
  withNumbers:
    'The meeting is at 3:30 PM on January 15th, 2024. Please bring documents A, B, and C.',
  multiline: 'Line one\nLine two\nLine three\nThis has multiple lines with breaks',
  specialChars: 'Testing special characters: @#$%^&*()_+-={}[]|\\:;"\'<>,.?/~`',
  empty: '',
  typing: 'This is being typed live...',
  listening: 'Listening for speech...',
  blocked: 'Speech recognition blocked by browser',
  unavailable: 'Speech recognition unavailable',
};

interface TranscriptLabState {
  id: string;
  name: string;
  description: string;
  props: any;
}

const TRANSCRIPT_STATES: TranscriptLabState[] = [
  {
    id: 'empty',
    name: 'Empty State',
    description: 'No transcription and not recording',
    props: {
      transcription: '',
      liveTranscript: '',
      isRecording: false,
      isComplete: false,
      isLoggedIn: false,
    },
  },
  {
    id: 'live-short',
    name: 'Live - Short',
    description: 'Recording with short live transcript',
    props: {
      transcription: '',
      liveTranscript: MOCK_TRANSCRIPTS.short,
      isRecording: true,
      isComplete: false,
      isLoggedIn: false,
    },
  },
  {
    id: 'live-medium',
    name: 'Live - Medium',
    description: 'Recording with medium-length live transcript',
    props: {
      transcription: '',
      liveTranscript: MOCK_TRANSCRIPTS.medium,
      isRecording: true,
      isComplete: false,
      isLoggedIn: false,
    },
  },
  {
    id: 'live-long',
    name: 'Live - Long',
    description: 'Recording with long live transcript',
    props: {
      transcription: '',
      liveTranscript: MOCK_TRANSCRIPTS.long,
      isRecording: true,
      isComplete: false,
      isLoggedIn: false,
    },
  },
  {
    id: 'live-listening',
    name: 'Live - Listening',
    description: 'Recording state showing listening message',
    props: {
      transcription: '',
      liveTranscript: MOCK_TRANSCRIPTS.listening,
      isRecording: true,
      isComplete: false,
      isLoggedIn: false,
    },
  },
  {
    id: 'live-blocked',
    name: 'Live - Blocked',
    description: 'Recording state with speech recognition blocked',
    props: {
      transcription: '',
      liveTranscript: MOCK_TRANSCRIPTS.blocked,
      isRecording: true,
      isComplete: false,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-short',
    name: 'Completed - Short',
    description: 'Completed transcription with short text',
    props: {
      transcription: MOCK_TRANSCRIPTS.short,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-medium',
    name: 'Completed - Medium',
    description: 'Completed transcription with medium text',
    props: {
      transcription: MOCK_TRANSCRIPTS.medium,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-long',
    name: 'Completed - Long',
    description: 'Completed transcription with long text',
    props: {
      transcription: MOCK_TRANSCRIPTS.long,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-punctuation',
    name: 'Completed - Punctuation',
    description: 'Completed transcription with special punctuation',
    props: {
      transcription: MOCK_TRANSCRIPTS.withPunctuation,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-numbers',
    name: 'Completed - Numbers',
    description: 'Completed transcription with numbers and dates',
    props: {
      transcription: MOCK_TRANSCRIPTS.withNumbers,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-multiline',
    name: 'Completed - Multiline',
    description: 'Completed transcription with line breaks',
    props: {
      transcription: MOCK_TRANSCRIPTS.multiline,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: false,
    },
  },
  {
    id: 'completed-logged-in',
    name: 'Completed - Logged In',
    description: 'Completed transcription with user logged in',
    props: {
      transcription: MOCK_TRANSCRIPTS.medium,
      liveTranscript: '',
      isRecording: false,
      isComplete: true,
      isLoggedIn: true,
    },
  },
  {
    id: 'both-states',
    name: 'Live + Completed',
    description: 'Both live and completed transcription visible',
    props: {
      transcription: MOCK_TRANSCRIPTS.medium,
      liveTranscript: MOCK_TRANSCRIPTS.short,
      isRecording: true,
      isComplete: true,
      isLoggedIn: false,
    },
  },
];

export default function TranscriptLabPage() {
  const { t: _t } = useI18n();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const mockHandlers = {
    onCopy: (content: string) => {
      console.log('Mock copy:', content);
    },
    onEdit: () => {
      console.log('Mock edit triggered');
    },
    onTranscriptUpdate: (newContent: string) => {
      console.log('Mock transcript update:', newContent);
    },
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent">
            TranscriptionPanel Visual Lab
          </h1>
          <p className="text-lg text-muted-foreground">
            Visual testing laboratory for all TranscriptionPanel states and variants
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
            {TRANSCRIPT_STATES.map(state => (
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
                  data-testid=&ldquo;transcript-{state.id}&rdquo;
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-center text-2xl font-bold">All States (Automated Visual Testing)</h2>

          {TRANSCRIPT_STATES.map(state => (
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
                  Recording: {state.props.isRecording ? 'Yes' : 'No'} | Complete:{' '}
                  {state.props.isComplete ? 'Yes' : 'No'} | Logged In:{' '}
                  {state.props.isLoggedIn ? 'Yes' : 'No'}
                </div>
              </div>

              {/* TranscriptionPanel Instance */}
              <div
                className="mx-auto max-w-3xl rounded-2xl border border-border/10 bg-card/30 p-8 backdrop-blur-sm"
                data-testid={`transcript-${state.id}`}
              >
                <TranscriptionPanel {...state.props} {...mockHandlers} />
              </div>
            </div>
          ))}
        </div>

        {/* Character and Word Count Examples */}
        <div className="mt-16 rounded-xl bg-muted/20 p-6">
          <h3 className="mb-3 font-semibold">Character & Word Count Examples:</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Short:</strong> {MOCK_TRANSCRIPTS.short.length} chars,{' '}
              {MOCK_TRANSCRIPTS.short.split(/\s+/).filter(w => w.length > 0).length} words
            </div>
            <div>
              <strong>Medium:</strong> {MOCK_TRANSCRIPTS.medium.length} chars,{' '}
              {MOCK_TRANSCRIPTS.medium.split(/\s+/).filter(w => w.length > 0).length} words
            </div>
            <div>
              <strong>Long:</strong> {MOCK_TRANSCRIPTS.long.length} chars,{' '}
              {MOCK_TRANSCRIPTS.long.split(/\s+/).filter(w => w.length > 0).length} words
            </div>
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <h4 className="mb-2 font-semibold text-blue-800 dark:text-blue-400">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            All mock data is deterministic for consistent visual snapshots. Character and word
            counts are calculated consistently to ensure reproducible testing.
          </p>
        </div>
      </div>
    </main>
  );
}
