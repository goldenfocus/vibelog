/**
 * Date formatting utilities that produce consistent output on server and client
 * to prevent hydration mismatches
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format date as "Month Year" (e.g., "January 2024")
 * Uses UTC to ensure consistent output across timezones
 */
export function formatMonthYear(dateString: string): string {
  const date = new Date(dateString);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Format date as "Month DD, YYYY" (e.g., "January 15, 2024")
 * Uses UTC to ensure consistent output across timezones
 */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
