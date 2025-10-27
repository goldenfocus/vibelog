---
id: 007
slug: twitter-preview-component
priority: medium
status: backlog
assignee: null
created: 2025-11-01T09:00:00.000Z
estimate: 2h
---

# Twitter thread preview component

## Description

Show pixel-perfect preview of how thread will look on Twitter.
Match Twitter's exact styling with thread numbering (1/7, 2/7, etc.).

## Files

- `/components/preview/TwitterPreview.tsx`
- `/components/preview/TweetCard.tsx`

## Branch

`feature/twitter-preview`

## Dependencies

Chat UI must be merged first (#002)

## Acceptance Criteria

- [ ] Looks identical to real Twitter
- [ ] Updates in real-time as user edits
- [ ] Shows character count per tweet
- [ ] Responsive preview
