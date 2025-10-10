'use client';

import { Camera, Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ProfileSettingsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [headerImage, setHeaderImage] = useState('');
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
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setHeaderImage(profile.header_image || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          bio,
          avatar_url: avatarUrl,
          header_image: headerImage,
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

          {/* Header Image Section */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-border/50">
            <div
              className="relative h-48 bg-cover bg-center sm:h-64"
              style={{
                backgroundImage: headerImage
                  ? `url(${headerImage})`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-4 right-4 backdrop-blur-sm"
              >
                <Camera className="mr-2 h-4 w-4" />
                Change Header
              </Button>
            </div>

            {/* Avatar */}
            <div className="relative -mt-16 px-6">
              <div className="relative inline-block">
                <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-background bg-card">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-electric text-4xl font-bold text-white">
                      {displayName?.[0] || username?.[0] || '?'}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Form */}
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

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  type="url"
                />
                <p className="text-sm text-muted-foreground">Direct link to your profile picture</p>
              </div>

              {/* Header Image URL */}
              <div className="space-y-2">
                <Label htmlFor="headerImage">Header Image URL</Label>
                <Input
                  id="headerImage"
                  value={headerImage}
                  onChange={e => setHeaderImage(e.target.value)}
                  placeholder="https://example.com/header.jpg"
                  type="url"
                />
                <p className="text-sm text-muted-foreground">
                  Direct link to your header banner image
                </p>
              </div>

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
