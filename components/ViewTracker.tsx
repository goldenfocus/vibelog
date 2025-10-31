'use client';

import { useEffect } from 'react';

interface ViewTrackerProps {
  vibelogId: string;
}

export function ViewTracker({ vibelogId }: ViewTrackerProps) {
  useEffect(() => {
    // Track view count by calling API
    fetch('/api/increment-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibelogId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('✅ View counted successfully');
        } else {
          console.error('❌ View count failed:', data.error);
        }
      })
      .catch(err => console.error('❌ Network error tracking view:', err));
  }, [vibelogId]);

  // This component doesn't render anything
  return null;
}
