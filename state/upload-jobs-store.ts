/**
 * Upload Jobs Store
 *
 * Global state for tracking file uploads that continue in the background.
 * Users can navigate away and get notified when uploads complete.
 */

import { create } from 'zustand';

export type UploadJobFileType = 'audio' | 'video' | 'text';
export type UploadJobStatus = 'uploading' | 'processing' | 'complete' | 'error';

export interface UploadJob {
  id: string;
  fileName: string;
  fileType: UploadJobFileType;
  status: UploadJobStatus;
  progress: number; // 0-100 for upload phase
  step?: string; // Current processing step description
  vibelogId?: string; // Set on completion
  publicUrl?: string; // Set on completion
  error?: string;
  startedAt: number;
  completedAt?: number;
}

interface UploadJobsState {
  jobs: UploadJob[];
  activeJob: UploadJob | null;

  // Actions
  addJob: (job: Omit<UploadJob, 'startedAt'>) => void;
  updateJob: (id: string, updates: Partial<UploadJob>) => void;
  removeJob: (id: string) => void;
  clearCompletedJobs: () => void;

  // Computed getters
  getJob: (id: string) => UploadJob | undefined;
  hasActiveJob: () => boolean;
}

export const useUploadJobsStore = create<UploadJobsState>((set, get) => ({
  jobs: [],
  activeJob: null,

  addJob: job => {
    const newJob: UploadJob = {
      ...job,
      startedAt: Date.now(),
    };

    set(state => ({
      jobs: [...state.jobs, newJob],
      activeJob: newJob,
    }));
  },

  updateJob: (id, updates) => {
    set(state => {
      const updatedJobs = state.jobs.map(job =>
        job.id === id
          ? {
              ...job,
              ...updates,
              // Set completedAt when status becomes complete or error
              completedAt:
                (updates.status === 'complete' || updates.status === 'error') && !job.completedAt
                  ? Date.now()
                  : job.completedAt,
            }
          : job
      );

      // Update activeJob if it's the one being updated
      const updatedActiveJob =
        state.activeJob?.id === id ? updatedJobs.find(j => j.id === id) || null : state.activeJob;

      // Clear activeJob if it completed
      const finalActiveJob =
        updatedActiveJob?.status === 'complete' || updatedActiveJob?.status === 'error'
          ? null
          : updatedActiveJob;

      return {
        jobs: updatedJobs,
        activeJob: finalActiveJob,
      };
    });
  },

  removeJob: id => {
    set(state => ({
      jobs: state.jobs.filter(job => job.id !== id),
      activeJob: state.activeJob?.id === id ? null : state.activeJob,
    }));
  },

  clearCompletedJobs: () => {
    set(state => ({
      jobs: state.jobs.filter(job => job.status !== 'complete' && job.status !== 'error'),
    }));
  },

  getJob: id => {
    return get().jobs.find(job => job.id === id);
  },

  hasActiveJob: () => {
    return get().jobs.some(job => job.status === 'uploading' || job.status === 'processing');
  },
}));
