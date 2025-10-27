---
id: 004
slug: twitter-automation
priority: high
status: ready
assignee: null
created: 2025-11-01T09:00:00.000Z
estimate: 4h
---

# Twitter browser automation

## Description

Use Playwright to post tweets with thread support (multi-tweet posts with proper numbering).
Store session cookies securely (encrypted) and handle rate limits gracefully.

## Files

- `/lib/publishers/twitter-automation.ts`
- `/lib/publishers/twitter-auth.ts`

## Branch

`feature/twitter-automation`

## Dependencies

None

## Acceptance Criteria

- [ ] Can authenticate with Twitter
- [ ] Can post single tweet
- [ ] Can post thread (up to 25 tweets)
- [ ] Handles rate limits gracefully (exponential backoff)
- [ ] Secure cookie storage (encryption)
- [ ] E2E test with test account
