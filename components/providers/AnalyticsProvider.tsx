'use client';

/**
 * Analytics Provider
 *
 * Initializes PostHog analytics and provides analytics context
 * to the entire application.
 */

import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

import { config } from '@/lib/config';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog
  useEffect(() => {
    if (!config.features.analytics) {
      return;
    }

    // Get PostHog API key from environment
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (!posthogKey) {
      if (config.features.debugMode) {
        console.warn('PostHog API key not found. Analytics will be disabled.');
      }
      return;
    }

    // Initialize PostHog
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        loaded: posthogInstance => {
          if (config.features.debugMode) {
            posthogInstance.debug();
            console.log('PostHog initialized');
          }
        },
        autocapture: false, // We want explicit tracking for better control
        capture_pageview: false, // We'll manually track page views
        disable_session_recording: false, // Enable session recordings for debugging
        enable_recording_console_log: config.features.debugMode,
        session_recording: {
          recordCrossOriginIframes: false,
          maskAllInputs: true, // Mask sensitive inputs
          maskTextSelector: '[data-mask]', // Allow explicit masking
        },
      });
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (!config.features.analytics || !pathname) {
      return;
    }

    // Build the full URL with search params
    let url = pathname;
    if (searchParams && searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }

    // Track page view
    posthog.capture('$pageview', {
      $current_url: url,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
