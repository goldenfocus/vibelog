'use client';

import { Users, Clock, Zap, Settings } from 'lucide-react';
import { useState, useCallback } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BatchJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  results?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
  lastActive: Date;
}

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  scheduledFor: Date;
  platforms: string[];
  status: 'scheduled' | 'published' | 'failed';
}

export function AdvancedFeatures() {
  const { t: _t } = useI18n();
  const [activeTab, setActiveTab] = useState<'batch' | 'team' | 'schedule' | 'settings'>('batch');

  // Batch processing state
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [newBatchName, setNewBatchName] = useState('');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  // Team collaboration state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      lastActive: new Date(),
    },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');

  // Scheduling state
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Batch processing functions
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) {
      return;
    }
    const fileArray = Array.from(files);
    setBatchFiles(prev => [...prev, ...fileArray]);
  }, []);

  const startBatchProcessing = useCallback(() => {
    if (batchFiles.length === 0) {
      return;
    }

    const job: BatchJob = {
      id: `job_${Date.now()}`,
      name: newBatchName || `Batch ${batchJobs.length + 1}`,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    setBatchJobs(prev => [...prev, job]);
    setNewBatchName('');
    setBatchFiles([]);

    // Simulate processing
    setTimeout(() => {
      setBatchJobs(prev =>
        prev.map(j => (j.id === job.id ? { ...j, status: 'processing', progress: 50 } : j))
      );
    }, 1000);

    setTimeout(() => {
      setBatchJobs(prev =>
        prev.map(j =>
          j.id === job.id
            ? {
                ...j,
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                results: ['Result 1', 'Result 2', 'Result 3'],
              }
            : j
        )
      );
    }, 3000);
  }, [batchFiles, newBatchName, batchJobs.length]);

  // Team collaboration functions
  const inviteTeamMember = useCallback(() => {
    if (!inviteEmail) {
      return;
    }

    const newMember: TeamMember = {
      id: `member_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: 'editor',
      lastActive: new Date(),
    };

    setTeamMembers(prev => [...prev, newMember]);
    setInviteEmail('');
  }, [inviteEmail]);

  const removeTeamMember = useCallback((memberId: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);

  // Scheduling functions
  const schedulePost = useCallback(() => {
    if (!newPostTitle || !newPostContent || !scheduleDate) {
      return;
    }

    const newPost: ScheduledPost = {
      id: `post_${Date.now()}`,
      title: newPostTitle,
      content: newPostContent,
      scheduledFor: new Date(scheduleDate),
      platforms: selectedPlatforms,
      status: 'scheduled',
    };

    setScheduledPosts(prev => [...prev, newPost]);
    setNewPostTitle('');
    setNewPostContent('');
    setScheduleDate('');
    setSelectedPlatforms([]);
  }, [newPostTitle, newPostContent, scheduleDate, selectedPlatforms]);

  const togglePlatform = useCallback((platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  }, []);

  const platforms = ['Twitter', 'LinkedIn', 'Facebook', 'Instagram', 'Medium', 'WordPress'];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Advanced Features</h1>
        <p className="text-muted-foreground">
          Unlock the full power of VibeLog with these premium features
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 flex space-x-1 rounded-lg bg-muted p-1">
        {[
          { id: 'batch', label: 'Batch Processing', icon: Zap },
          { id: 'team', label: 'Team Collaboration', icon: Users },
          { id: 'schedule', label: 'Scheduling', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as 'batch' | 'team' | 'schedule' | 'settings')}
            className={`flex items-center space-x-2 rounded-md px-4 py-2 transition-colors ${
              activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Batch Processing Tab */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Create Batch Job</h2>
              <div>
                <Label htmlFor="batch-name">Job Name</Label>
                <Input
                  id="batch-name"
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  placeholder="Enter batch job name"
                />
              </div>
              <div>
                <Label htmlFor="batch-files">Upload Audio Files</Label>
                <Input
                  id="batch-files"
                  type="file"
                  multiple
                  accept="audio/*"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                {batchFiles.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {batchFiles.length} file(s) selected
                  </p>
                )}
              </div>
              <Button onClick={startBatchProcessing} disabled={batchFiles.length === 0}>
                <Zap className="mr-2 h-4 w-4" />
                Start Batch Processing
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active Jobs</h2>
              <div className="space-y-3">
                {batchJobs.map(job => (
                  <div key={job.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="font-medium">{job.name}</h3>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          job.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : job.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="mb-2 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-electric transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created: {job.createdAt.toLocaleString()}
                    </p>
                    {job.results && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Results:</p>
                        <ul className="text-sm text-muted-foreground">
                          {job.results.map((result, index) => (
                            <li key={`result-${job.id}-${index}`}>• {result}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Collaboration Tab */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Invite Team Members</h2>
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>
              <Button onClick={inviteTeamMember} disabled={!inviteEmail}>
                <Users className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Team Members</h2>
              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-electric text-sm font-medium text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="rounded bg-muted px-2 py-1 text-xs">{member.role}</span>
                      {member.role !== 'owner' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeTeamMember(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Schedule New Post</h2>
              <div>
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  value={newPostTitle}
                  onChange={e => setNewPostTitle(e.target.value)}
                  placeholder="Enter post title"
                />
              </div>
              <div>
                <Label htmlFor="post-content">Content</Label>
                <Textarea
                  id="post-content"
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  placeholder="Enter post content"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="schedule-date">Schedule Date & Time</Label>
                <Input
                  id="schedule-date"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Platforms</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {platforms.map(platform => (
                    <label key={platform} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        className="rounded"
                      />
                      <span className="text-sm">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={schedulePost}
                disabled={!newPostTitle || !newPostContent || !scheduleDate}
              >
                <Clock className="mr-2 h-4 w-4" />
                Schedule Post
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Scheduled Posts</h2>
              <div className="space-y-3">
                {scheduledPosts.map(post => (
                  <div key={post.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="font-medium">{post.title}</h3>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : post.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {post.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {post.scheduledFor.toLocaleString()}
                      </p>
                      <div className="flex space-x-1">
                        {post.platforms.map(platform => (
                          <span key={platform} className="rounded bg-muted px-2 py-1 text-xs">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key">API Key</Label>
                  <Input id="api-key" type="password" placeholder="Enter your API key" />
                </div>
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" placeholder="https://your-webhook-url.com" />
                </div>
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Usage Statistics</h2>
              <div className="space-y-3">
                <div className="flex justify-between rounded bg-muted p-3">
                  <span>Vibelogs Created</span>
                  <span className="font-medium">42</span>
                </div>
                <div className="flex justify-between rounded bg-muted p-3">
                  <span>Total Recording Time</span>
                  <span className="font-medium">2h 15m</span>
                </div>
                <div className="flex justify-between rounded bg-muted p-3">
                  <span>Platforms Connected</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex justify-between rounded bg-muted p-3">
                  <span>Team Members</span>
                  <span className="font-medium">{teamMembers.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
