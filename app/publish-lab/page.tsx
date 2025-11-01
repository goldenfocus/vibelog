'use client';

import React, { useState } from 'react';

import PublishActions from '@/components/mic/PublishActions';
import { useI18n } from '@/components/providers/I18nProvider';

// Mock data for deterministic visual testing
const MOCK_CONTENT = {
  short: 'Short vibelog content for testing.',
  medium:
    'This is a medium-length vibelog content that demonstrates how the PublishActions component handles typical content. It includes multiple sentences and provides a good example of normal vibelog post length for copy and share functionality.',
  long: 'This is a much longer vibelog content that demonstrates how the PublishActions component handles extensive content. It contains multiple paragraphs and sentences to show how the copy functionality works with larger amounts of text. This type of content would typically result from longer recordings and helps us test the behavior with substantial text content. The component should gracefully handle this amount of text while maintaining proper functionality and performance throughout the publishing process.',
  empty: '',
  withSignature: 'Vibelog content that will include a signature when copied.',
};

interface PublishLabState {
  id: string;
  name: string;
  description: string;
  props: any;
}

const PUBLISH_STATES: PublishLabState[] = [
  {
    id: 'logged-out-idle',
    name: 'Logged Out - Idle',
    description: 'Default state for logged out user',
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: false,
      showSignature: false,
    },
  },
  {
    id: 'logged-in-idle',
    name: 'Logged In - Idle',
    description: 'Default state for logged in user',
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: true,
      showSignature: false,
    },
  },
  {
    id: 'short-content',
    name: 'Short Content',
    description: 'Actions with short vibelog content',
    props: {
      content: MOCK_CONTENT.short,
      isLoggedIn: false,
      showSignature: false,
    },
  },
  {
    id: 'long-content',
    name: 'Long Content',
    description: 'Actions with long vibelog content',
    props: {
      content: MOCK_CONTENT.long,
      isLoggedIn: false,
      showSignature: false,
    },
  },
  {
    id: 'empty-content',
    name: 'Empty Content',
    description: 'Actions with empty content',
    props: {
      content: MOCK_CONTENT.empty,
      isLoggedIn: false,
      showSignature: false,
    },
  },
  {
    id: 'with-signature',
    name: 'With Signature',
    description: 'Copy includes signature',
    props: {
      content: MOCK_CONTENT.withSignature,
      isLoggedIn: true,
      showSignature: true,
    },
  },
  {
    id: 'edit-popup-shown',
    name: 'Edit Popup',
    description: 'Edit login popup displayed',
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: false,
      showSignature: false,
      forceShowEditPopup: true,
    },
  },
  {
    id: 'save-popup-shown',
    name: 'Save Popup',
    description: 'Save login popup displayed',
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: false,
      showSignature: false,
      forceShowSavePopup: true,
    },
  },
  {
    id: 'disabled-state',
    name: 'Disabled State',
    description: 'All buttons disabled',
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: true,
      showSignature: false,
      disabled: true,
    },
  },
];

