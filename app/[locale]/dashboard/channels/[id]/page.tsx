'use client';

import { ArrowLeft, ExternalLink, Loader2, Radio, Save, Star, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { ImageUploadZone } from '@/components/profile/ImageUploadZone';
import { SocialLinksEditor } from '@/components/profile/SocialLinksEditor';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Channel } from '@/lib/channels/types';
import { CHANNEL_TOPICS } from '@/lib/channels/types';

export default function EditChannelPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const params = useParams();
  const channelId = params.id as string;

  // Channel data
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [primaryTopic, setPrimaryTopic] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Fetch channel data
  useEffect(() => {
    async function fetchChannel() {
      if (!user || !channelId) {
        return;
      }

      try {
        // Fetch all user's channels and find the one we need
        const response = await fetch('/api/channels/me');
        if (!response.ok) {
          throw new Error('Failed to fetch channels');
        }

        const data = await response.json();
        const foundChannel = data.channels.find((c: Channel) => c.id === channelId);

        if (!foundChannel) {
          setError(t('channels.notFound') || 'Channel not found');
          return;
        }

        setChannel(foundChannel);

        // Populate form
        setName(foundChannel.name || '');
        setBio(foundChannel.bio || '');
        setAvatarUrl(foundChannel.avatar_url || '');
        setHeaderImage(foundChannel.header_image || '');
        setPrimaryTopic(foundChannel.primary_topic || '');
        setIsPublic(foundChannel.is_public ?? true);
        setSocialLinks({
          website_url: foundChannel.website_url || '',
          twitter_url: foundChannel.twitter_url || '',
          instagram_url: foundChannel.instagram_url || '',
          youtube_url: foundChannel.youtube_url || '',
          tiktok_url: foundChannel.tiktok_url || '',
          linkedin_url: foundChannel.linkedin_url || '',
          github_url: foundChannel.github_url || '',
          facebook_url: foundChannel.facebook_url || '',
          threads_url: foundChannel.threads_url || '',
        });
      } catch (err) {
        console.error('[EditChannelPage] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load channel');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchChannel();
    }
  }, [user, channelId, t]);

  const handleSave = async () => {
    if (!user || !channel) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/channels/${channel.handle}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio: bio || null,
          avatar_url: avatarUrl || null,
          header_image: headerImage || null,
          primary_topic: primaryTopic || null,
          is_public: isPublic,
          ...socialLinks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update channel');
      }

      const updatedChannel = await response.json();
      setChannel(updatedChannel);
      setMessage({
        type: 'success',
        text: t('channels.updateSuccess') || 'Channel updated successfully!',
      });
    } catch (err) {
      console.error('[EditChannelPage] Save error:', err);
      setMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('channels.updateFailed') || 'Failed to update channel',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !channel) {
      return;
    }

    if (channel.is_default) {
      setMessage({
        type: 'error',
        text: t('channels.cannotDeleteDefault') || 'Cannot delete your default channel',
      });
      setShowDeleteConfirm(false);
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/channels/${channel.handle}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete channel');
      }

      router.push('/dashboard/channels');
    } catch (err) {
      console.error('[EditChannelPage] Delete error:', err);
      setMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('channels.deleteFailed') || 'Failed to delete channel',
      });
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (authLoading || i18nLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-electric" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-red-500">
                {error || t('channels.notFound') || 'Channel not found'}
              </p>
              <Link href="/dashboard/channels">
                <Button variant="outline" className="mt-4">
                  {t('channels.backToChannels') || 'Back to Channels'}
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-20 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back Link */}
          <Link
            href="/dashboard/channels"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('channels.backToChannels') || 'Back to Channels'}
          </Link>

          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              {channel.avatar_url ? (
                <Image
                  src={channel.avatar_url}
                  alt={channel.name}
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-border/50"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border/50 bg-primary/10">
                  <Radio className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">{channel.name}</h1>
                  {channel.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      <Star className="h-3 w-3" fill="currentColor" />
                      {t('channels.default') || 'Default'}
                    </span>
                  )}
                </div>
                <p className="text-electric">@{channel.handle}</p>
              </div>
            </div>
            <Link href={`/@${channel.handle}`} target="_blank">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {t('channels.viewChannel') || 'View'}
              </Button>
            </Link>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 flex items-center justify-between rounded-lg border p-4 ${
                message.type === 'success'
                  ? 'border-green-500/50 bg-green-500/10 text-green-500'
                  : 'border-red-500/50 bg-red-500/10 text-red-500'
              }`}
            >
              <span>{message.text}</span>
              <Button variant="ghost" size="icon" onClick={() => setMessage(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Images Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              <h2 className="text-xl font-semibold">{t('channels.images') || 'Images'}</h2>

              {/* Header Image */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t('channels.headerImage') || 'Header Image'}
                </Label>
                <ImageUploadZone
                  type="header"
                  currentImage={headerImage}
                  onUploadComplete={url => setHeaderImage(url)}
                />
              </div>

              {/* Avatar */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t('channels.avatar') || 'Channel Avatar'}
                </Label>
                <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                  <ImageUploadZone
                    type="avatar"
                    currentImage={avatarUrl}
                    onUploadComplete={url => setAvatarUrl(url)}
                  />
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">
                      {t('channels.avatarHelp') ||
                        'Your channel avatar appears on your vibelogs and channel page. A square image works best.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              <h2 className="text-xl font-semibold">{t('channels.basicInfo') || 'Basic Info'}</h2>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('channels.name') || 'Channel Name'}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Channel"
                  maxLength={100}
                />
              </div>

              {/* Handle (read-only) */}
              <div className="space-y-2">
                <Label>{t('channels.handle') || 'Handle'}</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                  @{channel.handle}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('channels.handleReadOnly') ||
                    'Channel handles cannot be changed after creation'}
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">{t('channels.selectTopic') || 'Select a topic'}</option>
                  {CHANNEL_TOPICS.map(topic => (
                    <option key={topic} value={topic}>
                      {topic
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label>{t('channels.visibility') || 'Visibility'}</Label>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="h-4 w-4"
                    />
                    <span>{t('channels.public') || 'Public'}</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="h-4 w-4"
                    />
                    <span>{t('channels.private') || 'Private'}</span>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? t('channels.publicHelp') || 'Anyone can find and view your channel'
                    : t('channels.privateHelp') || 'Only you can see this channel'}
                </p>
              </div>
            </div>
          </div>

          {/* Social Links Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              <div>
                <h2 className="mb-2 text-xl font-semibold">
                  {t('channels.socialLinks') || 'Social Links'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('channels.socialLinksHelp') || 'Add links to your social media profiles'}
                </p>
              </div>
              <SocialLinksEditor initialLinks={socialLinks} onChange={setSocialLinks} />
            </div>
          </div>

          {/* Stats Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('channels.stats') || 'Statistics'}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold">{channel.vibelog_count}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('channels.vibelogs') || 'Vibelogs'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold">{channel.subscriber_count}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('channels.subscribers') || 'Subscribers'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-bold">{channel.total_views.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{t('channels.views') || 'Views'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center justify-between p-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/channels')}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleSave} disabled={saving || !name}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.saving') || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common.saveChanges') || 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          {!channel.is_default && (
            <div className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5">
              <div className="p-6">
                <h2 className="mb-2 text-xl font-semibold text-red-500">
                  {t('channels.dangerZone') || 'Danger Zone'}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t('channels.deleteWarning') ||
                    'Deleting a channel is permanent. All vibelogs in this channel will be moved to your default channel.'}
                </p>

                {showDeleteConfirm ? (
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-medium text-red-500">
                      {t('channels.confirmDelete') || 'Are you sure?'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.deleting') || 'Deleting...'}
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('channels.deleteChannel') || 'Delete Channel'}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('channels.deleteChannel') || 'Delete Channel'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
