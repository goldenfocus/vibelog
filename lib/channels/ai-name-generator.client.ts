/**
 * Client-safe Topic Display Names
 *
 * This file contains only the static mapping for topic display names,
 * without any server-only dependencies. Use this in client components.
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
  other: 'Other',
};

/**
 * Get the human-readable display name for a topic
 */
export function getTopicDisplayName(topic: string): string {
  return TOPIC_DISPLAY_NAMES[topic] || topic.charAt(0).toUpperCase() + topic.slice(1);
}
