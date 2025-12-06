'use client';

import { ArrowLeft, Loader2, Radio, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CHANNEL_TOPICS, isValidHandle, normalizeHandle } from '@/lib/channels/types';

export default function NewChannelPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();

  // Form state
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [primaryTopic, setPrimaryTopic] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Validate handle as user types
  const handleHandleChange = (value: string) => {
    const normalized = normalizeHandle(value.replace(/[^a-z0-9_-]/gi, ''));
    setHandle(normalized);

    if (normalized.length === 0) {
      setHandleError(null);
    } else if (normalized.length < 3) {
      setHandleError(t('channels.handleTooShort') || 'Handle must be at least 3 characters');
    } else if (normalized.length > 30) {
      setHandleError(t('channels.handleTooLong') || 'Handle must be 30 characters or less');
    } else if (!isValidHandle(normalized)) {
      setHandleError(
        t('channels.handleInvalid') ||
          'Handle must start with a letter or number and contain only lowercase letters, numbers, underscores, and hyphens'
      );
    } else {
      setHandleError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      return;
    }
    if (handleError) {
      return;
    }
    if (!handle || !name) {
      setError(t('channels.requiredFields') || 'Handle and name are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          name,
          bio: bio || undefined,
          primary_topic: primaryTopic || undefined,
          is_public: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('already exists') || data.error?.includes('duplicate')) {
          setHandleError(t('channels.handleTaken') || 'This handle is already taken');
        } else {
          setError(data.error || t('channels.createFailed') || 'Failed to create channel');
        }
        return;
      }

      // Success - redirect to the new channel's edit page
      router.push(`/dashboard/channels/${data.id}`);
    } catch (err) {
      console.error('[NewChannelPage] Error:', err);
      setError(t('channels.createFailed') || 'Failed to create channel');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || i18nLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-electric" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Back Link */}
          <Link
            href="/dashboard/channels"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('channels.backToChannels') || 'Back to Channels'}
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Radio className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">
              {t('channels.createChannel') || 'Create Channel'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('channels.createChannelDescription') ||
                'Create a new channel to publish content under a different identity'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-500">
                  {error}
                </div>
              )}

              {/* Handle */}
              <div className="space-y-2">
                <Label htmlFor="handle">{t('channels.handle') || 'Handle'} *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-muted-foreground">@</span>
                  <Input
                    id="handle"
                    value={handle}
                    onChange={e => handleHandleChange(e.target.value)}
                    placeholder="my-channel"
                    maxLength={30}
                    className={handleError ? 'border-red-500' : ''}
                  />
                </div>
                {handleError ? (
                  <p className="text-sm text-red-500">{handleError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('channels.handleHelp') ||
                      'Your unique channel URL. 3-30 characters, lowercase letters, numbers, underscores, and hyphens.'}
                  </p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('channels.name') || 'Channel Name'} *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Awesome Channel"
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  {t('channels.nameHelp') || 'The display name for your channel'}
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">{t('channels.bio') || 'Bio'}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="What's your channel about?"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">
                  {bio.length}/500 {t('common.characters') || 'characters'}
                </p>
              </div>

              {/* Primary Topic */}
              <div className="space-y-2">
                <Label htmlFor="primaryTopic">
                  {t('channels.primaryTopic') || 'Primary Topic'}
                </Label>
                <select
                  id="primaryTopic"
                  value={primaryTopic}
                  onChange={e => setPrimaryTopic(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {t('channels.selectTopic') || 'Select a topic (optional)'}
                  </option>
                  {CHANNEL_TOPICS.map(topic => (
                    <option key={topic} value={topic}>
                      {topic
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  {t('channels.topicHelp') || 'Helps people discover your channel'}
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/channels')}
                  disabled={saving}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !!handleError || !handle || !name}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.creating') || 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('channels.createChannel') || 'Create Channel'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
