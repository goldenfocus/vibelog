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
    { url: profile.twitter_url, label: 'Twitter', icon: '𝕏' },
    { url: profile.instagram_url, label: 'Instagram', icon: '📷' },
    { url: profile.linkedin_url, label: 'LinkedIn', icon: '💼' },
    { url: profile.github_url, label: 'GitHub', icon: '🐙' },
    { url: profile.youtube_url, label: 'YouTube', icon: '📺' },
    { url: profile.tiktok_url, label: 'TikTok', icon: '🎵' },
    { url: profile.facebook_url, label: 'Facebook', icon: '👍' },
    { url: profile.threads_url, label: 'Threads', icon: '🧵' },
    { url: profile.website_url, label: 'Website', icon: '🌐' },
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
          className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-electric/50 hover:bg-electric/10"
          aria-label={link.label}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
