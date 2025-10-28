import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import Navigation from '@/components/Navigation';
import PublicVibelogContent from '@/components/PublicVibelogContent';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select('seo_title, seo_description, title, cover_url, cover_image_url')
    .eq('public_slug', slug)
    .single();

  // Log error for debugging but return generic metadata instead of "Not Found"
  if (error || !vibelog) {
    console.error('Metadata fetch error:', { slug, error });
    return {
      title: 'VibeLog - Turn Your Voice Into Stories',
      description: 'Share your story with the world on VibeLog',
    };
  }

  const coverImage = vibelog.cover_url || vibelog.cover_image_url;

  // Create unique metadata per vibelog
  const fallbackDescription =
    vibelog.seo_description ||
    (vibelog.title
      ? `Read "${vibelog.title}" on VibeLog`
      : 'Share your story with the world on VibeLog');

  return {
    title: `${vibelog.title} | VibeLog`,
    description: fallbackDescription,
    openGraph: {
      title: vibelog.title,
      description: fallbackDescription,
      images: coverImage ? [{ url: coverImage }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: vibelog.title,
      description: fallbackDescription,
      images: coverImage ? [coverImage] : [],
    },
  };
}

export default async function PublicVibelogPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch the vibelog by public_slug with author data
  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select('*, author:profiles!user_id(username, display_name)')
    .eq('public_slug', slug)
    .single();

  if (error || !vibelog) {
    console.error('Vibelog not found:', { slug, error });
    notFound(); // Use custom branded 404 page
  }

  // Check if this post has been claimed and should redirect
  if (vibelog.redirect_to) {
    redirect(vibelog.redirect_to);
  }

  // Increment view count (fire and forget)
  supabase
    .from('vibelogs')
    .update({ view_count: vibelog.view_count + 1 })
    .eq('id', vibelog.id)
    .then(() => {
      console.log(`📊 View count incremented for ${slug}`);
    });

  const coverImage = vibelog.cover_url || vibelog.cover_image_url;
  const isAnonymous = !vibelog.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Main content */}
      <main className="container mx-auto max-w-3xl px-4 pb-12 pt-24">
        {/* Cover Image */}
        {coverImage && (
          <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl border border-border/10 shadow-lg">
            <Image
              src={coverImage}
              alt={vibelog.cover_image_alt || vibelog.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-4xl font-bold leading-tight text-transparent dark:from-blue-400 dark:to-violet-400">
          {vibelog.title}
        </h1>

        {/* Meta */}
        <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{vibelog.read_time} min read</span>
          <span>•</span>
          <span>{vibelog.word_count} words</span>
          {vibelog.view_count > 0 && (
            <>
              <span>•</span>
              <span>{vibelog.view_count} views</span>
            </>
          )}
        </div>

        {/* Content with formatting + action buttons */}
        <PublicVibelogContent
          vibelog={{
            id: vibelog.id,
            title: vibelog.title,
            content: vibelog.content,
            user_id: vibelog.user_id,
            public_slug: vibelog.public_slug,
            audio_url: vibelog.audio_url,
            created_at: vibelog.created_at,
            author: vibelog.author,
          }}
        />

        {/* Audio player if available */}
        {vibelog.audio_url && (
          <div className="mt-12">
            <h3 className="mb-4 text-lg font-semibold">Listen to this VibeLog</h3>
            <audio controls className="w-full">
              <source src={vibelog.audio_url} type="audio/webm" />
              <source src={vibelog.audio_url} type="audio/mp3" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-16 border-t border-border/40 pt-8 text-center">
          <p className="mb-4 text-muted-foreground">
            {isAnonymous
              ? 'Create your own VibeLog in seconds'
              : 'Enjoyed this post? Create your own!'}
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg border border-border bg-background px-6 py-3 font-medium hover:bg-muted"
          >
            Try VibeLog Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/40 bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <Link href="/" className="font-medium hover:text-foreground">
              VibeLog
            </Link>{' '}
            — Turn your voice into beautiful stories
          </p>
        </div>
      </footer>
    </div>
  );
}
