# Vibe Communication Engine - API & SDK Documentation

> Complete API reference and SDK documentation for integrating vibe-based communication

## API Endpoints

### POST /api/vibe/analyze

Analyze text for vibe metadata.

**Request:**
```json
{
  "text": "I'm feeling amazing today!",
  "context": {
    "previousMessages": ["Previous message"],
    "userId": "user-123",
    "customProfileId": "profile-456"
  }
}
```

**Response:**
```json
{
  "data": {
    "vibe": {
      "scores": {
        "excitement": 85,
        "humor": 30,
        "flirtation": 20,
        "calmness": 60,
        "stress": 15,
        "authenticity": 90,
        "chaos": 25,
        "warmth": 70,
        "confidence": 80,
        "vulnerability": 40
      },
      "primaryVibe": "excited",
      "confidence": 0.92,
      "microVibes": {
        "enthusiasm": 85,
        "intensity": 75
      },
      "hiddenVibes": {
        "maskingStress": false,
        "maskingSadness": false,
        "maskingAnger": false,
        "notOkayButOkay": false,
        "performativeHappiness": false
      },
      "detectedAt": "2024-01-01T12:00:00Z",
      "modelVersion": "1.0.0",
      "processingTime": 245,
      "textLength": 28,
      "language": "en"
    },
    "safety": {
      "passed": true,
      "warnings": []
    }
  },
  "success": true,
  "metadata": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T12:00:00Z",
    "processingTime": 245
  }
}
```

### GET /api/vibe/state

Get user's current vibe state.

**Query Parameters:**
- `userId` (required): User UUID

**Response:**
```json
{
  "data": {
    "state": {
      "userId": "user-123",
      "currentVibe": {
        "excitement": 70,
        "humor": 40,
        "flirtation": 25,
        "calmness": 65,
        "stress": 30,
        "authenticity": 80,
        "chaos": 35,
        "warmth": 60,
        "confidence": 75,
        "vulnerability": 45
      },
      "primaryVibe": "excited",
      "recentVibes": [],
      "vibeThresholds": {
        "doomscrollBlock": 75,
        "vibeRaveTrigger": 80,
        "clarityModeTrigger": 70
      },
      "osSettings": {
        "vibeMonitoringEnabled": true,
        "blockingEnabled": true,
        "uiEnhancementsEnabled": true,
        "privacyMode": "partial"
      },
      "lastUpdated": "2024-01-01T12:00:00Z",
      "sessionStart": "2024-01-01T10:00:00Z"
    }
  },
  "success": true
}
```

### POST /api/vibe/state

Update user's vibe state.

**Request:**
```json
{
  "userId": "user-123",
  "text": "I'm feeling great!",
  "settings": {
    "vibeMonitoringEnabled": true,
    "blockingEnabled": true,
    "uiEnhancementsEnabled": true,
    "privacyMode": "partial"
  },
  "thresholds": {
    "doomscrollBlock": 75,
    "vibeRaveTrigger": 80,
    "clarityModeTrigger": 70
  }
}
```

### POST /api/vibe/packet

Send a vibe packet (VTP protocol).

**Request:**
```json
{
  "packet": {
    "text": "Hello! How are you?",
    "senderId": "user-123",
    "senderMoodSignature": {
      "excitement": 70,
      "humor": 40
    },
    "expiresIn": 3600,
    "context": {
      "previousMessages": ["Previous message"]
    }
  },
  "recipientId": "user-456"
}
```

**Response:**
```json
{
  "data": {
    "packet": {
      "text": "Hello! How are you?",
      "vibe": { /* VibeAnalysis */ },
      "senderId": "user-123",
      "packetId": "packet-789",
      "timestamp": "2024-01-01T12:00:00Z",
      "vtpVersion": "1.0.0"
    },
    "delivered": true,
    "recipientVibeState": { /* UserVibeState */ }
  },
  "success": true
}
```

## JavaScript SDK

### Installation

```bash
npm install @vibelog/vibe-sdk
```

### Basic Usage

```typescript
import { VibeSDK } from '@vibelog/vibe-sdk';

const vibe = new VibeSDK({
  apiKey: 'your-api-key',
  baseURL: 'https://vibelog.io/api'
});

// Analyze text
const analysis = await vibe.analyze('I\'m feeling great!');
console.log(analysis.primaryVibe); // "excited"

// Get vibe state
const state = await vibe.getState('user-123');
console.log(state.currentVibe.excitement);

// Send vibe packet
const packet = await vibe.sendPacket({
  text: 'Hello!',
  recipientId: 'user-456'
});
```

