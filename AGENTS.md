> **Canonical agent-instruction file.** This file (AGENTS.md) is the single real instruction file for every agent/tool in this repo. CLAUDE.md is a symlink to it. Always edit AGENTS.md; never create a standalone CLAUDE.md or let the two diverge. Any reference elsewhere in this repo to "CLAUDE.md" means this file.

# JellyRock marketing site: agent instructions

## Before committing or pushing

**Always run `npm run check` before creating a commit.** If it fails, run `npm run fix` and re-run `npm run check` until it passes. CI runs the same `check` script and will fail the build on any formatting, lint, or type-check issue.

- `npm run check` = astro check + eslint + prettier --check
- `npm run fix` = eslint --fix + prettier --write (fixes most formatting/lint issues automatically)

Do not bypass this. A failing `check` means a failing CI — don't push and hope.

## Browser tests

CI also runs Playwright browser tests on the built site (README: Browser tests). Before pushing a change that can affect what a page renders, run `npm run build && npm run build:visual && npm test` (needs Docker).

- A screenshot test that fails after a **deliberate** visual change: confirm the diff is what was intended, then `npm run build:visual && npm run test:visual:update` and commit the PNGs. Never refresh baselines to make an unexplained diff go away.
- Never generate screenshot baselines with a local browser; only `npm run build:visual && npm run test:visual:update` (the CI image) produces matching pixels.
- The site's CSP is `script-src 'self'`: no `is:inline` scripts and no third-party script, style or font origins. The tests fail on either.

## Repo facts

The facts the shared skills read, one slot each (they link `AGENTS.md#<slot>`).

### Capture types

decision, followup

### Public posture

`public`: committed text names no private repository or host, no person, email or home path, and no secret.

### Agent paths

`docs/cursor.md`

### Docs check

none

### Verification commands

- `npm ci`: once in a fresh clone or worktree, before any command below.
- `npm run check`: the floor before every commit (astro check, eslint, `prettier --check`, unit tests). CI runs the same script. When it fails, run `npm run fix`, then `npm run check` again.
- `npm run build && npm run build:visual && npm test`: the browser tests (needs Docker). Run them after a change that can affect what a page renders.
- `npm run build:visual && npm run test:visual:update`: only after a deliberate visual change whose diff you confirmed. Never generate baselines with a local browser.
- Never run `prettier -w` on the shared skills, rules, `docs/cursor.md` or `.markdownlint-cli2.jsonc`: `.prettierignore` keeps them byte-identical to their upstream copies.

### Plan path

`~/.claude/plans/`

### Forge

backend: github
prs: always
