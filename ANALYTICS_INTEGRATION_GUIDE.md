# Analytics Integration Guide

Quick reference for adding tracking to `components/mic/useMicStateMachine.ts`

## 1. Add imports at the top

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';
import { EVENTS } from '@/lib/analytics';
```

## 2. Add hook in the component

```typescript
const { track } = useAnalytics();
```

## 3. Track events in each function

### startRecording

```typescript
const startRecording = useCallback(async () => {
  const success = await startEngineRecording();
  if (!success) {
    track(EVENTS.RECORDING_FAILED, {
      error: 'Failed to start recording engine',
      errorType: 'unknown',
    });
    return;
  }

  track(EVENTS.RECORDING_STARTED, {
    isAnonymous: !isLoggedIn,
    remixMode: !!remixContent,
  });

  // ... rest of function
}, [clearRecordingTimer, startEngineRecording, track, isLoggedIn, remixContent]);
```

### stopRecording

```typescript
const stopRecording = useCallback(() => {
  track(EVENTS.RECORDING_STOPPED, {
    duration: recordingTime,
    isAnonymous: !isLoggedIn,
  });

  stopEngineRecording();
  clearRecordingTimer();
}, [clearRecordingTimer, stopEngineRecording, track, recordingTime, isLoggedIn]);
```

### handleCopy

```typescript
// At the end of try block, before return:
if (!opts.silent) {
  track(EVENTS.VIBELOG_COPIED, { vibelogId: undefined });
}
```

### handleShare

```typescript
// After successful share:
track(EVENTS.VIBELOG_SHARED, {
  vibelogId: undefined,
  shareMethod: navigator.share ? 'native_share' : 'link',
});
```

### beginEdit

```typescript
const beginEdit = useCallback(() => {
  if (!isLoggedIn) {
    handleTranscriptUpgradeGate();
    return;
  }

  setEditedContent(vibelogContent);
  setIsEditing(true);
}, [vibelogContent, handleTranscriptUpgradeGate, isLoggedIn]);
```

### finalizeEdit

```typescript
const finalizeEdit = useCallback(() => {
  track(EVENTS.VIBELOG_EDITED, {
    editType: 'content',
    vibelogId: undefined,
  });

  setVibelogContent(editedContent);
  setIsEditing(false);
  showToast(t('components.micRecorder.vibelogUpdated'));
}, [editedContent, showToast, t, track]);
```

### handleTranscriptUpgradeGate

```typescript
const handleTranscriptUpgradeGate = useCallback(() => {
  if (isLoggedIn) {
    return;
  }

  track(EVENTS.UPGRADE_PROMPT_SHOWN, {
    trigger: 'transcript_view',
    location: 'mic_recorder',
  });

  setUpgradePrompt({
    visible: true,
    message: t('components.micRecorder.loginEditMessage'),
    benefits: [
      t('components.micRecorder.benefit.saveHistory'),
      t('components.micRecorder.benefit.editAnytime'),
    ],
  });
}, [isLoggedIn, t, track]);
```

### updateTranscript

```typescript
const updateTranscript = useCallback(
  (newTranscription: string) => {
    const originalLength = transcription.length;

    track(EVENTS.TRANSCRIPT_EDITED, {
      originalLength,
      newLength: newTranscription.length,
    });

    setTranscription(newTranscription);
    showToast(t('components.micRecorder.transcriptUpdated'));
  },
  [showToast, t, track, transcription.length]
);
```

### processTranscription

```typescript
const processTranscription = useCallback(async () => {
  if (!audioBlob) {
    throw new Error('No audio blob available');
  }

  const audioDuration = recordingTime;

  track(EVENTS.TRANSCRIPTION_STARTED, {
    audioDuration,
    isAnonymous: !isLoggedIn,
  });

  const startTime = Date.now();

  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const transcriptionResult = await vibelogAPI.processTranscription(audioBlob, sessionId);
    setTranscription(transcriptionResult);

    const processingTime = Date.now() - startTime;

    track(EVENTS.TRANSCRIPTION_COMPLETED, {
      audioDuration,
      transcriptionLength: transcriptionResult.length,
      processingTime,
      isAnonymous: !isLoggedIn,
    });

    // ... audio upload code

    return transcriptionResult;
  } catch (error) {
    track(EVENTS.TRANSCRIPTION_FAILED, {
      error: error instanceof Error ? error.message : 'Unknown error',
      audioDuration,
    });
    throw error;
  }
}, [audioBlob, user?.id, vibelogAPI, track, recordingTime, isLoggedIn]);
```

### processVibelogGeneration

```typescript
const processVibelogGeneration = useCallback(async () => {
  const transcriptionData = vibelogAPI.processingData.current.transcriptionData;
  if (!transcriptionData) {
    throw new Error('No transcription data available');
  }

  track(EVENTS.VIBELOG_GENERATION_STARTED, {
    transcriptionLength: transcriptionData.length,
    isAnonymous: !isLoggedIn,
  });

  const startTime = Date.now();

  try {
    const teaserResult = await vibelogAPI.processVibelogGeneration(transcriptionData, {
      enableStreaming: true,
      onStreamChunk: (_chunk: string) => {},
    });

    // ... set state code

    const processingTime = Date.now() - startTime;
    const fullContent = teaserResult.fullContent || teaserResult.content;

    track(EVENTS.VIBELOG_GENERATED, {
      wordCount: fullContent.split(/\s+/).length,
      hasImage: false,
      processingTime,
      isTeaser: teaserResult.isTeaser,
      isAnonymous: !isLoggedIn,
    });

    return fullContent;
  } catch (error) {
    track(EVENTS.VIBELOG_GENERATION_FAILED, {
      error: error instanceof Error ? error.message : 'Unknown error',
      transcriptionLength: transcriptionData.length,
    });
    throw error;
  }
}, [vibelogAPI, track, isLoggedIn]);
```

### processCoverImage

```typescript
const processCoverImage = useCallback(
  async (vibelogContentOverride?: string) => {
    try {
      const contentToUse =
        vibelogContentOverride ||
        vibelogAPI.processingData.current.vibelogContentData ||
        fullVibelogContent;

      if (!contentToUse) {
        return null;
      }

      track(EVENTS.COVER_IMAGE_STARTED, {
        vibelogWordCount: contentToUse.split(/\s+/).length,
      });

      const startTime = Date.now();
      const image = await vibelogAPI.processCoverImage({ vibelogContent: contentToUse });

      track(EVENTS.COVER_IMAGE_GENERATED, {
        processingTime: Date.now() - startTime,
        provider: 'gemini',
      });

      setCoverImage(image);
      return image;
    } catch (error) {
      track(EVENTS.COVER_IMAGE_FAILED, {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'gemini',
      });

      if (DEBUG_MODE) {
        console.warn('Cover generation failed', error);
      }
      return null;
    }
  },
  [fullVibelogContent, vibelogAPI, track]
);
```

### completeProcessing

```typescript
// At the start of function:
track(EVENTS.VIBELOG_SAVE_STARTED, {
  isAnonymous: !isLoggedIn,
  hasAudio: !!audioData,
  hasImage: !!coverImage,
});

// Before saveVibelog call:
const saveStartTime = Date.now();

// After successful save:
track(EVENTS.VIBELOG_SAVED, {
  vibelogId: result.vibelogId || 'unknown',
  isAnonymous: result.isAnonymous || false,
  saveTime: Date.now() - saveStartTime,
  retryCount: 0,
});

// In catch block:
track(EVENTS.VIBELOG_SAVE_FAILED, {
  error: error instanceof Error ? error.message : 'Unknown error',
  retryCount: 0,
  isAnonymous: !isLoggedIn,
});
```

## Summary

With all these changes, you'll track the complete user journey:

1. Recording start/stop/fail
2. Transcription pipeline
3. Content generation
4. Image generation
5. Save operations
6. User actions (copy, share, edit)
7. Upgrade prompts

This gives you full visibility into:

- Where users drop off
- How long each step takes
- Success/failure rates
- Anonymous vs logged-in behavior
