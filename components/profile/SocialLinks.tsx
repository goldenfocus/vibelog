// Helper function to clean URL for display
function cleanUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/^www\./, '') // Remove www.
    .replace(/\/$/, ''); // Remove trailing slash
}

export function SocialLinks({
  profile,
  animated: _animated = false,
}: {
  profile: {
    twitter_url?: string | null;
    instagram_url?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    youtube_url?: string | null;
    tiktok_url?: string | null;
    facebook_url?: string | null;
    threads_url?: string | null;
    website_url?: string | null;
  };
  animated?: boolean;
}) {
  const socialLinks = [
    { url: profile.twitter_url, label: 'X', icon: '𝕏', isWebsite: false },
    { url: profile.instagram_url, label: 'Instagram', icon: '📷', isWebsite: false },
    { url: profile.linkedin_url, label: 'LinkedIn', icon: '💼', isWebsite: false },
    { url: profile.github_url, label: 'GitHub', icon: '🐙', isWebsite: false },
    { url: profile.youtube_url, label: 'YouTube', icon: '📺', isWebsite: false },
    { url: profile.tiktok_url, label: 'TikTok', icon: '🎵', isWebsite: false },
    { url: profile.facebook_url, label: 'Facebook', icon: '👍', isWebsite: false },
    { url: profile.threads_url, label: 'Threads', icon: '🧵', isWebsite: false },
    {
      url: profile.website_url,
      label: profile.website_url ? cleanUrl(profile.website_url) : 'Website',
      icon: '🌐',
      isWebsite: true,
    },
  ].filter(link => link.url);

  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {socialLinks.map(link => (
        <a
          key={link.label}
          href={link.url!}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-electric/50 hover:bg-electric/10 ${
            link.isWebsite
              ? 'hover:scale-105 hover:shadow-lg hover:shadow-electric/20 active:scale-95'
              : ''
          }`}
          aria-label={link.isWebsite ? link.label : link.label}
        >
          {!link.isWebsite && <span>{link.icon}</span>}
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
