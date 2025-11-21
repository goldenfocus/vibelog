import { MetadataRoute } from 'next';

import { createServerSupabaseClient } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabaseClient();

  // Fetch all published, public vibelogs with author info
  const { data: vibelogs } = await supabase
    .from('vibelogs')
    .select(
      `
      slug,
      public_slug,
      published_at,
      user_id,
      profiles!inner(username)
    `
    )
    .eq('is_published', true)
    .eq('is_public', true)
    .order('published_at', { ascending: false })
    .limit(5000);

  // Fetch all public user profiles for profile pages
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .not('username', 'is', null)
    .limit(1000);

  // Generate vibelog URLs
  const vibelogUrls: MetadataRoute.Sitemap =
    vibelogs?.map(v => {
      const profile = v.profiles as unknown as { username: string };
      const vibelogSlug = v.slug || v.public_slug;
      return {
        url: `https://vibelog.io/@${profile.username}/${vibelogSlug}`,
        lastModified: new Date(v.published_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    }) || [];

  // Generate profile URLs
  const profileUrls: MetadataRoute.Sitemap =
    profiles?.map(p => ({
      url: `https://vibelog.io/@${p.username}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })) || [];

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://vibelog.io',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://vibelog.io/community',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: 'https://vibelog.io/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://vibelog.io/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: 'https://vibelog.io/faq',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  return [...staticPages, ...profileUrls, ...vibelogUrls];
}
