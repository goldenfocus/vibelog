#!/usr/bin/env node

/**
 * Detects if GitHub Wiki needs updating based on recent changes
 * Returns exit code 0 if update needed, 1 if not
 *
 * Usage:
 *   node scripts/detect-wiki-updates.js
 *   if [ $? -eq 0 ]; then echo "Wiki update needed"; fi
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Files that trigger wiki updates
const WIKI_TRIGGER_FILES = [
  'README.md',
  'evolution.md',
  'api.md',
  'branding.md',
  'CLAUDE.md',
  'living-web-2026.md',
  'engineering.md',
];

// Check if we're in a git repository
function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Get changed files in last commit
function getChangedFiles() {
  try {
    const output = execSync('git diff-tree --no-commit-id --name-only -r HEAD', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    // If diff-tree fails (e.g., first commit), try different approach
    try {
      const output = execSync('git show --name-only --pretty=format: HEAD', { encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

// Check commit message for wiki triggers
function checkCommitMessage() {
  try {
    const message = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' });
    const triggers = [
      /^feat:/i,
      /^breaking:/i,
      /^api:/i,
      /\[wiki\]/i,
      /\[documentation\]/i,
      /database.*schema/i,
      /migration/i,
    ];
    return triggers.some(pattern => pattern.test(message));
  } catch {
    return false;
  }
}

// Check if any migration files changed
function hasMigrationChanges(files) {
  return files.some(f => f.startsWith('supabase/migrations/'));
}

// Check if any API route files changed
function hasAPIChanges(files) {
  return files.some(f => f.startsWith('app/api/') && f.endsWith('/route.ts'));
}

// Main detection logic
function shouldUpdateWiki() {
  if (!isGitRepo()) {
    console.log('[WIKI DETECT] Not a git repository, skipping detection');
    return false;
  }

  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.log('[WIKI DETECT] No changed files detected');
    return false;
  }

  // Check for documentation file changes
  const docChanges = changedFiles.filter(f => WIKI_TRIGGER_FILES.includes(f));
  if (docChanges.length > 0) {
    console.log('[WIKI DETECT] 📝 Documentation files changed:', docChanges.join(', '));
    return true;
  }

  // Check for migration changes
  if (hasMigrationChanges(changedFiles)) {
    console.log('[WIKI DETECT] 🗄️  Database migration detected');
    return true;
  }

  // Check for API changes
  if (hasAPIChanges(changedFiles)) {
    console.log('[WIKI DETECT] 🔌 API endpoint changes detected');
    return true;
  }

  // Check commit message
  if (checkCommitMessage()) {
    console.log('[WIKI DETECT] 💬 Commit message indicates wiki update');
    return true;
  }

  console.log('[WIKI DETECT] No wiki update triggers detected');
  return false;
}

// Run detection
try {
  if (shouldUpdateWiki()) {
    console.log('[WIKI DETECT] ✅ Wiki update NEEDED');
    console.log('[WIKI DETECT] Run: pnpm wiki:sync');
    process.exit(0);
  } else {
    console.log('[WIKI DETECT] ❌ No wiki update needed');
    process.exit(1);
  }
} catch (error) {
  console.error('[WIKI DETECT] ⚠️  Error during detection:', error.message);
  process.exit(1);
}
