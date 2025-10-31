-- Add missing profile fields for enhanced profile customization
-- This migration adds header image, bio, and social media links

-- Add header image
alter table public.profiles
add column if not exists header_image text;

-- Add bio field
alter table public.profiles
add column if not exists bio text;

-- Add social media links
alter table public.profiles
add column if not exists twitter_url text;

alter table public.profiles
add column if not exists instagram_url text;

alter table public.profiles
add column if not exists linkedin_url text;

alter table public.profiles
add column if not exists github_url text;

alter table public.profiles
add column if not exists youtube_url text;

alter table public.profiles
add column if not exists tiktok_url text;

alter table public.profiles
add column if not exists facebook_url text;

alter table public.profiles
add column if not exists threads_url text;

alter table public.profiles
add column if not exists website_url text;

-- Add comment for documentation
comment on column public.profiles.header_image is 'Banner/header image URL for profile page';
comment on column public.profiles.bio is 'User biography/description (max 500 chars)';
comment on column public.profiles.twitter_url is 'Twitter/X profile URL';
comment on column public.profiles.instagram_url is 'Instagram profile URL';
comment on column public.profiles.linkedin_url is 'LinkedIn profile URL';
comment on column public.profiles.github_url is 'GitHub profile URL';
comment on column public.profiles.youtube_url is 'YouTube channel URL';
comment on column public.profiles.tiktok_url is 'TikTok profile URL';
comment on column public.profiles.facebook_url is 'Facebook profile URL';
comment on column public.profiles.threads_url is 'Threads profile URL';
comment on column public.profiles.website_url is 'Personal website URL';
