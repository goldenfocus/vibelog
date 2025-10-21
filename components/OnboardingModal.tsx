'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface OnboardingModalProps {
  user: User;
  onComplete: () => void;
}

export function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkIfShouldShowOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkIfShouldShowOnboarding = async () => {
    // Check localStorage to see if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
    if (hasCompletedOnboarding) {
      return;
    }

    // Fetch user profile
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, bio, created_at, username_changed_at')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setUsername(data.username || '');
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');

      // Show onboarding if account is new (created in last 5 minutes)
      const accountAge = Date.now() - new Date(data.created_at).getTime();
      if (accountAge < 5 * 60 * 1000) {
        setIsOpen(true);
      }
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    // Validate username format
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      setError('Username must be 3-30 characters, lowercase letters, numbers, - or _');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Check if username is available (if changed)
      if (username !== profile?.username) {
        // Check if user has already changed username once
        if (profile?.username_changed_at) {
          setError("You've already changed your username once");
          setIsLoading(false);
          return;
        }

        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();

        if (existing) {
          setError('Username already taken');
          setIsLoading(false);
          return;
        }
      }

      // Update profile
      const updateData: any = {
        display_name: displayName.trim() || username,
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      };

      // Only update username if changed
      if (username !== profile?.username) {
        updateData.username = username;
        updateData.username_changed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Mark onboarding as completed
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      setIsOpen(false);
      onComplete();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    setIsOpen(false);
    onComplete();
  };

  if (!isOpen) return null;

  const steps = [
    {
      title: '🎉 Welcome to Vibelog!',
      subtitle: "You just created your first vibelog! Let's personalize your profile.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="your-username"
              className="w-full px-4 py-2 rounded-lg border border-electric/30 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-electric"
              maxLength={30}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your public URL: vibelog.app/{username}
              {profile?.username_changed_at === null && (
                <span className="ml-2 text-electric">✨ You can change this once!</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              className="w-full px-4 py-2 rounded-lg border border-electric/30 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-electric"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Bio (optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              className="w-full px-4 py-2 rounded-lg border border-electric/30 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-electric resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={handleSkip} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative max-w-lg w-full bg-card/95 backdrop-blur-xl rounded-2xl border border-electric/30 shadow-2xl shadow-electric/20 p-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {currentStepData.title}
              </h2>
              <p className="text-muted-foreground">{currentStepData.subtitle}</p>
            </div>

            {currentStepData.content}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 rounded-xl border border-electric/30 text-foreground hover:bg-electric/10 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 px-6 py-3 rounded-xl bg-electric text-background font-semibold hover:bg-electric/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Complete Setup 🚀'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
