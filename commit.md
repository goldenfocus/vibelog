# Git Workflow

## Branch Strategy

Always commit to a feature branch first, then PR to main. All PRs must pass GitHub checks.

## Standard Flow

```bash
git checkout -b fix/descriptive-name   # or feature/, refactor/, etc.
git add . && git commit -m "..."
git push -u origin fix/descriptive-name
```

## Automated PR + Merge (for AI assistants)

When asked to deploy/merge code to main, follow this hands-off workflow:

```bash
# 1. Create and push feature branch
git checkout -b fix/descriptive-name
git add .
git commit -m "Clear description of changes"
git push -u origin fix/descriptive-name

# 2. Create PR with proper description
gh pr create --title "Fix: descriptive title" --body "$(cat <<'EOF'
## Summary
- What changed and why

## Test plan
- How to verify this works

EOF
)"

# 3. Auto-merge when checks pass (don't wait manually)
gh pr merge --squash --auto
```

The `--auto` flag queues the merge to happen automatically once all required checks pass. No need to watch and wait - GitHub handles it.

## Commit Message Format

```
type: brief description

Longer explanation if needed.

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `fix`, `feat`, `refactor`, `docs`, `test`, `chore`

**See also**: `engineering.md` for code standards, `deployment.md` for CI/CD pipeline
