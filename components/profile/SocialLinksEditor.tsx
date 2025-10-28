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
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseSocialUrl, type SocialPlatform } from '@/lib/social-links';

interface SocialLinksEditorProps {
  initialLinks: {
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
  onChange: (links: Record<string, string>) => void;
}

const SOCIAL_PLATFORMS = [
  {
    platform: 'twitter' as SocialPlatform,
    label: 'X (Twitter)',
    icon: Twitter,
    placeholder: '@username or full URL',
    color: 'text-muted-foreground',
  },
  {
    platform: 'instagram' as SocialPlatform,
    label: 'Instagram',
    icon: Instagram,
    placeholder: '@username or full URL',
    color: 'text-[#E4405F]',
  },
  {
    platform: 'linkedin' as SocialPlatform,
    label: 'LinkedIn',
    icon: Linkedin,
    placeholder: 'your-profile or full URL',
    color: 'text-[#0A66C2]',
  },
  {
    platform: 'github' as SocialPlatform,
    label: 'GitHub',
    icon: Github,
    placeholder: 'username or full URL',
    color: 'text-muted-foreground',
  },
  {
    platform: 'youtube' as SocialPlatform,
    label: 'YouTube',
    icon: Youtube,
    placeholder: '@channel or full URL',
    color: 'text-[#FF0000]',
  },
  {
    platform: 'tiktok' as SocialPlatform,
    label: 'TikTok',
    icon: Music,
    placeholder: '@username or full URL',
    color: 'text-muted-foreground',
  },
  {
    platform: 'facebook' as SocialPlatform,
    label: 'Facebook',
    icon: Facebook,
    placeholder: 'profile name or full URL',
    color: 'text-[#1877F2]',
  },
  {
    platform: 'threads' as SocialPlatform,
    label: 'Threads',
    icon: AtSign,
    placeholder: '@username or full URL',
    color: 'text-muted-foreground',
  },
  {
    platform: 'website' as SocialPlatform,
    label: 'Website',
    icon: Globe,
    placeholder: 'https://your-website.com',
    color: 'text-electric',
  },
];

export function SocialLinksEditor({ initialLinks, onChange }: SocialLinksEditorProps) {
  const [links, setLinks] = useState<Record<string, string>>({});

  // Initialize from props
  useEffect(() => {
    const initialState: Record<string, string> = {};
    SOCIAL_PLATFORMS.forEach(({ platform }) => {
      const key = `${platform}_url`;
      initialState[platform] = (initialLinks[key as keyof typeof initialLinks] as string) || '';
    });
    setLinks(initialState);
  }, [initialLinks]);

  const handleChange = (platform: string, rawValue: string) => {
    // Update local state with raw value (what user typed)
    setLinks(prev => ({
      ...prev,
      [platform]: rawValue,
    }));

    // Parse and normalize the URL
    const normalizedUrl = parseSocialUrl(rawValue, platform as SocialPlatform);

    // Send normalized URLs to parent
    const updatedLinks: Record<string, string> = {};
    SOCIAL_PLATFORMS.forEach(({ platform: p }) => {
      const key = `${p}_url`;
      if (p === platform) {
        updatedLinks[key] = normalizedUrl || '';
      } else {
        const currentNormalizedUrl = parseSocialUrl(links[p] || '', p as SocialPlatform);
        updatedLinks[key] = currentNormalizedUrl || '';
      }
    });

    onChange(updatedLinks);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Social Links</h3>
        <p className="text-sm text-muted-foreground">
          Add your social media profiles. You can paste full URLs or just usernames - we&apos;ll
          handle the rest!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map(({ platform, label, icon: Icon, placeholder, color }) => (
          <div key={platform} className="space-y-2">
            <Label htmlFor={platform} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </Label>
            <div className="relative">
              <Input
                id={platform}
                value={links[platform] || ''}
                onChange={e => handleChange(platform, e.target.value)}
                placeholder={placeholder}
                className="pr-10"
              />
              {links[platform] && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-electric" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-electric/20 bg-electric/5 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-electric">Pro tip:</span> You can paste any format! We
          accept full URLs (with or without https://), usernames (with or without @), or just the
          profile name. For example: &quot;@johndoe&quot;, &quot;johndoe&quot;,
          &quot;twitter.com/johndoe&quot;, or &quot;https://twitter.com/johndoe&quot; all work!
        </p>
      </div>
    </div>
  );
}
