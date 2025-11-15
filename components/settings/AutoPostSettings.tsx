'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

import { XLogo } from '@/components/icons/XLogo';
import { createClient } from '@/lib/supabase';

export function AutoPostSettings() {
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [postFormat, setPostFormat] = useState<'teaser' | 'full' | 'custom'>('teaser');
  const [customTemplate, setCustomTemplate] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(
          'auto_post_twitter, twitter_post_format, twitter_custom_template, twitter_username, twitter_password'
        )
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      if (profile) {
        setAutoPostEnabled(profile.auto_post_twitter || false);
        setPostFormat(profile.twitter_post_format || 'teaser');
        setCustomTemplate(profile.twitter_custom_template || '');
        setUsername(profile.twitter_username || '');
        setPassword(profile.twitter_password || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          auto_post_twitter: autoPostEnabled,
          twitter_post_format: postFormat,
          twitter_custom_template: customTemplate,
          twitter_username: username,
          twitter_password: password,
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      showMessage('success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-4 h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-24 rounded bg-gray-200 dark:bg-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <XLogo className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Auto-Post to X</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automatically share your vibelogs when you publish them
          </p>
        </div>
      </div>

      {/* Auto-Post Toggle */}
      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <div>
          <label
            htmlFor="auto-post-toggle"
            className="font-medium text-gray-900 dark:text-gray-100"
          >
            Enable Auto-Posting
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automatically post when you publish a vibelog
          </p>
        </div>
        <button
          id="auto-post-toggle"
          type="button"
          role="switch"
          aria-checked={autoPostEnabled}
          onClick={() => setAutoPostEnabled(!autoPostEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPostEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} `}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPostEnabled ? 'translate-x-6' : 'translate-x-1'} `}
          />
        </button>
      </div>

      {/* Credentials */}
      {autoPostEnabled && (
        <div className="space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div>
            <label
              htmlFor="x-username"
              className="mb-2 block font-medium text-gray-900 dark:text-gray-100"
            >
              X Username
            </label>
            <input
              id="x-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@yourusername"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="x-password"
              className="mb-2 block font-medium text-gray-900 dark:text-gray-100"
            >
              X Password
            </label>
            <div className="relative">
              <input
                id="x-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your X password"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your credentials are encrypted and stored securely
            </p>
          </div>
        </div>
      )}

      {/* Post Format Settings */}
      {autoPostEnabled && (
        <div className="space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div>
            <label className="mb-2 block font-medium text-gray-900 dark:text-gray-100">
              Post Format
            </label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="post-format"
                  value="teaser"
                  checked={postFormat === 'teaser'}
                  onChange={e => setPostFormat(e.target.value as 'teaser')}
                  className="h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Teaser</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Short preview with &ldquo;Read more&rdquo; link (recommended)
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="post-format"
                  value="full"
                  checked={postFormat === 'full'}
                  onChange={e => setPostFormat(e.target.value as 'full')}
                  className="h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Full Content</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete vibelog text with link (may be truncated at 280 chars)
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="post-format"
                  value="custom"
                  checked={postFormat === 'custom'}
                  onChange={e => setPostFormat(e.target.value as 'custom')}
                  className="h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Custom Template
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use your own template with placeholders
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Template Editor */}
          {postFormat === 'custom' && (
            <div>
              <label
                htmlFor="custom-template"
                className="mb-2 block font-medium text-gray-900 dark:text-gray-100"
              >
                Custom Template
              </label>
              <textarea
                id="custom-template"
                value={customTemplate}
                onChange={e => setCustomTemplate(e.target.value)}
                placeholder="Example: New vibelog! {title}\n\n{content}\n\nCheck it out: {url}"
                className="h-32 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Available placeholders:{' '}
                <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{'​{title}'}</code>{' '}
                <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{'​{content}'}</code>{' '}
                <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{'​{url}'}</code>
              </p>
            </div>
          )}

          {/* Preview Example */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="mb-1 text-xs font-semibold text-blue-900 dark:text-blue-300">PREVIEW</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {postFormat === 'teaser' &&
                'Title of your vibelog\n\nThis is a short teaser...\n\nRead more: vibelog.app/@you/slug'}
              {postFormat === 'full' &&
                'Title of your vibelog\n\nYour complete vibelog content here...\n\nvibelog.app/@you/slug'}
              {postFormat === 'custom' &&
                (customTemplate || 'Use the template editor above to customize your posts')}
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
