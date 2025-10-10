import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Analytics event schema
const AnalyticsEventSchema = z.object({
  name: z.string(),
  properties: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the event data
    const event = AnalyticsEventSchema.parse(body);

    // Log the event (in production, you'd send to your analytics service)
    console.log('Analytics Event:', {
      name: event.name,
      properties: event.properties,
      timestamp: event.timestamp || new Date().toISOString(),
      sessionId: event.sessionId,
      userId: event.userId,
    });

    // In production, you would:
    // 1. Send to your analytics service (PostHog, Mixpanel, etc.)
    // 2. Store in your database
    // 3. Send to monitoring services (Sentry, DataDog, etc.)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Invalid analytics data' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Analytics API endpoint',
    version: '1.0.0',
  });
}
