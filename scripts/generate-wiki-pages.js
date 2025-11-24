#!/usr/bin/env node

/**
 * Generates GitHub Wiki pages from codebase documentation
 * Output: /tmp/vibelog-wiki/*.md
 *
 * Usage:
 *   node scripts/generate-wiki-pages.js
 */

const fs = require('fs');
const path = require('path');

const WIKI_OUTPUT_DIR = '/tmp/vibelog-wiki';
const ROOT_DIR = process.cwd();

// Simple check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Read file safely
function readFile(fileName) {
  const filePath = path.join(ROOT_DIR, fileName);
  if (!fileExists(filePath)) {
    console.warn(`[WIKI GEN] ⚠️  Warning: ${fileName} not found`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(WIKI_OUTPUT_DIR)) {
    fs.mkdirSync(WIKI_OUTPUT_DIR, { recursive: true });
    console.log(`[WIKI GEN] 📁 Created output directory: ${WIKI_OUTPUT_DIR}`);
  }
}

// Write wiki page
function writeWikiPage(fileName, content) {
  const outputPath = path.join(WIKI_OUTPUT_DIR, fileName);
  fs.writeFileSync(outputPath, content);
  console.log(`[WIKI GEN] ✅ Generated ${fileName}`);
}

// Generate Home.md from README.md
function generateHome() {
  const readme = readFile('README.md');
  if (!readme) return false;

  const content = `# VibeLog Wiki 🎤

> **Voice-to-publish platform that turns your thoughts into beautiful posts—instantly.**

**Welcome to the VibeLog documentation!** This wiki provides comprehensive guides for developers, contributors, and users.

---

## 🚀 Quick Links

### For Developers
- **[Getting Started](Getting-Started)** - Set up your development environment
- **[Engineering Standards](Engineering-Standards)** - Code quality and testing guidelines
- **[API Reference](API-Reference)** - Complete API documentation
- **[Database Schema](Database-Schema)** - Database structure and migrations

### For Contributors
- **[Contributing Guide](Contributing)** - How to contribute to VibeLog
- **[Branding Guidelines](Branding-Guidelines)** - Voice, tone, and terminology

### Product & Vision
- **[Product Vision](Product-Vision)** - The Living Web (2026-2080)
- **[Vibe Engine](Vibe-Engine)** - Emotion detection and vibe communication

---

${readme}

---

**View all documentation pages:**
- [Getting Started](Getting-Started)
- [Engineering Standards](Engineering-Standards)
- [API Reference](API-Reference)
- [Database Schema](Database-Schema)
- [Branding Guidelines](Branding-Guidelines)
- [Product Vision](Product-Vision)
- [Vibe Engine](Vibe-Engine)
- [Contributing](Contributing)
`;

  writeWikiPage('Home.md', content);
  return true;
}

// Generate Getting-Started.md
function generateGettingStarted() {
  const readme = readFile('README.md');
  if (!readme) return false;

  const content = `# Getting Started

> Set up your VibeLog development environment in under 10 minutes

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **pnpm** (recommended) - \`npm install -g pnpm\`
- **Git** ([Download](https://git-scm.com/))
- **A GitHub account** for authentication

---

## 1️⃣ Clone the Repository

\`\`\`bash
git clone https://github.com/goldenfocus/vibelog.git
cd vibelog
\`\`\`

---

## 2️⃣ Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

---

## 3️⃣ Set Up Environment Variables

Create a \`.env.local\` file in the project root:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` with your API keys:

\`\`\`bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (Required for AI features)
OPENAI_API_KEY=your_openai_api_key

# fal.ai (Optional - for video generation)
FAL_API_KEY=your_fal_api_key
\`\`\`

---

## 4️⃣ Set Up the Database

Apply database migrations to your Supabase project:

\`\`\`bash
pnpm db:migrate
\`\`\`

Check migration status:

\`\`\`bash
pnpm db:status
\`\`\`

---

## 5️⃣ Run the Development Server

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 Next Steps

- Read [Engineering Standards](Engineering-Standards)
- Check out [Branding Guidelines](Branding-Guidelines)
- Review [API Reference](API-Reference)
- Explore [Database Schema](Database-Schema)

---

**Need help?** Create an issue on [GitHub Issues](https://github.com/goldenfocus/vibelog/issues)
`;

  writeWikiPage('Getting-Started.md', content);
  return true;
}

// Generate API-Reference.md
function generateAPIReference() {
  const apiDoc = readFile('api.md');
  if (!apiDoc) return false;

  writeWikiPage('API-Reference.md', apiDoc);
  return true;
}

// Generate Branding-Guidelines.md
function generateBrandingGuidelines() {
  const branding = readFile('branding.md');
  if (!branding) return false;

  writeWikiPage('Branding-Guidelines.md', branding);
  return true;
}

// Generate Product-Vision.md
function generateProductVision() {
  const vision = readFile('living-web-2026.md');
  if (!vision) return false;

  writeWikiPage('Product-Vision.md', vision);
  return true;
}

// Generate Engineering-Standards.md
function generateEngineeringStandards() {
  const engineering = readFile('engineering.md');
  const claude = readFile('CLAUDE.md');

  if (!engineering) return false;

  const content = `${engineering}

---

## AI Agent Guidelines

_From CLAUDE.md:_

${claude ? claude.split('## Prime Directives')[1]?.split('## Tech Stack')[0] || '' : ''}

---

**See also:** [Getting Started](Getting-Started) | [Contributing](Contributing)
`;

  writeWikiPage('Engineering-Standards.md', content);
  return true;
}

// Generate Database-Schema.md
function generateDatabaseSchema() {
  const evolution = readFile('evolution.md');
  if (!evolution) return false;

  // Extract database schema section from evolution.md
  const schemaSection = evolution.split('## Database Schema Evolution')[1]?.split('##')[0] || '';

  const content = `# Database Schema

> Complete database structure and migration guide

---

${schemaSection}

---

## Migrations

Migrations are stored in \`supabase/migrations/\` and numbered sequentially.

### Apply Migrations

\`\`\`bash
# Check status
pnpm db:status

# Apply pending migrations
pnpm db:migrate
\`\`\`

---

**See also:** [API Reference](API-Reference) | [Engineering Standards](Engineering-Standards)
`;

  writeWikiPage('Database-Schema.md', content);
  return true;
}

// Generate Vibe-Engine.md
function generateVibeEngine() {
  const vibeDoc = readFile('docs/vibe-engine.md');
  if (!vibeDoc) {
    console.warn('[WIKI GEN] ⚠️  docs/vibe-engine.md not found, skipping');
    return false;
  }

  writeWikiPage('Vibe-Engine.md', vibeDoc);
  return true;
}

// Generate Contributing.md
function generateContributing() {
  const content = `# Contributing to VibeLog

> Thank you for considering contributing to VibeLog! 🎉

---

## 🌟 How Can You Contribute?

- **Code** — Bug fixes, features, refactoring
- **Documentation** — Improve docs, write guides
- **Design** — UI/UX improvements
- **Testing** — Write tests, report bugs
- **Ideas** — Suggest features, improvements

---

## 📋 Before You Start

### Required Reading

1. **[Branding Guidelines](Branding-Guidelines)** — Voice, tone, terminology
2. **[Engineering Standards](Engineering-Standards)** — Code quality rules
3. **[Product Vision](Product-Vision)** — Understand what we're building
4. **[Getting Started](Getting-Started)** — Set up your environment

---

## 🚀 Contribution Workflow

1. Fork the repository
2. Create a branch (\`feature/your-feature\`)
3. Make your changes
4. Write tests
5. Submit a pull request

---

## 📝 Code Quality

- Files < 300 LOC
- Functions < 80 LOC
- All tests pass
- TypeScript compiles

---

**See full guidelines:** [Engineering Standards](Engineering-Standards)
`;

  writeWikiPage('Contributing.md', content);
  return true;
}

// Main generation
function generateAllPages() {
  console.log('[WIKI GEN] 🚀 Starting wiki page generation...');
  console.log(`[WIKI GEN] 📂 Output directory: ${WIKI_OUTPUT_DIR}`);
  console.log('');

  ensureOutputDir();

  const generators = [
    { name: 'Home.md', fn: generateHome },
    { name: 'Getting-Started.md', fn: generateGettingStarted },
    { name: 'API-Reference.md', fn: generateAPIReference },
    { name: 'Branding-Guidelines.md', fn: generateBrandingGuidelines },
    { name: 'Product-Vision.md', fn: generateProductVision },
    { name: 'Engineering-Standards.md', fn: generateEngineeringStandards },
    { name: 'Database-Schema.md', fn: generateDatabaseSchema },
    { name: 'Vibe-Engine.md', fn: generateVibeEngine },
    { name: 'Contributing.md', fn: generateContributing },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const { name, fn } of generators) {
    try {
      if (fn()) {
        successCount++;
      } else {
        failCount++;
        console.error(`[WIKI GEN] ❌ Failed to generate ${name}`);
      }
    } catch (error) {
      failCount++;
      console.error(`[WIKI GEN] ❌ Error generating ${name}:`, error.message);
    }
  }

  console.log('');
  console.log(`[WIKI GEN] ✨ Complete: ${successCount} pages generated, ${failCount} failed`);
  console.log(`[WIKI GEN] 📖 Output: ${WIKI_OUTPUT_DIR}`);

  return successCount > 0 ? 0 : 1;
}

// Run
try {
  const exitCode = generateAllPages();
  process.exit(exitCode);
} catch (error) {
  console.error('[WIKI GEN] ❌ Fatal error:', error);
  process.exit(1);
}
