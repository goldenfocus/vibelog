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

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

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

/**
 * Format date as "Month DD, YYYY" with i18n support
 * Uses UTC to ensure consistent output across timezones
 */
export function formatFullDateI18n(dateString: string, t: TranslateFunction): string {
  const date = new Date(dateString);
  const monthKey = MONTH_KEYS[date.getUTCMonth()];
  const month = t(`dates.months.${monthKey}`);
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/**
 * Format date as relative time (e.g., "2 minutes ago", "3 hours ago")
 * Uses UTC to ensure consistent output across timezones
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return formatFullDate(dateString);
  }
}

/**
 * Format date as relative time with i18n support
 * Uses UTC to ensure consistent output across timezones
 */
export function formatRelativeTimeI18n(dateString: string, t: TranslateFunction): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return t('dates.justNow');
  } else if (diffMins < 60) {
    return diffMins === 1
      ? t('dates.minuteAgo', { count: diffMins })
      : t('dates.minutesAgo', { count: diffMins });
  } else if (diffHours < 24) {
    return diffHours === 1
      ? t('dates.hourAgo', { count: diffHours })
      : t('dates.hoursAgo', { count: diffHours });
  } else if (diffDays < 7) {
    return diffDays === 1
      ? t('dates.dayAgo', { count: diffDays })
      : t('dates.daysAgo', { count: diffDays });
  } else {
    return formatFullDateI18n(dateString, t);
  }
}
