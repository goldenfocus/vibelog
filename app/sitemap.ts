import { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/lib/seo/hreflang';
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

  // Generate vibelog URLs (localized, except profile part stays clean)
  const vibelogUrls: MetadataRoute.Sitemap = [];
  vibelogs?.forEach(v => {
    const profile = v.profiles as unknown as { username: string };
    const vibelogSlug = v.slug || v.public_slug;
    const lastModified = new Date(v.published_at);

    // Generate URL for each locale (vibelog pages get locale prefix)
    SUPPORTED_LOCALES.forEach(locale => {
      vibelogUrls.push({
        url: `https://vibelog.io/${locale}/@${profile.username}/${vibelogSlug}`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      });
    });
  });

  // Generate profile URLs (clean, no locale - for easy sharing)
  const profileUrls: MetadataRoute.Sitemap =
    profiles?.map(p => ({
      url: `https://vibelog.io/@${p.username}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })) || [];

  // Static pages (all localized)
  const staticPagesBase = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/community', priority: 0.9, changeFrequency: 'hourly' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/pricing', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/people', priority: 0.5, changeFrequency: 'daily' as const },
  ];

  const staticPages: MetadataRoute.Sitemap = [];
  staticPagesBase.forEach(page => {
    SUPPORTED_LOCALES.forEach(locale => {
      const localePath = page.path === '' ? `/${locale}` : `/${locale}${page.path}`;
      staticPages.push({
        url: `https://vibelog.io${localePath}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    });
  });

  return [...staticPages, ...profileUrls, ...vibelogUrls];
}
