'use client';

import {
  AtSign,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Music,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';

import { getAllSocialLinks, type SocialLink } from '@/lib/social-links';

const ICON_MAP: Record<string, LucideIcon> = {
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Youtube,
  Music,
  Facebook,
  AtSign,
  Globe,
};

interface SocialLinksProps {
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
  variant?: 'default' | 'large';
  animated?: boolean;
}

export function SocialLinks({ profile, variant = 'default', animated = true }: SocialLinksProps) {
  const socialLinks = getAllSocialLinks(profile);

  if (socialLinks.length === 0) {
    return null;
  }

  const sizeClasses = variant === 'large' ? 'h-12 w-12 text-lg' : 'h-10 w-10 text-base';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {socialLinks.map((link, index) => (
        <SocialLinkButton
          key={link.platform}
          link={link}
          index={index}
          sizeClasses={sizeClasses}
          animated={animated}
        />
      ))}
    </div>
  );
}

interface SocialLinkButtonProps {
  link: SocialLink;
  index: number;
  sizeClasses: string;
  animated: boolean;
}

function SocialLinkButton({ link, index, sizeClasses, animated }: SocialLinkButtonProps) {
  const Icon = ICON_MAP[link.icon];

  if (!Icon) {
    return null;
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={link.label}
      className={` ${sizeClasses} bg-surface/50 group flex items-center justify-center rounded-full border border-border/50 text-muted-foreground backdrop-blur-sm transition-all duration-300 ${link.color} hover:bg-surface/80 hover:scale-110 hover:border-electric/30 hover:shadow-lg hover:shadow-electric/20 active:scale-95 ${animated ? 'animate-fadeInUp' : ''} `}
      style={{
        animationDelay: animated ? `${index * 50}ms` : '0ms',
      }}
    >
      <Icon
        className="h-1/2 w-1/2 transition-transform duration-300 group-hover:rotate-6"
        strokeWidth={1.5}
      />
    </a>
  );
}

// Compact version for cards and smaller spaces
export function SocialLinksCompact({
  profile,
  maxVisible = 5,
}: {
  profile: SocialLinksProps['profile'];
  maxVisible?: number;
}) {
  const socialLinks = getAllSocialLinks(profile);

  if (socialLinks.length === 0) {
    return null;
  }

  const visibleLinks = socialLinks.slice(0, maxVisible);
  const remainingCount = socialLinks.length - maxVisible;

  return (
    <div className="flex items-center gap-1.5">
      {visibleLinks.map(link => {
        const Icon = ICON_MAP[link.icon];
        if (!Icon) {
          return null;
        }

        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={`bg-surface/30 flex h-7 w-7 items-center justify-center rounded-full border border-border/30 text-muted-foreground/80 transition-all duration-200 ${link.color} hover:bg-surface/60 hover:scale-125 hover:border-electric/40 active:scale-95`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        );
      })}
      {remainingCount > 0 && (
        <span className="ml-1 text-xs text-muted-foreground/60">+{remainingCount}</span>
      )}
    </div>
  );
}
