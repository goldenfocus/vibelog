# Mobile Recording Components 🎤📱

Revolutionary mobile-first recording experience for VibeLog.

## Components

### MobileWaveform

Dramatic, reactive waveform visualization optimized for mobile.

```tsx
import { MobileWaveform } from '@/components/recording/MobileWaveform';

<MobileWaveform
  analyzerNode={analyzer}
  isRecording={isRecording}
  theme="gradient" // 'primary' | 'gradient' | 'minimal'
  perspective // Enable 3D perspective effect
/>;
```

**Features:**

- Spring-based physics for smooth movement
- 3D perspective scaling
- Reactive to audio volume
- Idle animation when not recording
- Three visual themes

---

### MobileTranscription

Large, auto-scrolling transcription overlay.

```tsx
import { MobileTranscription } from '@/components/recording/MobileTranscription';

<MobileTranscription
  text={transcript}
  isTranscribing={isRecording}
  animateWords // Fade in words as they appear
/>;
```

**Features:**

- 24px font (mobile-optimized)
- Auto-scroll to bottom
- Word-by-word fade-in animation
- Scroll fade indicators
- Cursor indicator when active

---

### MobileControls

Bottom action bar with Cancel, Pause/Resume, Done buttons.

```tsx
import { MobileControls } from '@/components/recording/MobileControls';

<MobileControls
  state="recording" // 'idle' | 'recording' | 'paused' | 'processing'
  onCancel={handleCancel}
  onPauseResume={handlePause}
  onDone={handleDone}
  confirmCancel // Show confirmation before cancel
/>;
```

**Features:**

- Touch-optimized (56px buttons)
- Haptic feedback on tap
- Loading states
- Safe-area aware
- Confirmation dialogs

---

### PortraitLayout

Vertical stack layout for portrait mode.

```tsx
import { PortraitLayout } from '@/components/recording/PortraitLayout';

<PortraitLayout
  header={<Timer />}
  waveform={<MobileWaveform />}
  transcription={<MobileTranscription />}
  controls={<MobileControls />}
/>;
```

**Layout:**

```
┌─────────────┐
│   Header    │ (optional)
├─────────────┤
│  Waveform   │ (prominent)
├─────────────┤
│Transcription│ (scrollable)
│             │
├─────────────┤
│  Controls   │ (fixed bottom)
└─────────────┘
```

---

### LandscapeLayout

Side-by-side layout for landscape mode.

```tsx
import { LandscapeLayout } from '@/components/recording/LandscapeLayout';

<LandscapeLayout
  header={<Timer />}
  waveform={<MobileWaveform />}
  transcription={<MobileTranscription />}
  controls={<MobileControls />}
/>;
```

**Layout:**

```
┌───────────────────────┐
│       Header          │
├──────────┬────────────┤
│ Waveform │Transcriptn │
│          │            │
├──────────┴────────────┤
│      Controls         │
└───────────────────────┘
```

---

### FullscreenRecorder

Complete fullscreen recording experience.

```tsx
import { FullscreenRecorder } from '@/components/recording/FullscreenRecorder';

<FullscreenRecorder
  isActive={isFullscreen}
  recordingState="recording"
  analyzerNode={analyzer}
  transcriptionText={transcript}
  onExit={handleExit}
  onCancel={handleCancel}
  onPauseResume={handlePause}
  onDone={handleDone}
  orientation="any" // 'portrait' | 'landscape' | 'any'
  preventAccidentalExit
/>;
```

**Features:**

- Automatic portrait/landscape switching
- Fullscreen portal rendering
- Scroll locking
- Escape key handling
- Android back button support
- Orientation locking
- Exit confirmation
- Status indicators (REC, PAUSED, PROCESSING)

---

## Complete Example

```tsx
'use client';

import { useState } from 'react';
import { FullscreenRecorder } from '@/components/recording/FullscreenRecorder';

export function MyRecordingComponent() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingState, setRecordingState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [analyzer, setAnalyzer] = useState(null);

  const handleStartRecording = () => {
    setIsFullscreen(true);
    setRecordingState('recording');
    // Start audio recording...
  };

  const handleCancel = () => {
    setIsFullscreen(false);
    setRecordingState('idle');
    // Cancel recording...
  };

  const handlePauseResume = () => {
    setRecordingState(prev => (prev === 'recording' ? 'paused' : 'recording'));
  };

  const handleDone = () => {
    setRecordingState('processing');
    // Process recording...
  };

  return (
    <>
      <button onClick={handleStartRecording}>Start Recording</button>

      <FullscreenRecorder
        isActive={isFullscreen}
        recordingState={recordingState}
        analyzerNode={analyzer}
        transcriptionText={transcript}
        onExit={() => setIsFullscreen(false)}
        onCancel={handleCancel}
        onPauseResume={handlePauseResume}
        onDone={handleDone}
      />
    </>
  );
}
```

---

## Dependencies

These components use:

- `useWaveformAnimation` - Physics-based waveform animation
- `useAutoScroll` - Auto-scroll transcription
- `useFullscreenRecording` - Fullscreen state management
- `useOrientationLock` - Device orientation control
- `useSafeArea` - iOS/Android safe area insets
- `triggerHaptic` - Haptic feedback
- `ActionBar` - Reusable action bar component

---

## Design Principles

1. **Mobile-First**: Designed for thumb-reach and one-handed use
2. **Touch-Optimized**: 48px+ touch targets, haptic feedback
3. **Responsive**: Adapts to portrait/landscape automatically
4. **Immersive**: Fullscreen, distraction-free experience
5. **Accessible**: ARIA labels, semantic HTML, keyboard support
6. **Performant**: RequestAnimationFrame, spring physics, smooth 60fps

---

## Browser Support

- ✅ iOS Safari 14+
- ✅ Android Chrome 90+
- ✅ Modern browsers with Web Audio API
- ⚠️ Orientation lock requires Screen Orientation API
- ⚠️ Haptic feedback requires Vibration API

---

Built with ❤️ for the VibeLog mobile-first revolution.
