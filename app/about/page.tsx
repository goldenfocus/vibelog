import { MessageCircle, Share, User } from 'lucide-react';
import Link from 'next/link';

import Comments from '@/components/comments/Comments';
import Navigation from '@/components/Navigation';
import { createServerSupabaseClient } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fetch @vibeyang profile
async function getVibeYangProfile() {
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, full_name, avatar_url, header_image, bio')
    .eq('username', 'vibeyang')
    .single();

  return profile;
}

// Fetch or create the About page vibelog for comments
async function getAboutPageVibelog() {
  const supabase = await createServerSupabaseClient();

  // Try to find existing about-page vibelog
  const { data: vibelog } = await supabase
    .from('vibelogs')
    .select('id')
    .eq('slug', 'about-page-comments')
    .eq('is_published', true)
    .single();

  return vibelog?.id || null;
}

export default async function About() {
  const profile = await getVibeYangProfile();
  const aboutVibelogId = await getAboutPageVibelog();

  const displayName = profile?.display_name || profile?.full_name || 'Yang';
  const username = profile?.username || 'vibeyang';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h1 className="mb-6 text-4xl font-bold sm:text-5xl">About VibeLog</h1>
          </div>

          {/* Founder Video Placeholder */}
          <div className="mb-16 text-center">
            <div className="mb-6 rounded-2xl border border-border/20 bg-card p-8">
              <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-electric">
                    <span className="text-2xl">▶️</span>
                  </div>
                  <p className="text-muted-foreground">Founder Video Coming Soon</p>
                  <p className="text-sm text-muted-foreground">
                    A personal message from Yang about the journey
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* The Problem */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">The Problem</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>
                Content creation is broken. We have amazing thoughts to share, but the tools make
                it feel like work.
              </p>
              <p>
                You need to open an app, stare at a blank page, fight with formatting, upload
                images manually, and then copy-paste to every platform.
              </p>
              <p>By the time you&apos;re done, the inspiration is gone.</p>
            </div>
          </section>

          {/* The Spark */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">The Spark</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>
                What if you could just... speak? No typing, no formatting, no endless clicking.
              </p>
              <p>
                Just press record, share your thoughts, and let AI turn it into beautiful content —
                complete with images, formatting, and everything ready to publish.
              </p>
              <p>That&apos;s the dream behind VibeLog.</p>
            </div>
          </section>

          {/* The Solution */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">The Solution</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>
                VibeLog is your AI publishing assistant that speaks your language — literally.
              </p>
              <p>
                Record your thoughts by voice. Our AI transforms them into polished content with
                images, formatting, and style. Then publish everywhere with one command.
              </p>
              <p>Voice-first. Conversation-native. Built for humans, not robots.</p>
            </div>
          </section>

          {/* The Mission */}
          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold">The Mission</h2>
            <div className="prose prose-lg max-w-none space-y-4 text-muted-foreground">
              <p>
                We&apos;re building a living web — where content isn&apos;t static, but
                conversational and alive.
              </p>
              <p>
                Where creators can focus on ideas, not tools. Where AI amplifies your voice instead
                of replacing it.
              </p>
              <p>Where the internet feels human again.</p>
              <p className="text-xl font-semibold text-foreground">Let&apos;s vibe it. 🌌</p>
            </div>
          </section>

          {/* Divider */}
          <div className="mb-16 flex items-center justify-center">
            <div className="h-px flex-1 bg-border"></div>
            <div className="px-4 text-muted-foreground">⸻</div>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          {/* Community Engagement Section */}
          <div className="mb-16 rounded-3xl border border-border/20 bg-gradient-subtle p-8">
            {/* Profile Section */}
            <div className="mb-8 text-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="mx-auto mb-4 h-20 w-20 rounded-full border-4 border-electric/20 object-cover"
                />
              ) : (
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <h3 className="mb-1 text-xl font-bold">{displayName}</h3>
              <p className="mb-2 text-muted-foreground">Founder</p>
              <Link
                href={`/@${username}`}
                className="text-electric transition-colors hover:text-electric-glow"
              >
                @{username}
              </Link>
            </div>

            {/* Comments Section */}
            {aboutVibelogId && (
              <div className="mt-8">
                <Comments vibelogId={aboutVibelogId} />
              </div>
            )}

            {!aboutVibelogId && (
              <div className="mt-8 text-center text-muted-foreground">
                <p>Comments will be available soon!</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
