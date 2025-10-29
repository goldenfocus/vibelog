/**
 * Analytics Hook
 *
 * Provides easy access to analytics tracking throughout the app.
 * Wraps PostHog with a type-safe interface.
 */

import posthog from 'posthog-js';
import { useCallback } from 'react';

import type { EventName, EventProperties } from '@/lib/analytics';
import { config } from '@/lib/config';

export interface AnalyticsUser {
  id: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export function useAnalytics() {
  /**
   * Track an event with optional properties
   */
  const track = useCallback((eventName: EventName, properties?: EventProperties) => {
    if (!config.features.analytics) {
      return;
    }

    try {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Fail silently - analytics errors shouldn't break the app
      if (config.features.debugMode) {
        console.error('Analytics tracking error:', error);
      }
    }
  }, []);

  /**
   * Identify a user for analytics
   */
  const identify = useCallback((user: AnalyticsUser) => {
    if (!config.features.analytics) {
      return;
    }

    try {
      const { id, ...properties } = user;
      posthog.identify(id, properties);
    } catch (error) {
      if (config.features.debugMode) {
        console.error('Analytics identify error:', error);
      }
    }
  }, []);

  /**
   * Set user properties
   */
  const setUserProperties = useCallback((properties: Record<string, unknown>) => {
    if (!config.features.analytics) {
      return;
    }

    try {
      posthog.people.set(properties);
    } catch (error) {
      if (config.features.debugMode) {
        console.error('Analytics set user properties error:', error);
      }
    }
  }, []);

  /**
   * Reset analytics (on logout)
   */
  const reset = useCallback(() => {
    if (!config.features.analytics) {
      return;
    }

    try {
      posthog.reset();
    } catch (error) {
      if (config.features.debugMode) {
        console.error('Analytics reset error:', error);
      }
    }
  }, []);

  /**
   * Track page view
   */
  const trackPageView = useCallback((pageName: string, properties?: Record<string, unknown>) => {
    if (!config.features.analytics) {
      return;
    }

    try {
      posthog.capture('$pageview', {
        page: pageName,
        ...properties,
      });
    } catch (error) {
      if (config.features.debugMode) {
        console.error('Analytics page view error:', error);
      }
    }
  }, []);

  /**
   * Track time spent on a specific action
   */
  const startTiming = useCallback(
    (timerName: string) => {
      const startTime = Date.now();
      return {
        end: (properties?: Record<string, unknown>) => {
          const duration = Date.now() - startTime;
          track(`${timerName}_completed` as EventName, {
            duration,
            ...properties,
          });
          return duration;
        },
      };
    },
    [track]
  );

  /**
   * Track feature flag evaluation
   */
  const trackFeatureFlag = useCallback((flagName: string, enabled: boolean) => {
    if (!config.features.analytics) {
      return;
    }

    try {
      posthog.capture('feature_flag_evaluated', {
        flag: flagName,
        enabled,
      });
    } catch (error) {
      if (config.features.debugMode) {
        console.error('Analytics feature flag error:', error);
      }
    }
  }, []);

  /**
   * Check if analytics is enabled
   */
  const isEnabled = config.features.analytics;

  return {
    track,
    identify,
    setUserProperties,
    reset,
    trackPageView,
    startTiming,
    trackFeatureFlag,
    isEnabled,
  };
}

// Export type for use in other components
export type Analytics = ReturnType<typeof useAnalytics>;