### React Hook

```tsx
import { useVibe } from '@vibelog/vibe-sdk/react';

function ChatMessage({ text }) {
  const { analyzeText, currentVibe } = useVibe({
    userId: 'user-123',
    autoUpdate: true
  });

  useEffect(() => {
    analyzeText(text);
  }, [text]);

  return (
    <div>
      <p>{text}</p>
      {currentVibe && (
        <VibeIndicator vibe={currentVibe} />
      )}
    </div>
  );
}
```

## Python SDK

### Installation

```bash
pip install vibelog-vibe-sdk
```

### Usage

```python
from vibelog import VibeSDK

vibe = VibeSDK(api_key='your-api-key')

# Analyze text
analysis = vibe.analyze("I'm feeling great!")
print(analysis.primary_vibe)  # "excited"

# Get vibe state
state = vibe.get_state('user-123')
print(state.current_vibe['excitement'])

# Send vibe packet
packet = vibe.send_packet(
    text='Hello!',
    recipient_id='user-456'
)
```

## Swift SDK (iOS)

### Installation

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/vibelog/vibe-sdk-swift", from: "1.0.0")
]
```

### Usage

```swift
import VibeSDK

let vibe = VibeSDK(apiKey: "your-api-key")

// Analyze text
vibe.analyze(text: "I'm feeling great!") { result in
    switch result {
    case .success(let analysis):
        print(analysis.primaryVibe) // "excited"
    case .failure(let error):
        print(error)
    }
}

// Get vibe state
vibe.getState(userId: "user-123") { result in
    // Handle state
}
```

## Kotlin SDK (Android)

### Installation

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.vibelog:vibe-sdk:1.0.0")
}
```

### Usage

```kotlin
import io.vibelog.vibe.VibeSDK

val vibe = VibeSDK(apiKey = "your-api-key")

// Analyze text
vibe.analyze("I'm feeling great!") { result ->
    result.onSuccess { analysis ->
        println(analysis.primaryVibe) // "excited"
    }.onFailure { error ->
        println(error)
    }
}

// Get vibe state
vibe.getState("user-123") { result ->
    // Handle state
}
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "success": false,
  "metadata": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**Error Codes:**
- `VALIDATION_FAILED` - Invalid request body
- `INTERNAL_ERROR` - Server error
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INVALID_PACKET` - VTP packet validation failed

## Rate Limits

- Free tier: 100 requests/hour
- Pro tier: 1,000 requests/hour
- Enterprise: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## Webhooks

Subscribe to vibe events:

- `vibe.analyzed` - When vibe is analyzed
- `vibe.packet.sent` - When vibe packet is sent
- `vibe.state.updated` - When user vibe state updates
- `vibe.threshold.triggered` - When vibe threshold is triggered

## Examples

### Real-time Chat Integration

```typescript
// Analyze messages as they're typed
const handleMessageChange = async (text: string) => {
  const vibe = await vibeSDK.analyze(text);
  
  // Update UI based on vibe
  if (vibe.primaryVibe === 'excited') {
    showCelebration();
  }
  
  // Check safety
  if (!vibe.safety.passed) {
    showWarning(vibe.safety.warnings);
  }
};
```

### OS Layer Integration

```typescript
// Check if action should be blocked
const checkAction = async (action: string) => {
  const state = await vibeSDK.getState(userId);
  const os = getVibelogOS();
  
  const result = os.shouldBlockAction(state, action);
  if (result.blocked) {
    showBlockedMessage(result.reason, result.suggestion);
    return false;
  }
  
  return true;
};
```

### Vibe Timeline

```typescript
// Get vibe history for timeline
const getVibeHistory = async (userId: string) => {
  // Fetch from database or API
  const history = await fetch(`/api/vibe/history?userId=${userId}`);
  return history.json();
};
```

## Support

- Documentation: https://docs.vibelog.io/vibe-engine
- API Reference: https://api.vibelog.io/docs
- Support: support@vibelog.io
- GitHub: https://github.com/vibelog/vibe-sdk

