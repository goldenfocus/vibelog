# VibeLog 🎤

> Voice-to-blog that turns your thoughts into beautiful posts—instantly.

**Speak your vibe. Publish everywhere.**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Git

### Setup
```bash
# Clone the repo
git clone [repo-url] vibelog
cd vibelog

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
pnpm dev
```

Visit `http://localhost:3000` to start vibelogging.

### First-Time Development
1. **Check the lab**: Visit `/lab` for component playground
2. **Read the docs**: Start with `engineering.md` for coding standards
3. **Run tests**: `pnpm test` (unit), `pnpm test:e2e` (end-to-end)
4. **Visual tests**: `pnpm test:visual` for UI regression checks

---

## 📁 Project Structure

```
/app                # Next.js routes + loaders only
/components         # Reusable UI components
  /polish           # Micro-animations, skeletons, effects
/lib                # Pure logic: formatters, services, schemas
/hooks              # Custom React hooks (single concern)
/state              # State machines or reducers
/tests              # Unit + E2E + visual snapshots
/lab                # Component playground for all UI states
```

---

## 🧪 Development Workflow

### Before You Code
1. Check existing patterns in similar components
2. Read `branding.md` for copy and tone guidelines
3. Follow `engineering.md` for technical standards

### Making Changes
1. **Create branch**: `git checkout -b feature/your-feature`
2. **Run tests**: Ensure baseline passes
3. **Code**: Keep files <300 LOC, functions <80 LOC
4. **Test**: Add unit + E2E + visual tests for changes
5. **Visual check**: Run `pnpm test:visual` for UI changes

### Ready to Ship
1. **Lint & type check**: `pnpm lint && pnpm typecheck`
2. **All tests green**: `pnpm test:all`
3. **Create PR**: Follow template in `.github/pull_request_template.md`
4. **Review**: Wait for CI + reviewer approval

---

## 🛠 Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server

# Testing
pnpm test             # Unit tests (Vitest)
pnpm test:e2e         # End-to-end tests (Playwright)
pnpm test:visual      # Visual regression tests
pnpm test:all         # Run all tests

# Code Quality
pnpm lint             # ESLint
pnpm typecheck        # TypeScript checking
pnpm format           # Prettier formatting

# Database
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio
```

---

## 🎯 Key Features

- **Voice Recording** — Browser-based audio capture
- **AI Transcription** — Speech-to-text with polishing
- **Multi-Format Output** — Blog posts, tweets, LinkedIn posts
- **Real-time Preview** — See your content as you speak
- **One-Click Publishing** — Export to multiple platforms

---

## 📚 Documentation

### Core Guides
- **[Vision](./vision.md)** — Product roadmap, success metrics, and strategic direction
- **[Engineering](./engineering.md)** — Development standards, testing, and code quality
- **[Branding](./branding.md)** — Voice, tone, microcopy, and competitive positioning

### Technical Implementation
- **[API Design](./api.md)** — REST patterns, security, and error handling
- **[Monitoring](./monitoring.md)** — SLOs, analytics, alerting, and observability
- **[Deployment](./deployment.md)** — CI/CD, infrastructure, and disaster recovery

### Workflow Guides
- **[Refactor Guide](./refactor.md)** — Safe component refactoring with visual regression
- **[Commit Guide](./commit.md)** — Git workflow and PR process

### Quick Reference
- **Copy Guidelines**: See `branding.md` sections 4-5 for microcopy patterns
- **Error Messages**: See `api.md` error codes + `branding.md` section 5
- **Performance Targets**: See `monitoring.md` SLOs + `engineering.md` section 1
- **Testing Requirements**: See `engineering.md` section 3 + individual file "See also" sections

---

## 🚨 Need Help?

- **Bugs**: Create an issue with reproduction steps
- **Features**: Check `vision.md` roadmap first
- **Code Questions**: Ask in team chat or PR comments
- **Setup Issues**: Check this README and `engineering.md`

---

## 🌍 Contributing

1. Read `engineering.md` for standards
2. Check `branding.md` for copy guidelines
3. Follow the git workflow in `commit.md`
4. Ensure all tests pass before PR
5. Keep accessibility and performance in mind

---

**Made with ❤️ by the VibeLog team**

