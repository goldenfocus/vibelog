---
id: 006
slug: openai-realtime-api
priority: medium
status: backlog
assignee: null
created: 2025-11-01T09:00:00.000Z
estimate: 3h
---

# OpenAI Realtime API integration

## Description

Integrate OpenAI Realtime API for voice-to-voice with audio streaming.
Target <500ms latency with error handling and fallbacks.

## Files

- `/lib/openai-realtime.ts`
- `/app/api/voice/route.ts`
- `/hooks/useVoiceConversation.ts`

## Branch

`feature/openai-realtime`

## Dependencies

Conversation state machine must be merged first (#001)

## Acceptance Criteria

- [ ] Can send voice input
- [ ] Receives voice response
- [ ] Latency <500ms (p95)
- [ ] Graceful fallback if API down
- [ ] Cost tracking (log API usage)
