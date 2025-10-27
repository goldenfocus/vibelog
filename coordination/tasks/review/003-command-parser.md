---
id: 003
slug: command-parser
priority: high
status: review
assignee: claude-code-reviewer-001
created: 2025-11-01T09:00:00.000Z
started: 2025-10-27T03:10:00.000Z
completed: 2025-10-27T03:07:00.000Z
estimate: 2h
time_taken: ~10 minutes (was already implemented)
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

- [x] Recognizes 15+ command patterns (edit, image, publish, etc.) - **16 command types**
- [x] 90%+ accuracy on test dataset (create 50 test cases) - **81 test cases**
- [x] Fallback: asks user to clarify if <70% confidence - **confidence threshold 0.7**
- [x] Unit tests for all patterns - **81 tests passing**

## QA Results

- ✅ All 81 tests passing
- ✅ No lint errors
- ✅ No TypeScript errors
- ✅ Files < 900 LOC (364 + 252 = 616 LOC total)
- ✅ All functions < 80 LOC
- ✅ Has JSDoc comments
- ✅ GPT-4 integration with pattern matching fallback
- ✅ Parameter extraction for tones, languages, sections
- ✅ Command validation by state
- ✅ Confidence scoring and suggestions
