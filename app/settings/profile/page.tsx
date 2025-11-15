'use client';

import { Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { ImageUploadZone } from '@/components/profile/ImageUploadZone';
import { SocialLinksEditor } from '@/components/profile/SocialLinksEditor';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { AutoPostSettings } from '@/components/settings/AutoPostSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase';

export default function ProfileSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile(user?.id);
  const { isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setUsername((profile.username as string) || '');
      setDisplayName((profile.display_name as string) || '');
      setBio((profile.bio as string) || '');
      setAvatarUrl((profile.avatar_url as string) || '');
      setHeaderImage((profile.header_image as string) || '');
      setSocialLinks({
        twitter_url: (profile.twitter_url as string) || '',
        instagram_url: (profile.instagram_url as string) || '',
        linkedin_url: (profile.linkedin_url as string) || '',
        github_url: (profile.github_url as string) || '',
        youtube_url: (profile.youtube_url as string) || '',
        tiktok_url: (profile.tiktok_url as string) || '',
        facebook_url: (profile.facebook_url as string) || '',
        threads_url: (profile.threads_url as string) || '',
        website_url: (profile.website_url as string) || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Note: user.id is already the target user ID when in god mode
      // (AuthProvider.getGodModeUser() returns target user's ID)
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          bio,
          avatar_url: avatarUrl,
          header_image: headerImage,
          ...socialLinks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505' && error.message.includes('username')) {
          setMessage({ type: 'error', text: 'Username already taken' });
        } else {
          setMessage({ type: 'error', text: error.message });
        }
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
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
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold sm:text-4xl">Profile Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Customize your profile and public information
            </p>
          </div>

          {/* Profile Images Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              {/* Header Image Upload */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Header Image</Label>
                <ImageUploadZone
                  type="header"
                  currentImage={headerImage}
                  onUploadComplete={url => setHeaderImage(url)}
                />
              </div>

              {/* Avatar Upload */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Profile Picture</Label>
                <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                  <ImageUploadZone
                    type="avatar"
                    currentImage={avatarUrl}
                    onUploadComplete={url => setAvatarUrl(url)}
                  />
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">
                      Your profile picture appears on your vibelogs and profile page. A square image
                      works best and will be displayed as a circle.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              {/* Message */}
              {message && (
                <div
                  className={`flex items-center justify-between rounded-lg border p-4 ${
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

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="johndoe"
                  maxLength={30}
                />
                <p className="text-sm text-muted-foreground">
                  Your unique identifier. Only lowercase letters, numbers, and underscores.
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  maxLength={50}
                />
                <p className="text-sm text-muted-foreground">
                  Your public display name (can include spaces and capitals)
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">{bio.length}/500 characters</p>
              </div>
            </div>
          </div>

          {/* Social Links Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              <div>
                <h2 className="mb-2 text-xl font-semibold">Social Links</h2>
                <p className="text-sm text-muted-foreground">
                  Add your social media profiles. Just paste the URL and we&apos;ll handle the rest.
                </p>
              </div>
              <SocialLinksEditor initialLinks={socialLinks} onChange={setSocialLinks} />
            </div>
          </div>

          {/* Twitter Auto-Posting Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              <AutoPostSettings />
            </div>
          </div>

          {/* Account Info and Save Button Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="space-y-6 p-6">
              {/* Account Info (Read-only) */}
              <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                <h3 className="mb-2 font-semibold">Account Information</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  Signed in with {user.app_metadata?.provider || 'Email'}
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
