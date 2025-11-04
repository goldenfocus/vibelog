# TypeScript Strict Mode Migration Plan

## Executive Summary

This document outlines a phased approach to enable TypeScript strict mode in the VibeLog codebase. The current configuration has all strict checks disabled, which eliminates most of TypeScript's benefits and increases runtime error risk.

**Timeline:** 3-4 weeks
**Priority:** High
**Risk Level:** Medium (requires careful testing)

---

## Current State

### Current tsconfig.json Settings (PROBLEMATIC)

```json
{
  "noImplicitAny": false, // Allows implicit 'any' types
  "strict": false, // Disables all strict checks
  "strictNullChecks": false, // Allows null/undefined without checks
  "noUnusedParameters": false, // Allows unused function parameters
  "noUnusedLocals": false // Allows unused variables
}
```

### Impact Assessment

**Files Affected:** Estimated 100+ type errors across:

- `hooks/` - 14 custom hooks
- `lib/` - 24 utility files
- `components/` - 62 component files
- `app/api/` - 30+ API routes
- `state/` - 2 state stores

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

#### 1.1 Audit Current Type Issues

Run TypeScript with strict mode to identify all errors:

```bash
# Create a temporary strict tsconfig
cp tsconfig.json tsconfig.strict.json

# Edit tsconfig.strict.json to enable strict mode
# Then run type check
npx tsc --noEmit --project tsconfig.strict.json > typescript-errors.txt
```

**Action Items:**

- [ ] Generate full error report
- [ ] Categorize errors by severity and module
- [ ] Identify most problematic files (>50 errors)

#### 1.2 Set Up Incremental Adoption

