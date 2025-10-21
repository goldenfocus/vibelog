import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: vibelog } = await supabase
    .from('vibelogs')
    .select('seo_title, seo_description, title, cover_url, cover_image_url')
    .eq('public_slug', slug)
    .single();

  if (!vibelog) {
    return {
      title: 'VibeLog Not Found',
      description: 'The requested VibeLog could not be found.',
    };
  }

  const coverImage = vibelog.cover_url || vibelog.cover_image_url;

  return {
    title: vibelog.seo_title || vibelog.title,
    description: vibelog.seo_description,
    openGraph: {
      title: vibelog.seo_title || vibelog.title,
      description: vibelog.seo_description,
      images: coverImage ? [{ url: coverImage }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: vibelog.seo_title || vibelog.title,
      description: vibelog.seo_description,
      images: coverImage ? [coverImage] : [],
    },
  };
}

export default async function PublicVibelogPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch the vibelog by public_slug
  const { data: vibelog, error } = await supabase
    .from('vibelogs')
    .select('*')
    .eq('public_slug', slug)
    .single();

  if (error || !vibelog) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <h1 className="mb-4 text-3xl font-bold">VibeLog Not Found</h1>
        <p className="text-muted-foreground">
          The VibeLog you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
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
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4">
          <a href="/" className="text-xl font-bold">
            vibelog.io
          </a>
          <div className="ml-auto">
            {isAnonymous && (
              <a
                href="/auth/signin"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Sign in to create your own
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto max-w-3xl px-4 py-12">
        {/* Cover Image */}
        {coverImage && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/10 shadow-lg">
            <img
              src={coverImage}
              alt={vibelog.cover_image_alt || vibelog.title}
              className="h-auto w-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Article */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
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

          {/* Content - Show teaser for anonymous posts */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {isAnonymous && vibelog.teaser ? vibelog.teaser : vibelog.content}
          </ReactMarkdown>

          {/* CTA for anonymous posts */}
          {isAnonymous && vibelog.teaser && vibelog.teaser !== vibelog.content && (
            <div className="mt-12 rounded-2xl border border-border/40 bg-muted/50 p-8 text-center">
              <h3 className="mb-2 text-2xl font-bold">Want to read more?</h3>
              <p className="mb-6 text-muted-foreground">
                Sign in with Google to continue reading and create your own VibeLog posts
              </p>
              <a
                href={`/auth/signin?returnTo=/v/${slug}&claim=${vibelog.anonymous_session_id}`}
                className="inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Continue Reading →
              </a>
            </div>
          )}
        </article>

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
          <a
            href="/"
            className="inline-block rounded-lg border border-border bg-background px-6 py-3 font-medium hover:bg-muted"
          >
            Try VibeLog Free
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border/40 bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <a href="/" className="font-medium hover:text-foreground">
              VibeLog
            </a>{' '}
            — Turn your voice into beautiful blog posts
          </p>
        </div>
      </footer>
    </div>
  );
}
