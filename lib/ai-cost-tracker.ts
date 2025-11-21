import { createServerAdminClient } from '@/lib/supabaseAdmin';

// Cost estimates per service (OpenAI pricing as of 2025)
const COST_RATES = {
  whisper: 0.006, // per minute
  'gpt-4o-mini': {
    input: 0.00015, // per 1K tokens ($0.15/1M)
    output: 0.0006, // per 1K tokens ($0.60/1M)
  },
  'gpt-4o': {
    input: 0.0025, // per 1K tokens ($2.50/1M)
    output: 0.01, // per 1K tokens ($10/1M)
  },
  'tts-1-hd': 0.03, // per 1K characters
  'dall-e-3': 0.08, // per image (1792x1024 wide format)
};

const DAILY_COST_LIMIT = 50; // $50 per day circuit breaker

/**
 * Track AI API cost and enforce daily limit
 */
export async function trackAICost(
  userId: string | null,
  service: 'whisper' | 'gpt-4o-mini' | 'gpt-4o' | 'tts-1-hd' | 'dall-e-3',
  cost: number,
  metadata?: {
    endpoint?: string;
    cache_hit?: boolean;
    input_tokens?: number;
    output_tokens?: number;
    duration_seconds?: number;
    [key: string]: any;
  }
): Promise<{ allowed: boolean; dailyTotal: number }> {
  try {
    const supabase = await createServerAdminClient();

    // Log the usage (fire and forget - don't block on errors)
    supabase
      .from('ai_usage_log')
      .insert({
        user_id: userId,
        service,
        endpoint: metadata?.endpoint,
        estimated_cost: cost,
        input_tokens: metadata?.input_tokens,
        output_tokens: metadata?.output_tokens,
        cache_hit: metadata?.cache_hit || false,
        metadata,
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[COST TRACKER] Failed to log usage:', error.message);
        }
      });

    // Check daily total
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyCost, error: fetchError } = await supabase
      .from('ai_daily_costs')
      .select('total_cost')
      .eq('date', today)
      .maybeSingle();

    if (fetchError) {
      console.warn('[COST TRACKER] Error fetching daily cost:', fetchError.message);
      return { allowed: true, dailyTotal: 0 }; // Allow on error
    }

    const currentTotal = (dailyCost?.total_cost || 0) + cost;

    // Update or insert daily cost (fire and forget)
    supabase
      .from('ai_daily_costs')
      .upsert(
        {
          date: today,
          total_cost: currentTotal,
        },
        { onConflict: 'date' }
      )
      .then(({ error }) => {
        if (error) {
          console.warn('[COST TRACKER] Failed to update daily cost:', error.message);
        }
      });

    // Circuit breaker
    if (currentTotal > DAILY_COST_LIMIT) {
      console.error(
        `🚨 EMERGENCY: Daily AI cost exceeded $${DAILY_COST_LIMIT}! Current: $${currentTotal.toFixed(2)}`
      );
      supabase
        .from('ai_daily_costs')
        .update({ disabled_at: new Date().toISOString() })
        .eq('date', today);
      return { allowed: false, dailyTotal: currentTotal };
    }

    console.log(
      `[COST] ${service} - User: ${userId || 'anonymous'} - Cost: $${cost.toFixed(4)} - Daily total: $${currentTotal.toFixed(2)}`
    );

    return { allowed: true, dailyTotal: currentTotal };
  } catch (err) {
    console.warn('[COST TRACKER] Exception in trackAICost:', err);
    return { allowed: true, dailyTotal: 0 }; // Allow on exception
  }
}

/**
 * Check if daily cost limit has been exceeded
 */
export async function isDailyLimitExceeded(): Promise<boolean> {
  try {
    const supabase = await createServerAdminClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ai_daily_costs')
      .select('total_cost, disabled_at')
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.warn('[COST TRACKER] Error checking daily limit:', error.message);
      return false; // On error, allow request to proceed
    }

    // If no row exists for today, we haven't spent anything yet - allow requests
    if (!data) {
      return false;
    }

    // Check if circuit breaker was triggered OR if we've exceeded the limit
    return data.disabled_at !== null || data.total_cost >= DAILY_COST_LIMIT;
  } catch (err) {
    console.warn('[COST TRACKER] Exception checking daily limit:', err);
    return false; // On exception, allow request to proceed
  }
}

/**
 * Calculate cost for Whisper transcription
 */
export function calculateWhisperCost(durationSeconds: number): number {
  return (durationSeconds / 60) * COST_RATES.whisper;
}

/**
 * Calculate cost for GPT-4o-mini text generation
 */
export function calculateGPTCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1000) * COST_RATES['gpt-4o-mini'].input +
    (outputTokens / 1000) * COST_RATES['gpt-4o-mini'].output
  );
}

/**
 * Calculate cost for TTS (text-to-speech)
 */
export function calculateTTSCost(textLength: number): number {
  return (textLength / 1000) * COST_RATES['tts-1-hd'];
}

/**
 * Calculate cost for DALL-E image generation
 */
export function calculateImageCost(): number {
  return COST_RATES['dall-e-3'];
}

/**
 * Estimate GPT-4o-mini tokens from text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
