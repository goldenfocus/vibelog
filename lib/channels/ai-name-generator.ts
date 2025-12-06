import 'server-only';

import OpenAI from 'openai';

import { trackAICost } from '@/lib/ai-cost-tracker';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Topic to friendly display name mapping
 * Used as fallback when AI generation fails
 */
export const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  technology: 'Technology',
  business: 'Business',
  'personal-growth': 'Personal Growth',
  lifestyle: 'Lifestyle',
  'health-wellness': 'Health & Wellness',
  creativity: 'Creativity',
  education: 'Education',
  entertainment: 'Entertainment',
  travel: 'Travel',
  'food-cooking': 'Food & Cooking',
  relationships: 'Relationships',
  career: 'Career',
  finance: 'Finance',
  parenting: 'Parenting',
  sports: 'Sports',
  science: 'Science',
  politics: 'Politics',
  culture: 'Culture',
  spirituality: 'Spirituality',
  other: 'General',
};

/**
 * Generate a creative, short channel name using AI
 *
 * @param topic - The channel topic (e.g., "spirituality", "business")
 * @param vibelogContent - The first vibelog content for context
 * @returns Creative name like "Awakening Echoes" or null if failed
 */
export async function generateChannelName(
  topic: string,
  vibelogContent: string
): Promise<string | null> {
  try {
    // Truncate content to avoid token limits
    const truncatedContent = vibelogContent.slice(0, 500);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a creative naming expert. Generate a short, memorable 2-3 word channel name that captures the essence of the content. The name should be:
- Evocative and emotional
- Easy to remember
- 2-3 words maximum
- No punctuation or special characters
- Title case

Examples for different topics:
- Spirituality: "Awakening Echoes", "Soul Whispers", "Inner Light"
- Business: "Hustle Chronicles", "Growth Mindset", "Venture Notes"
- Health: "Vital Living", "Wellness Journey", "Body Mind"
- Technology: "Digital Horizons", "Tech Pulse", "Code Stories"
- Creativity: "Art Unleashed", "Creative Flow", "Vision Board"

Return ONLY the name, nothing else.`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}
Content preview: ${truncatedContent}

Generate a creative channel name:`,
        },
      ],
      max_tokens: 20,
      temperature: 0.8, // Higher creativity
    });

    // Track cost (GPT-4o-mini: $0.15/1M input, $0.60/1M output)
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;
    await trackAICost(null, 'gpt-4o-mini', cost, {
      endpoint: 'channel-name-generation',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });

    const name = response.choices[0]?.message?.content?.trim();

    // Validate the name (2-4 words, no weird characters)
    if (
      name &&
      name.split(' ').length >= 2 &&
      name.split(' ').length <= 4 &&
      /^[A-Za-z\s]+$/.test(name)
    ) {
      return name;
    }

    console.warn('[ai-name-generator] Invalid name generated:', name);
    return null;
  } catch (error) {
    console.error('[ai-name-generator] Error generating channel name:', error);
    return null;
  }
}

/**
 * Get the display name for a topic
 * Returns the friendly name (e.g., "Personal Growth" for "personal-growth")
 */
export function getTopicDisplayName(topic: string): string {
  return (
    TOPIC_DISPLAY_NAMES[topic] || topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' ')
  );
}
