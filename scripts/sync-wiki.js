#!/usr/bin/env node

/**
 * Syncs generated wiki pages to GitHub Wiki repository
 * Requires: Wiki must exist (create first page manually)
 *
 * Usage:
 *   node scripts/sync-wiki.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WIKI_DIR = '/tmp/vibelog-wiki';
const WIKI_REPO_DIR = '/tmp/vibelog-wiki-repo';
const WIKI_REPO_URL = 'https://github.com/goldenfocus/vibelog.wiki.git';

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe', ...options });
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

async function syncWiki() {
  console.log('[WIKI SYNC] 🚀 Starting wiki synchronization...');
  console.log('');

  // Step 1: Generate wiki pages
  console.log('[WIKI SYNC] 📝 Generating wiki pages...');
  try {
    exec('node scripts/generate-wiki-pages.js');
  } catch (error) {
    console.error('[WIKI SYNC] ❌ Failed to generate wiki pages');
    throw error;
  }

  // Step 2: Clone or pull wiki repo
  if (fs.existsSync(WIKI_REPO_DIR)) {
    console.log('[WIKI SYNC] 🔄 Pulling latest wiki changes...');
    try {
      exec('git pull', { cwd: WIKI_REPO_DIR });
    } catch (error) {
      console.warn('[WIKI SYNC] ⚠️  Pull failed, removing and re-cloning...');
      fs.rmSync(WIKI_REPO_DIR, { recursive: true, force: true });
    }
  }

  if (!fs.existsSync(WIKI_REPO_DIR)) {
    console.log('[WIKI SYNC] 📥 Cloning wiki repository...');
    try {
      exec(`git clone ${WIKI_REPO_URL} ${WIKI_REPO_DIR}`);
    } catch (error) {
      console.error('[WIKI SYNC] ❌ Failed to clone wiki repository');
      console.error('[WIKI SYNC] 💡 Make sure the wiki exists (create first page manually)');
      console.error('[WIKI SYNC] 🔗 Go to: https://github.com/goldenfocus/vibelog/wiki');
      throw error;
    }
  }

  // Step 3: Copy generated pages to wiki repo
  console.log('[WIKI SYNC] 📋 Copying wiki pages...');
  const files = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.error('[WIKI SYNC] ❌ No wiki pages found to sync');
    process.exit(1);
  }

  for (const file of files) {
    // Skip helper files
    if (file === 'UPLOAD_INSTRUCTIONS.md' || file === 'README.md') {
      continue;
    }

    const src = path.join(WIKI_DIR, file);
    const dest = path.join(WIKI_REPO_DIR, file);
    fs.copyFileSync(src, dest);
    console.log(`[WIKI SYNC]   ✅ ${file}`);
  }

  // Step 4: Check for changes
  console.log('[WIKI SYNC] 🔍 Checking for changes...');
  try {
    exec('git add .', { cwd: WIKI_REPO_DIR });

    // Check if there are changes to commit
    try {
      exec('git diff-index --quiet HEAD --', { cwd: WIKI_REPO_DIR });
      console.log('[WIKI SYNC] ℹ️  No changes detected, wiki is already up to date');
      return false;
    } catch {
      // Changes detected, proceed with commit
    }
  } catch (error) {
    console.error('[WIKI SYNC] ❌ Failed to stage changes');
    throw error;
  }

  // Step 5: Commit changes
  console.log('[WIKI SYNC] 💾 Committing changes...');

  // Get the last commit message for context
  let lastCommit = '';
  try {
    lastCommit = exec('git log -1 --pretty=%B', { cwd: process.cwd() }).trim().split('\n')[0];
  } catch {
    lastCommit = 'docs: update';
  }

  const commitMsg = `docs: Sync wiki with codebase

Auto-generated from:
- README.md
- evolution.md
- api.md
- branding.md
- CLAUDE.md
- engineering.md
- living-web-2026.md

Last codebase commit: ${lastCommit}

🤖 Generated with Claude Code`;

  try {
    exec(`git commit -m "${commitMsg}"`, { cwd: WIKI_REPO_DIR });
  } catch (error) {
    console.error('[WIKI SYNC] ❌ Failed to commit changes');
    throw error;
  }

  // Step 6: Push to GitHub
  console.log('[WIKI SYNC] 📤 Pushing to GitHub...');
  try {
    exec('git push origin master', { cwd: WIKI_REPO_DIR });
  } catch (error) {
    console.error('[WIKI SYNC] ❌ Failed to push to GitHub');
    console.error('[WIKI SYNC] 💡 Make sure you have push access to the wiki');
    throw error;
  }

  console.log('');
  console.log('[WIKI SYNC] ✨ Wiki synchronized successfully!');
  console.log('[WIKI SYNC] 🌐 View at: https://github.com/goldenfocus/vibelog/wiki');
  console.log('');

  return true;
}

// Run
syncWiki()
  .then(updated => {
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('[WIKI SYNC] ❌ Sync failed:', error.message);
    console.error('');
    console.error('[WIKI SYNC] 🔧 Troubleshooting:');
    console.error('[WIKI SYNC]    1. Ensure wiki exists (create first page manually)');
    console.error('[WIKI SYNC]    2. Check git authentication');
    console.error('[WIKI SYNC]    3. Verify repository permissions');
    console.error('');
    process.exit(1);
  });
