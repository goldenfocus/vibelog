---
id: 005
slug: dalle-image-quality-bug
priority: high
status: ready
assignee: null
created: 2025-10-31T14:23:11.442Z
estimate: 2h
bug: true
reporter: VibeYang
---

# 🐛 BUG: DALL-E images sometimes "off"

## Description

Current DALL-E prompts sometimes generate irrelevant images.
Need better prompt engineering and add fallback to Stable Diffusion if DALL-E blocks NSFW.

## Files

- `/lib/image-generation.ts`
- `/app/api/generate-image/route.ts`

## Branch

`fix/dalle-image-quality`

## Dependencies

None

## Acceptance Criteria

- [ ] Test with 20 different vibelog samples
- [ ] Image relevance >90% (subjective but clear)
- [ ] NSFW content falls back to SD
- [ ] Add prompt templates for different content types