Create a `tsconfig.strict.json` for gradual migration:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": [
    // Start with specific files/directories
    "lib/config.ts",
    "lib/env.ts"
  ]
}
```

**Action Items:**

- [ ] Create `tsconfig.strict.json`
- [ ] Add npm script: `"typecheck:strict": "tsc --noEmit --project tsconfig.strict.json"`
- [ ] Document migration process in README

### Phase 2: Fix Type Definitions (Week 1-2)

#### 2.1 Priority Order

Fix in this order (easiest to hardest):

1. **Utility Files** (`lib/config.ts`, `lib/env.ts`, `lib/utils.ts`)
2. **Type Definitions** (`types/database.ts`, `types/micRecorder.ts`)
3. **State Stores** (`state/audio-player-store.ts`, `state/conversation-state.ts`)
4. **Hooks** (start with `useProfile.ts`, then others)
5. **Components** (UI primitives first, then complex components)
6. **API Routes** (most complex due to external APIs)

#### 2.2 Common Fixes Required

##### Fix 1: Remove Index Signatures

**Before:**

```typescript
type Profile = {
  id: string;
  username?: string;
  [key: string]: unknown; // ❌ BAD
} | null;
```

**After:**

```typescript
type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  header_image: string | null;
  // Add all known fields explicitly
} | null;
```

##### Fix 2: Add Null Checks

**Before:**

```typescript
function useProfile(userId: string | null | undefined) {
  // userId might be null/undefined - not handled
  const result = await supabase.from('profiles').eq('id', userId); // ❌ Potential null
}
```

**After:**

```typescript
function useProfile(userId: string | null | undefined) {
  if (!userId) {
    setProfile(null);
    return;
  }
  // Now userId is guaranteed to be string
  const result = await supabase.from('profiles').eq('id', userId); // ✅ Safe
}
```

##### Fix 3: Explicit Return Types

**Before:**

```typescript
async function processInput(input: string) {
  // ❌ Inferred return type
  // ...
  return response;
}
```

**After:**

```typescript
async function processInput(input: string): Promise<string> {
  // ✅ Explicit
  // ...
  return response;
}
```

##### Fix 4: Remove Implicit Any

**Before:**

```typescript
const items = []; // ❌ any[]
items.push({ name: 'test' }); // No type checking
```

**After:**

```typescript
interface Item {
  name: string;
}
const items: Item[] = []; // ✅ Typed
items.push({ name: 'test' }); // Type checked
```

##### Fix 5: Strict Function Parameters

**Before:**

```typescript
function handleEdit(command) {
  // ❌ Implicit any
  console.log(command.intent); // No autocomplete
}
```

**After:**

```typescript
function handleEdit(command: ParsedCommand): Promise<string> {
  // ✅ Typed
  console.log(command.intent); // Full autocomplete
}
```

### Phase 3: Incremental Migration (Week 2-3)

#### 3.1 Migration Workflow

For each file/module:

1. **Add to strict includes:**

   ```json
   "include": [
     "lib/config.ts",
     "lib/env.ts",
     "lib/utils.ts" // ← Add next file
   ]
   ```

2. **Run type check:**

   ```bash
   npm run typecheck:strict
   ```

3. **Fix all errors** in that file

4. **Run tests:**

   ```bash
   npm run test
   npm run test:e2e
   ```

5. **Commit:**

   ```bash
   git add .
   git commit -m "feat(types): enable strict mode for lib/utils.ts"
   ```

6. **Repeat** for next file

#### 3.2 Module-by-Module Checklist

**Week 2:**

- [ ] `lib/config.ts`
- [ ] `lib/env.ts`
- [ ] `lib/utils.ts`
- [ ] `lib/errorHandler.ts`
- [ ] `types/database.ts`
- [ ] `types/micRecorder.ts`
- [ ] `state/audio-player-store.ts`
- [ ] `state/conversation-state.ts`

**Week 3:**

- [ ] `hooks/useProfile.ts`
- [ ] `hooks/useAnalytics.ts`
- [ ] `hooks/useToneSettings.ts`
- [ ] `hooks/useAudioPlayback.ts`
- [ ] `lib/conversation-engine.ts`
- [ ] `lib/command-parser.ts`
- [ ] `lib/supabase.ts`
- [ ] `lib/session.ts`

**Week 4:**

- [ ] `components/ui/*` (16 primitives)
- [ ] `components/common/*`
- [ ] Core feature components
- [ ] API routes (last - most complex)

### Phase 4: Full Enablement (Week 4)

#### 4.1 Enable Strict Mode Globally

Once all files are migrated, update main `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Keep these for backwards compatibility
    "skipLibCheck": true,
    "allowJs": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

#### 4.2 CI/CD Integration

Add strict type checking to CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run typecheck

- name: Type Check (Strict)
  run: npx tsc --noEmit
```

Update package.json:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "lint": "eslint && npm run typecheck"
  }
}
```

#### 4.3 Pre-commit Hook

Update `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run type check before commit
npm run typecheck

# Run lint-staged
npx lint-staged
```

---

## Risk Mitigation

### Potential Issues

1. **Breaking Changes:** Strict mode may reveal runtime bugs
   - **Mitigation:** Comprehensive testing after each phase

2. **Developer Disruption:** Existing branches will have conflicts
   - **Mitigation:** Clear communication, migration window coordination

3. **Third-party Types:** Some libraries may have incomplete types
   - **Mitigation:** Use `skipLibCheck: true` for node_modules

4. **Time Overrun:** More errors than estimated
   - **Mitigation:** Start with smallest modules, adjust timeline

### Rollback Plan

If critical issues arise:

1. Revert main `tsconfig.json` to original settings
2. Keep `tsconfig.strict.json` for gradual adoption
3. Mark migrated files with comment: `// @ts-strict-migrated`

---

## Success Metrics

- [ ] 0 TypeScript errors with strict mode enabled
- [ ] 100% of source files under strict checking
- [ ] All tests passing (unit + E2E)
- [ ] No regression in production metrics
- [ ] Improved IDE autocomplete performance
- [ ] Reduced Sentry error rate (2 weeks post-migration)

---

## Tools & Resources

### Useful Commands

```bash
# Count type errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Find files with most errors
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -rn

# Type check specific file
npx tsc --noEmit path/to/file.ts

# Generate error report
npx tsc --noEmit --pretty false > typescript-errors.txt
```

### TypeScript Migration Tools

- **ts-migrate** (Airbnb): Automated migration tool

  ```bash
  npx ts-migrate migrate ./src
  ```

- **ts-prune**: Find unused exports
  ```bash
  npx ts-prune
  ```

### Documentation

- [TypeScript Strict Mode Handbook](https://www.typescriptlang.org/docs/handbook/compiler-options.html#strict)
- [TypeScript Migration Guide](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)
- [Strict Mode Best Practices](https://blog.logrocket.com/typescript-strict-mode/)

---

## Communication Plan

### Week 1 Announcement

**Subject:** TypeScript Strict Mode Migration - Starting Week 1

Team,

We're beginning a 4-week migration to enable TypeScript strict mode. This will:

- Catch bugs at compile time instead of runtime
- Improve IDE autocomplete and refactoring
- Make the codebase more maintainable

**What to expect:**

- Gradual rollout over 4 weeks
- Daily commits with strict mode fixes
- Temporary increase in PR review time

**What you should do:**

- Merge your current branches before Week 2
- Watch for migration commits to avoid conflicts
- Ask questions in #engineering-types channel

### Weekly Updates

Send progress update every Friday:

- Files migrated this week
- Remaining files
- Blockers or issues encountered

---

## Appendix A: File-by-File Type Error Estimates

| Module           | Files   | Est. Errors | Priority |
| ---------------- | ------- | ----------- | -------- |
| lib/config.ts    | 1       | 5-10        | High     |
| lib/env.ts       | 1       | 3-5         | High     |
| types/\*         | 2       | 20-30       | High     |
| state/\*         | 2       | 15-20       | High     |
| hooks/\*         | 14      | 50-70       | Medium   |
| components/ui/\* | 16      | 30-40       | Medium   |
| components/\*    | 46      | 100-150     | Low      |
| app/api/\*       | 30      | 150-200     | Low      |
| **TOTAL**        | **112** | **373-525** | -        |

---

## Appendix B: Example Migration PR Template

```markdown
## TypeScript Strict Mode Migration

**Module:** hooks/useProfile.ts

### Changes

- Added explicit null checks for `userId` parameter
- Removed `[key: string]: unknown` index signature from Profile type
- Added all database fields to Profile type definition
- Made return types explicit

### Type Errors Fixed

- 8 errors related to implicit any
- 3 errors related to null/undefined checks
- 2 errors related to missing return types

### Testing

- [x] Unit tests pass
- [x] E2E tests pass
- [x] Manual testing completed

### Migration Progress

- [x] lib/config.ts
- [x] lib/env.ts
- [x] hooks/useProfile.ts ← This PR
- [ ] hooks/useAnalytics.ts
- [ ] ... (remaining files)

**Checklist:**

- [ ] No new TypeScript errors introduced
- [ ] All existing tests pass
- [ ] Updated migration tracker in docs/
```

---

## Questions & Support

**Slack:** #engineering-types
**Document Owner:** Engineering Lead
**Last Updated:** 2025-11-04

For questions about specific type errors or migration strategy, reach out in the Slack channel or during daily standups.
