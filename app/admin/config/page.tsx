'use client';

import { Settings, Save, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'boolean';
  min?: number;
  max?: number;
}

interface ConfigState {
  [key: string]: number | boolean | undefined;
}

const CONFIG_SCHEMA: ConfigItem[] = [
  {
    key: 'anonymous_tts_daily_limit',
    label: 'Anonymous TTS Daily Limit',
    description: 'Maximum TTS requests per day for anonymous users',
    type: 'number',
    min: 0,
    max: 100,
  },
  {
    key: 'registered_tts_daily_limit',
    label: 'Registered TTS Daily Limit',
    description: 'Maximum TTS requests per day for registered users',
    type: 'number',
    min: 0,
    max: 1000,
  },
  {
    key: 'anonymous_voice_clone_daily_limit',
    label: 'Anonymous Voice Clone Daily Limit',
    description: 'Maximum voice clones per day for anonymous users (deprecated)',
    type: 'number',
    min: 0,
    max: 100,
  },
  {
    key: 'registered_voice_clone_daily_limit',
    label: 'Registered Voice Clone Daily Limit',
    description: 'Maximum voice clones per day for registered users (deprecated)',
    type: 'number',
    min: 0,
    max: 1000,
  },
  {
    key: 'cost_alert_threshold_usd',
    label: 'Cost Alert Threshold (USD)',
    description: 'Alert when monthly costs exceed this amount',
    type: 'number',
    min: 0,
    max: 10000,
  },
  {
    key: 'preview_audio_limit_seconds',
    label: 'Preview Audio Limit (seconds)',
    description: 'Maximum playback duration for anonymous preview mode',
    type: 'number',
    min: 5,
    max: 60,
  },
];

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigState>({});
  const [originalConfig, setOriginalConfig] = useState<ConfigState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/config');
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      const data = await response.json();
      setConfig(data.config || {});
      setOriginalConfig(data.config || {});
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send changed values
      const changes: ConfigState = {};
      Object.keys(config).forEach(key => {
        if (config[key] !== originalConfig[key]) {
          changes[key] = config[key];
        }
      });

      if (Object.keys(changes).length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error('Failed to update config');
      }

      toast.success('Configuration updated successfully');
      await fetchConfig(); // Refresh to get latest values
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...originalConfig });
    toast.info('Changes discarded');
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Configuration</h1>
          <p className="text-muted-foreground">Manage application settings and quotas</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            You have unsaved changes. Click &ldquo;Save Changes&rdquo; to apply them.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {CONFIG_SCHEMA.map(item => (
          <div key={item.key} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <label
                htmlFor={item.key}
                className="mb-1 block text-sm font-semibold text-foreground"
              >
                {item.label}
              </label>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>

            {item.type === 'number' && (
              <div className="flex items-center gap-4">
                <input
                  id={item.key}
                  type="number"
                  value={(config[item.key] as number) ?? 0}
                  onChange={e =>
                    setConfig({
                      ...config,
                      [item.key]: parseInt(e.target.value, 10),
                    })
                  }
                  min={item.min}
                  max={item.max}
                  className="w-32 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {item.min !== undefined && item.max !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    ({item.min} - {item.max})
                  </span>
                )}
              </div>
            )}

            {item.type === 'boolean' && (
              <label className="flex items-center gap-3">
                <input
                  id={item.key}
                  type="checkbox"
                  checked={(config[item.key] as boolean) ?? false}
                  onChange={e =>
                    setConfig({
                      ...config,
                      [item.key]: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-border text-purple-500 focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-muted-foreground">
                  {config[item.key] ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">About Configuration</h3>
        </div>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Changes are logged in the audit log for security purposes</li>
          <li>• Voice cloning limits are deprecated (feature removed)</li>
          <li>• TTS limits reset daily at midnight UTC</li>
          <li>• Cost alerts will trigger notifications when threshold is exceeded</li>
        </ul>
      </div>
    </div>
  );
}
