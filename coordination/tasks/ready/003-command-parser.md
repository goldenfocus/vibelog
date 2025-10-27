---
id: 003
slug: command-parser
priority: high
status: ready
assignee: null
created: 2025-11-01T09:00:00.000Z
estimate: 2h
---

# Natural language command parser

## Description

Parse user commands ("make it spicier", "change image") using GPT-4 for intent classification.
Return structured command objects and handle ambiguous commands (ask for clarification).

## Files

- `/lib/command-parser.ts`
- `/lib/command-patterns.ts`

## Branch

`feature/command-parser`

## Dependencies

None

## Acceptance Criteria

- [ ] Recognizes 15+ command patterns (edit, image, publish, etc.)
- [ ] 90%+ accuracy on test dataset (create 50 test cases)
- [ ] Fallback: asks user to clarify if <70% confidence
- [ ] Unit tests for all patterns
