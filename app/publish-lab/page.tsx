"use client";

import React, { useState } from "react";
import PublishActions from "@/components/mic/PublishActions";
import { useI18n } from "@/components/providers/I18nProvider";

// Mock data for deterministic visual testing
const MOCK_CONTENT = {
  short: "Short blog content for testing.",
  medium: "This is a medium-length blog content that demonstrates how the PublishActions component handles typical content. It includes multiple sentences and provides a good example of normal blog post length for copy and share functionality.",
  long: "This is a much longer blog content that demonstrates how the PublishActions component handles extensive content. It contains multiple paragraphs and sentences to show how the copy functionality works with larger amounts of text. This type of content would typically result from longer recordings and helps us test the behavior with substantial text content. The component should gracefully handle this amount of text while maintaining proper functionality and performance throughout the publishing process.",
  empty: "",
  withSignature: "Blog content that will include a signature when copied."
};

interface PublishLabState {
  id: string;
  name: string;
  description: string;
  props: any;
}

const PUBLISH_STATES: PublishLabState[] = [
  {
    id: "logged-out-idle",
    name: "Logged Out - Idle",
    description: "Default state for logged out user",
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: false,
      showSignature: false
    }
  },
  {
    id: "logged-in-idle", 
    name: "Logged In - Idle",
    description: "Default state for logged in user",
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: true,
      showSignature: false
    }
  },
  {
    id: "short-content",
    name: "Short Content",
    description: "Actions with short blog content",
    props: {
      content: MOCK_CONTENT.short,
      isLoggedIn: false,
      showSignature: false
    }
  },
  {
    id: "long-content",
    name: "Long Content", 
    description: "Actions with long blog content",
    props: {
      content: MOCK_CONTENT.long,
      isLoggedIn: false,
      showSignature: false
    }
  },
  {
    id: "empty-content",
    name: "Empty Content",
    description: "Actions with empty content",
    props: {
      content: MOCK_CONTENT.empty,
      isLoggedIn: false,
      showSignature: false
    }
  },
  {
    id: "with-signature",
    name: "With Signature",
    description: "Copy includes signature",
    props: {
      content: MOCK_CONTENT.withSignature,
      isLoggedIn: true,
      showSignature: true
    }
  },
  {
    id: "edit-popup-shown",
    name: "Edit Popup",
    description: "Edit login popup displayed",
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: false,
      showSignature: false,
      forceShowEditPopup: true
    }
  },
  {
    id: "save-popup-shown",
    name: "Save Popup",
    description: "Save login popup displayed", 
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: false,
      showSignature: false,
      forceShowSavePopup: true
    }
  },
  {
    id: "disabled-state",
    name: "Disabled State",
    description: "All buttons disabled",
    props: {
      content: MOCK_CONTENT.medium,
      isLoggedIn: true,
      showSignature: false,
      disabled: true
    }
  }
];

// Enhanced PublishActions wrapper for testing different states
function TestablePublishActions({ 
  testId, 
  forceShowEditPopup = false,
  forceShowSavePopup = false,
  disabled = false,
  ...props 
}: any) {
  const [copiedContent, setCopiedContent] = useState<string>('');
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
    }
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Login Required</h3>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <div className="w-5 h-5">X</div>
              </button>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Please sign in to edit your content
            </p>
            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-2xl transition-all duration-200">
                <div className="w-5 h-5">LogIn</div>
                Sign In to Edit
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors text-center py-2">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {forceShowSavePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Login Required</h3>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <div className="w-5 h-5">X</div>
              </button>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Please sign in to save your content
            </p>
            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-electric hover:opacity-90 text-white font-semibold rounded-2xl transition-all duration-200">
                <div className="w-5 h-5">LogIn</div>
                Sign In to Save
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-colors text-center py-2">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug info */}
      <div className="mt-4 p-2 bg-muted/10 rounded text-xs text-muted-foreground">
        Last action: {lastAction || 'none'} | Content length: {props.content?.length || 0}
      </div>
    </div>
  );
}

export default function PublishLabPage() {
  const { t } = useI18n();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-electric bg-clip-text text-transparent">
            PublishActions Visual Lab
          </h1>
          <p className="text-muted-foreground text-lg">
            Visual testing laboratory for all PublishActions button states and interactions
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
            {PUBLISH_STATES.map((state) => (
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
                  data-testid="publish-{state.id}"
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* All States Display - For Comprehensive Visual Testing */}
        <div className="space-y-12">
          <h2 className="text-2xl font-bold text-center">All States (Automated Visual Testing)</h2>
          
          {PUBLISH_STATES.map((state) => (
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
                  Logged In: {state.props.isLoggedIn ? 'Yes' : 'No'} | 
                  Signature: {state.props.showSignature ? 'Yes' : 'No'} | 
                  Content: {state.props.content?.length || 0} chars
                </div>
              </div>
              
              {/* PublishActions Instance */}
              <div 
                className="max-w-3xl mx-auto bg-card/30 backdrop-blur-sm rounded-2xl p-8 border border-border/10"
                data-testid={`publish-${state.id}`}
              >
                <TestablePublishActions
                  testId={`publish-actions-${state.id}`}
                  {...state.props}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Hover State Testing */}
        <div className="mt-16 p-6 bg-muted/20 rounded-xl">
          <h3 className="font-semibold mb-3">Hover State Testing:</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Hover over buttons to test hover states. The share button has special electric styling.
          </p>
          <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-8 border border-border/10">
            <TestablePublishActions
              testId="hover-test"
              content={MOCK_CONTENT.medium}
              isLoggedIn={true}
              showSignature={false}
            />
          </div>
        </div>

        {/* Mobile Viewport Testing */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h3 className="font-semibold mb-3">📱 Mobile Testing</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            Responsive design testing for mobile viewports (375px and up)
          </p>
          <div className="max-w-sm mx-auto bg-card/30 backdrop-blur-sm rounded-2xl p-8 border border-border/10">
            <TestablePublishActions
              testId="mobile-test"
              content={MOCK_CONTENT.short}
              isLoggedIn={false}
              showSignature={false}
            />
          </div>
        </div>

        {/* Deterministic Data Notice */}
        <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">
            📊 Deterministic Test Data
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300">
            All mock data and interactions are deterministic for consistent visual snapshots. 
            Button states, content lengths, and popup behaviors are fixed for reproducible testing.
          </p>
        </div>
      </div>
    </div>
  );
}