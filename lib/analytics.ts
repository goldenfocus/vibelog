/**
 * Analytics and monitoring utilities for VibeLog
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface UserSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  pageViews: number;
  events: AnalyticsEvent[];
  userAgent: string;
  referrer?: string;
}

class AnalyticsManager {
  private session: UserSession | null = null;
  private events: AnalyticsEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeSession();
  }

  private initializeSession(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      pageViews: 0,
      events: [],
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined,
    };

    this.isInitialized = true;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Track a custom event
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.isInitialized || !this.session) {
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        timestamp: new Date(),
        sessionId: this.session.id,
      },
      timestamp: new Date(),
      sessionId: this.session.id,
    };

    this.events.push(event);
    this.session.events.push(event);

    // Send to analytics service
    this.sendToAnalytics(event);
  }

  /**
   * Track page view
   */
  trackPageView(page: string, properties?: Record<string, unknown>): void {
    if (!this.session) {
      return;
    }

    this.session.pageViews++;
    this.track('page_view', {
      page,
      ...properties,
    });
  }

  /**
   * Track user action
   */
  trackAction(action: string, properties?: Record<string, unknown>): void {
    this.track('user_action', {
      action,
      ...properties,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: PerformanceMetrics): void {
    this.track('performance_metrics', {
      ...metrics,
      user_agent: navigator.userAgent,
      connection_type:
        (navigator as Record<string, unknown>).connection?.effectiveType || 'unknown',
      device_memory: (navigator as Record<string, unknown>).deviceMemory || 'unknown',
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track('error', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  /**
   * Track conversion
   */
  trackConversion(
    conversionType: string,
    value?: number,
    properties?: Record<string, unknown>
  ): void {
    this.track('conversion', {
      conversion_type: conversionType,
      value,
      ...properties,
    });
  }

  /**
   * Track recording session
   */
  trackRecordingSession(duration: number, quality: string, success: boolean): void {
    this.track('recording_session', {
      duration,
      quality,
      success,
      timestamp: new Date(),
    });
  }

  /**
   * Track AI processing
   */
  trackAIProcessing(
    type: 'transcription' | 'generation' | 'image',
    duration: number,
    success: boolean
  ): void {
    this.track('ai_processing', {
      type,
      duration,
      success,
      timestamp: new Date(),
    });
  }

  /**
   * Track publishing
   */
  trackPublishing(platforms: string[], success: boolean): void {
    this.track('publishing', {
      platforms,
      success,
      timestamp: new Date(),
    });
  }

  /**
   * Get session data
   */
  getSessionData(): UserSession | null {
    return this.session;
  }

  /**
   * Get events
   */
  getEvents(): AnalyticsEvent[] {
    return this.events;
  }

  /**
   * Clear events
   */
  clearEvents(): void {
    this.events = [];
    if (this.session) {
      this.session.events = [];
    }
  }

  /**
   * End session
   */
  endSession(): void {
    if (this.session) {
      this.session.endTime = new Date();
      this.track('session_end', {
        duration: this.session.endTime.getTime() - this.session.startTime.getTime(),
        page_views: this.session.pageViews,
        events_count: this.session.events.length,
      });
    }
  }

  /**
   * Send to analytics service
   */
  private sendToAnalytics(event: AnalyticsEvent): void {
    // Send to PostHog
    if (typeof window !== 'undefined' && (window as Record<string, unknown>).posthog) {
      (window as Record<string, unknown>).posthog.capture(event.name, event.properties);
    }

    // Send to Google Analytics
    if (typeof window !== 'undefined' && (window as Record<string, unknown>).gtag) {
      (window as Record<string, unknown>).gtag('event', event.name, event.properties);
    }

    // Send to custom analytics endpoint
    this.sendToCustomEndpoint(event);
  }

  /**
   * Send to custom analytics endpoint
   */
  private async sendToCustomEndpoint(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }
}

// Create singleton instance
export const analytics = new AnalyticsManager();

// Export types
export type { AnalyticsEvent, PerformanceMetrics, UserSession };

// Utility functions
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  analytics.track(name, properties);
}

export function trackPageView(page: string, properties?: Record<string, unknown>): void {
  analytics.trackPageView(page, properties);
}

export function trackError(error: Error, context?: Record<string, unknown>): void {
  analytics.trackError(error, context);
}

export function trackConversion(
  type: string,
  value?: number,
  properties?: Record<string, unknown>
): void {
  analytics.trackConversion(type, value, properties);
}

// Performance monitoring
export function trackPerformanceMetrics(metrics: PerformanceMetrics): void {
  analytics.trackPerformance(metrics);
}

// Recording analytics
export function trackRecording(duration: number, quality: string, success: boolean): void {
  analytics.trackRecordingSession(duration, quality, success);
}

// AI processing analytics
export function trackAI(
  type: 'transcription' | 'generation' | 'image',
  duration: number,
  success: boolean
): void {
  analytics.trackAIProcessing(type, duration, success);
}

// Publishing analytics
export function trackPublish(platforms: string[], success: boolean): void {
  analytics.trackPublishing(platforms, success);
}
