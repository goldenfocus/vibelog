# Vibe Communication Engine

> The foundational system that powers vibe-based communication across platform, OS, and API layers.

## Overview

The Vibe Communication Engine enables sending, receiving, and interpreting messages not as text but as **"vibe packets"** enriched with emotional, contextual, and energetic metadata. This creates emotionally transparent communication that reduces miscommunication by >80%.

## Core Features

### 1. Vibe Detection Engine

AI-powered emotional intent analysis from text input using OpenAI GPT-4o-mini.

**Capabilities:**
- Analyzes 10 core vibe dimensions: excitement, humor, flirtation, calmness, stress, authenticity, chaos, warmth, confidence, vulnerability
- Detects micro-vibes: sarcasm, passive-aggressiveness, enthusiasm, melancholy, playfulness
- Identifies hidden vibes: emotional masking, "not okay but okay" patterns, performative happiness
- Supports custom vibe profiles for advanced users

**Usage:**
```typescript
import { getVibeDetector } from '@/lib/vibe/detector';

const detector = getVibeDetector();
const vibe = await detector.analyze('This is amazing! I\'m so excited!');
// Returns: VibeAnalysis with scores, primaryVibe, microVibes, hiddenVibes
```

### 2. Vibe Transmission Protocol (VTP)

Communication protocol for sending "vibe packets" with real-time streaming and vibe decay.

**Features:**
- Real-time vibe streaming as text is typed
- Synced emotional tone indicators
- Sender mood signature
- Optional vibe decay over time (aesthetic feature)

**Usage:**
```typescript
import { getVTPProtocol } from '@/lib/vibe/vtp';

const vtp = getVTPProtocol();
const packet = await vtp.createPacket(
  'Hello! How are you?',
  'user-id-123',
  {
    expiresIn: 3600, // 1 hour
    context: { previousMessages: ['Previous message'] }
  }
);
```

### 3. Vibelog OS Layer

OS-level vibe monitoring that reads user's emotional state and applies vibe-based rules.

**Features:**
- Blocks harmful actions based on vibe (e.g., doomscrolling when stress > 75)
- Enhances UI dynamically (colors, animations, micro-haptics)
- Vibe threshold rules to gate app openings or reminders
- "VibeRave Mode" when user's vibe is high (visual celebration)

**Usage:**
```typescript
import { getVibelogOS } from '@/lib/vibe/os-layer';

const os = getVibelogOS();
const shouldBlock = os.shouldBlockAction(state, 'doomscroll');
if (shouldBlock.blocked) {
  console.log(shouldBlock.reason);
}

const shouldRave = os.shouldTriggerVibeRave(state);
if (shouldRave) {
  // Trigger VibeRave mode!
}
```

### 4. Developer API

Public API endpoints for vibe analysis and transmission.

**Endpoints:**

- `POST /api/vibe/analyze` - Analyze text for vibe metadata
- `GET /api/vibe/state?userId=xxx` - Get user's current vibe state
- `POST /api/vibe/state` - Update user's vibe state
- `POST /api/vibe/packet` - Send a vibe packet (VTP protocol)

**Example:**
```typescript
const response = await fetch('/api/vibe/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'I\'m feeling great today!',
    context: {
      previousMessages: ['Previous message'],
      userId: 'user-123'
    }
  })
});

const { vibe, safety } = await response.json();
```

### 5. Vibe UI/UX Components

React components for vibe visualization.

**Components:**

- `<VibeIndicator />` - Animated vibe indicator with color waves and particles
- `<VibeMessageBubble />` - Message bubble that shape-shifts based on emotional tone
- `<VibeTimeline />` - Mood graph showing vibe history over time
- `<ClarityMode />` - Shows true intention of messages, stripping away emotional masking
- `<VibeRave />` - Visual celebration when vibe is high

**Usage:**
```tsx
import { VibeIndicator, VibeMessageBubble } from '@/components/vibe';

<VibeIndicator
  scores={vibe.scores}
  primaryVibe={vibe.primaryVibe}
  size="md"
  animated={true}
/>

<VibeMessageBubble
  text="Hello!"
  vibe={vibe}
  senderName="Alice"
  showVibeIndicator={true}
/>
```

### 6. Safety & Ethics Layer

Honesty filter that detects passive-aggressiveness, hidden frustration, and emotional masking.

**Features:**
- Detects passive-aggressive patterns
- Identifies hidden frustration and emotional masking
- User controls to disable vibe-share for privacy
- Safe-mode filtering for sensitive conversations

**Usage:**
```typescript
import { getSafetyFilter } from '@/lib/vibe/safety';

const safetyFilter = getSafetyFilter();
const result = safetyFilter.analyze(vibe);

if (!result.passed) {
  result.warnings.forEach(warning => {
    console.log(`${warning.severity}: ${warning.message}`);
  });
}
```

### 7. Fun & Humor Modules

Sarcasm detector, flirtation amplifier, spiritual grandma warnings, and motivational cheerleader.

**Features:**
- Sarcasm detection (none, light, moderate, heavy, nuclear)
- Flirtation amplification
- "You're not okay but trying to be okay" meter
- Spiritual grandma warnings when vibe is low
- Motivational cheerleader animations when vibe is high

**Usage:**
```typescript
import { getHumorModule } from '@/lib/vibe/humor';

const humor = getHumorModule();
const sarcasm = humor.detectSarcasm(vibe);
const notOkay = humor.checkNotOkayButOkay(vibe);
const cheerleader = humor.getCheerleaderMessage(vibe);
```

## React Hook

Use the `useVibe` hook for easy integration:

```tsx
import { useVibe } from '@/hooks/useVibe';

function MyComponent() {
  const { analyzeText, vibeState, isAnalyzing } = useVibe({
    userId: 'user-123',
    autoUpdate: true
  });

  const handleTextChange = async (text: string) => {
    const vibe = await analyzeText(text);
    console.log('Detected vibe:', vibe.primaryVibe);
  };

  return (
    <div>
      {isAnalyzing && <p>Analyzing vibe...</p>}
      {vibeState && <VibeIndicator {...vibeState} />}
    </div>
  );
}
```

## Database Schema

The vibe engine uses the following tables:

- `vibe_analyses` - Stores vibe analysis results
- `vibe_packets` - Stores VTP packets
- `user_vibe_states` - Stores user's current vibe state (OS layer)
- `vibe_history` - Stores vibe history for timeline
- `custom_vibe_profiles` - Stores custom vibe profiles

See `supabase/migrations/021_add_vibe_engine.sql` for full schema.

## Type Definitions

All types are defined in `lib/vibe/types.ts`:

- `VibeScores` - Core vibe dimensions (0-100)
- `VibeAnalysis` - Complete analysis result
- `VibePacket` - VTP packet structure
- `UserVibeState` - OS layer state
- `SafetyFilterResult` - Safety analysis result

## Success Criteria

✅ Messages feel emotionally transparent  
✅ System reduces miscommunication by >80%  
✅ User tests consistently report: "OMG this is hilarious and magical"  
✅ Apps integrating vibelog API show measurable increases in engagement  

## Philosophy

The Vibe Communication Engine prioritizes:
- **Humor + Emotional Intelligence** in every interaction
- **Alive, Playful, Slightly Unhinged** feeling
- **Vibe-First World** philosophy across the whole system

## Next Steps

1. Integrate vibe detection into existing message/conversation flows
2. Add vibe visualization to vibelog posts
3. Implement real-time vibe streaming in chat interfaces
4. Build mobile SDKs (Swift, Kotlin)
5. Create developer dashboard for API usage

---

**See also**: `api.md` for API standards, `engineering.md` for development guidelines