// Enhanced PublishActions wrapper for testing different states
function TestablePublishActions({
  testId,
  forceShowEditPopup = false,
  forceShowSavePopup = false,
  disabled = false,
  ...props
}: any) {
  const [_copiedContent, setCopiedContent] = useState<string>('');
  const [lastAction, setLastAction] = useState<string>('');

  const mockHandlers = {
    onCopy: (content: string) => {
      setCopiedContent(content);
      setLastAction('copy');
      console.log('Mock copy:', content.substring(0, 50) + '...');
    },
    onEdit: () => {
      setLastAction('edit');
      console.log('Mock edit triggered');
    },
    onSave: () => {
      setLastAction('save');
      console.log('Mock save triggered');
    },
    onShare: () => {
      setLastAction('share');
      console.log('Mock share triggered');
    },
  };

  return (
    <div data-testid={testId}>
      <PublishActions
        {...props}
        {...mockHandlers}
        className={disabled ? 'pointer-events-none opacity-50' : ''}
      />

      {/* Force show popups for visual testing */}
      {forceShowEditPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Login Required</h3>
              <button className="text-muted-foreground transition-colors hover:text-foreground">
                <div className="h-5 w-5">X</div>
              </button>
            </div>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              Please sign in to edit your content
            </p>
            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-electric px-6 py-3 font-semibold text-white transition-all duration-200 hover:opacity-90">
                <div className="h-5 w-5">LogIn</div>
                Sign In to Edit
              </button>
              <button className="py-2 text-center text-muted-foreground transition-colors hover:text-foreground">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {forceShowSavePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Login Required</h3>
              <button className="text-muted-foreground transition-colors hover:text-foreground">
                <div className="h-5 w-5">X</div>
              </button>
            </div>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              Please sign in to save your content
            </p>
            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-electric px-6 py-3 font-semibold text-white transition-all duration-200 hover:opacity-90">
                <div className="h-5 w-5">LogIn</div>
                Sign In to Save
              </button>
              <button className="py-2 text-center text-muted-foreground transition-colors hover:text-foreground">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="mt-4 rounded bg-muted/10 p-2 text-xs text-muted-foreground">
        Last action: {lastAction || 'none'} | Content length: {props.content?.length || 0}
      </div>
    </div>
  );
}

export default function PublishLabPage() {
  const { t: _t } = useI18n();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-electric bg-clip-text text-4xl font-bold text-transparent">
            PublishActions Visual Lab
          </h1>
          <p className="text-lg text-muted-foreground">
            Visual testing laboratory for all PublishActions button states and interactions
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
            {PUBLISH_STATES.map(state => (
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
                  data-testid={`publish-${state.id}`}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-center text-2xl font-bold">All States (Automated Visual Testing)</h2>

          {PUBLISH_STATES.map(state => (
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
                  Logged In: {state.props.isLoggedIn ? 'Yes' : 'No'} | Signature:{' '}
                  {state.props.showSignature ? 'Yes' : 'No'} | Content:{' '}
                  {state.props.content?.length || 0} chars
                </div>
              </div>

              {/* PublishActions Instance */}
              <div
                className="mx-auto max-w-3xl rounded-2xl border border-border/10 bg-card/30 p-8 backdrop-blur-sm"
                data-testid={`publish-${state.id}`}
              >
                <TestablePublishActions testId={`publish-actions-${state.id}`} {...state.props} />
              </div>
            </div>
          ))}
        </div>

        {/* Hover State Testing */}
        <div className="mt-16 rounded-xl bg-muted/20 p-6">
          <h3 className="mb-3 font-semibold">Hover State Testing:</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Hover over buttons to test hover states. The share button has special electric styling.
          </p>
          <div className="rounded-2xl border border-border/10 bg-card/30 p-8 backdrop-blur-sm">
            <TestablePublishActions
              testId="hover-test"
              content={MOCK_CONTENT.medium}
              isLoggedIn={true}
              showSignature={false}
            />
          </div>
        </div>

        {/* Mobile Viewport Testing */}
        <div className="mt-8 rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
          <h3 className="mb-3 font-semibold">📱 Mobile Testing</h3>
          <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
            Responsive design testing for mobile viewports (375px and up)
          </p>
          <div className="mx-auto max-w-sm rounded-2xl border border-border/10 bg-card/30 p-8 backdrop-blur-sm">
            <TestablePublishActions
              testId="mobile-test"
              content={MOCK_CONTENT.short}
              isLoggedIn={false}
              showSignature={false}
            />
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
          <h4 className="mb-2 font-semibold text-green-800 dark:text-green-400">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300">
            All mock data and interactions are deterministic for consistent visual snapshots. Button
            states, content lengths, and popup behaviors are fixed for reproducible testing.
          </p>
        </div>
      </div>
    </div>
  );
}
