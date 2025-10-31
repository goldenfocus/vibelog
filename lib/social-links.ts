/**
 * Smart social media URL parser
 * Handles various input formats and normalizes them to proper URLs
 * Never throws errors - always returns a valid URL or null
 */

export type SocialPlatform =
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'github'
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'threads'
  | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  username?: string;
  icon: string;
  label: string;
  color: string; // Tailwind color class
}

const PLATFORM_PATTERNS = {
  twitter: {
    domains: ['twitter.com', 'x.com'],
    baseUrl: 'https://x.com/',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/,
    icon: 'Twitter',
    label: 'X (Twitter)',
    color: 'hover:text-black dark:hover:text-white',
  },
  instagram: {
    domains: ['instagram.com'],
    baseUrl: 'https://instagram.com/',
    regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/,
    icon: 'Instagram',
    label: 'Instagram',
    color: 'hover:text-[#E4405F]',
  },
  linkedin: {
    domains: ['linkedin.com'],
    baseUrl: 'https://linkedin.com/in/',
    regex: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/,
    icon: 'Linkedin',
    label: 'LinkedIn',
    color: 'hover:text-[#0A66C2]',
  },
  github: {
    domains: ['github.com'],
    baseUrl: 'https://github.com/',
    regex: /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9-]+)/,
    icon: 'Github',
    label: 'GitHub',
    color: 'hover:text-[#333] dark:hover:text-white',
  },
  youtube: {
    domains: ['youtube.com', 'youtu.be'],
    baseUrl: 'https://www.youtube.com/',
    // Capture format prefix (c/, channel/, user/, @) in group 1, username in group 2
    regex:
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/((?:c\/|channel\/|user\/|@)?)([a-zA-Z0-9_-]+)|youtu\.be\/([a-zA-Z0-9_-]+))/,
    icon: 'Youtube',
    label: 'YouTube',
    color: 'hover:text-[#FF0000]',
  },
  tiktok: {
    domains: ['tiktok.com'],
    baseUrl: 'https://tiktok.com/@',
    regex: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9_.]+)/,
    icon: 'Music', // Lucide doesn't have TikTok, use Music as fallback
    label: 'TikTok',
    color: 'hover:text-[#000000] dark:hover:text-[#FE2C55]',
  },
  facebook: {
    domains: ['facebook.com', 'fb.com'],
    baseUrl: 'https://facebook.com/',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([a-zA-Z0-9.]+)/,
    icon: 'Facebook',
    label: 'Facebook',
    color: 'hover:text-[#1877F2]',
  },
  threads: {
    domains: ['threads.net'],
    baseUrl: 'https://threads.net/@',
    regex: /(?:https?:\/\/)?(?:www\.)?threads\.net\/@?([a-zA-Z0-9_.]+)/,
    icon: 'AtSign', // Threads uses @ symbol, AtSign is close
    label: 'Threads',
    color: 'hover:text-black dark:hover:text-white',
  },
  website: {
    domains: [],
    baseUrl: '',
    regex: /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+)$/,
    icon: 'Globe',
    label: 'Website',
    color: 'hover:text-electric',
  },
};

/**
 * Parse and normalize a social media URL or username
 * @param input - Raw user input (URL, username, @username, etc.)
 * @param platform - Social media platform
 * @returns Normalized full URL or null if invalid
 */
export function parseSocialUrl(
  input: string | null | undefined,
  platform: SocialPlatform
): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim whitespace
  input = input.trim();
  if (!input) {
    return null;
  }

  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) {
    return null;
  }

  // For website, just ensure it has a protocol
  if (platform === 'website') {
    // Check if it already has a protocol
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    // Add https:// if missing
    return `https://${input}`;
  }

  // Try to extract username from URL
  const match = input.match(pattern.regex);
  if (match) {
    // Special handling for YouTube to preserve format prefix (@, c/, channel/, user/)
    if (platform === 'youtube') {
      const formatPrefix = match[1] || ''; // Could be '@', 'c/', 'channel/', 'user/', or ''
      const username = match[2] || match[3]; // Username from main domain or youtu.be
      if (username) {
        return `${pattern.baseUrl}${formatPrefix}${username}`;
      }
    }

    // Default handling for other platforms
    const username = match[1] || match[2]; // Some regexes have multiple capture groups
    if (username) {
      return `${pattern.baseUrl}${username}`;
    }
  }

  // If no match, treat as username
  // For YouTube, preserve @ if present, otherwise add it (modern format default)
  let username: string;
  if (platform === 'youtube') {
    // Keep @ if present, add if missing (modern YouTube format)
    username = input.startsWith('@') ? input : `@${input}`;
  } else {
    // Other platforms: remove @ symbol if present
    username = input.replace(/^@/, '');
  }

  // Remove any remaining URL parts
  username = username
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(new RegExp(`^(${pattern.domains.join('|')})/`), '')
    .trim();

  // Validate username (basic alphanumeric + common social media chars)
  // For YouTube, allow @ at the start
  const usernamePattern = platform === 'youtube' ? /^@?[a-zA-Z0-9_.-]+$/ : /^[a-zA-Z0-9_.-]+$/;
  if (!usernamePattern.test(username)) {
    return null;
  }

  return `${pattern.baseUrl}${username}`;
}

/**
 * Extract username from a social media URL
 * @param url - Full URL
 * @param platform - Social media platform
 * @returns Username or null
 */
export function extractUsername(
  url: string | null | undefined,
  platform: SocialPlatform
): string | null {
  if (!url) {
    return null;
  }

  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) {
    return null;
  }

  const match = url.match(pattern.regex);
  if (match) {
    return match[1] || match[2];
  }

  return null;
}

/**
 * Get social link metadata for display
 * @param platform - Social media platform
 * @param url - Normalized URL
 * @returns Social link object with display metadata
 */
export function getSocialLinkData(platform: SocialPlatform, url: string | null): SocialLink | null {
  if (!url) {
    return null;
  }

  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) {
    return null;
  }

  return {
    platform,
    url,
    username: extractUsername(url, platform),
    icon: pattern.icon,
    label: pattern.label,
    color: pattern.color,
  };
}

/**
 * Get all social links from a profile
 * @param profile - User profile object
 * @returns Array of social link objects
 */
export function getAllSocialLinks(profile: {
  twitter_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  facebook_url?: string | null;
  threads_url?: string | null;
  website_url?: string | null;
}): SocialLink[] {
  const links: SocialLink[] = [];

  const platformMap: Record<SocialPlatform, string | null | undefined> = {
    twitter: profile.twitter_url,
    instagram: profile.instagram_url,
    linkedin: profile.linkedin_url,
    github: profile.github_url,
    youtube: profile.youtube_url,
    tiktok: profile.tiktok_url,
    facebook: profile.facebook_url,
    threads: profile.threads_url,
    website: profile.website_url,
  };

  for (const [platform, url] of Object.entries(platformMap)) {
    if (url) {
      const linkData = getSocialLinkData(platform as SocialPlatform, url);
      if (linkData) {
        links.push(linkData);
      }
    }
  }

  return links;
}

/**
 * Validate if a URL belongs to a specific platform
 * @param url - URL to validate
 * @param platform - Expected platform
 * @returns True if URL matches platform
 */
export function isValidPlatformUrl(url: string, platform: SocialPlatform): boolean {
  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) {
    return false;
  }

  if (platform === 'website') {
    return pattern.regex.test(url);
  }

  return pattern.domains.some(domain => url.includes(domain));
}
