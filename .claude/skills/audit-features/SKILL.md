---
name: audit-features
description: Audit what the marketing site claims about JellyRock against the upstream jellyrock/jellyrock app, and open a PR that advances the audit watermark (.audit/features-watermark.json). Feature cards come from the app's feature catalog (docs/feature-catalog.json) with no audit; this checks what the catalog can't - the three hand-written project cards and the icon list in src/data/features.ts - and finds user-facing capabilities the changelog delta shipped with no feature page upstream, which the site therefore can't show. Reads the delta via scripts/feature-drift-detect.sh. Use when the feature-drift watcher opens a "Feature audit needed" issue, when an upstream release ships, or on demand. The watermark always advances, even when nothing needs changing, so the loop can't silently re-fire.
model: opus
effort: high
user-invocable: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(./scripts/feature-drift-detect.sh:*), Bash(./scripts/feature-icons-check.sh:*), Bash(npm test:*), Bash(npm run check:*), Bash(npm run fix:*), Bash(npm run build:*), Bash(gh api:*), Bash(gh release:*), Bash(gh pr:*), Bash(gh issue:*), Bash(git:*), Bash(jq:*), Bash(date:*)
---

# /audit-features: keep the site's own claims honest against the app

## Contract

**Goal.** The site's feature cards are built from the app's feature catalog, so a new or reworded feature page in jellyrock/jellyrock reaches the site with no edit here. Three things stay outside the catalog and drift: the three hand-written project cards in `src/data/features.ts` (Blazing Fast & Silky Smooth, Self-Hosted Weblate, Free & Open Source), the icon per catalog slug, and capabilities the app ships with no feature page (which the site cannot show at all). This skill is the judgment half of the feature-drift loop: `scripts/feature-drift-detect.sh` finds the releases since the last audit, and this skill decides what they mean for those three things, then advances the watermark.

**Inputs.** No arguments. The changelog delta from `./scripts/feature-drift-detect.sh digest`, the current catalog (the build copies it to `src/data/upstream/feature-catalog.json`), and the upstream user docs (`docs/user/*.md`, `docs/user/features/*.md`). Usually run because the watcher opened a "Feature audit needed" issue.

**Outputs.** One PR on a branch from `main`: the watermark advanced to the latest upstream release, plus any edit to the project cards or `FEATURE_ICONS`. When the delta holds a user-facing capability with no feature page upstream, an issue on jellyrock/jellyrock proposing the page, linked from the PR. A PR body that lists what was changed, what was proposed upstream, and the notable delta entries deliberately skipped.

**Success criteria.**

- The watermark equals the latest upstream release, even when nothing else changed.
- Every claim in the three project cards is still true, checked against a source, not memory.
- Every released catalog slug has an icon that exists in the installed tabler set, and `FEATURE_ICONS` holds no slug the catalog dropped (the build's warnings say both).
- A capability with no feature page is proposed upstream, never added here as a card.
- `npm run check` passes, and the PR closes the tracking issue.

**Failure modes to avoid.**

- Adding or rewording a catalog feature's card here. The catalog's wording is used as it is; a pitch that reads badly is fixed on its feature page upstream, and a missing feature gets a page upstream.
- Skipping the watermark bump on a no-op audit: the watcher then re-fires on the same releases forever.
- Reimplementing the changelog diff instead of reading `feature-drift-detect.sh digest`.
- Asserting a count, version or spec from memory or changelog prose. Counts come from the catalog's `app` fields, which the site already reads; never type one into copy.
- Naming the official Jellyfin client negatively. A differentiator is stated positively.
- Em dashes in copy, and words that age ("new", "now", "recently") in the hand-written cards.

**When not to use.**

- To change a feature card's wording or add a feature: edit or add the feature page in jellyrock/jellyrock.
- To change the homepage's pinned features: that is a product decision; edit `PINNED_SLUGS` in its own PR.
- For a screenshot change: screenshots come from upstream at build time.

## Implementation

### Step 1: Get the delta

```bash
./scripts/feature-drift-detect.sh digest
```

It prints the audited watermark, the latest upstream release, and the released changelog sections between them with dependency noise removed. Note both versions. If it says "In sync", report that and stop, unless the user asked for a re-check.

### Step 2: Check the icons

```bash
./scripts/feature-icons-check.sh
```

It builds the site and prints each slug with no icon, and each icon whose slug the catalog dropped. Exit 2 means the build failed and nothing was checked: fix the build (usually the Node version) and run it again, never read that as a pass. For a missing icon, pick a `tabler:` name that fits the feature's pitch and check it exists before adding it to `FEATURE_ICONS`, or the build breaks:

```bash
jq -e --arg k "{{icon-name}}" '.icons[$k]' node_modules/@iconify-json/tabler/icons.json >/dev/null && echo OK || echo MISSING
```

Remove an entry whose slug is gone.

### Step 3: Read the delta for the project cards and for missing pages

For each delta entry, ask two questions:

1. **Does it change a claim in a project card?** For example, a license change, the Weblate instance moving, or ads or tracking added. Verify against the source (the app's `LICENSE`, its README, `translate.jellyrock.app`) and edit the card in `PROJECT_CARDS` if the claim no longer holds.
2. **Is it a user-facing capability with no feature page?** List the catalog's slugs (`jq -r '.features[].slug' src/data/upstream/feature-catalog.json`) and the upstream pages. When a capability a prospective user would care about has neither a page nor a section of an existing page, propose a page in an issue on jellyrock/jellyrock: what it does, the PRs that shipped it, the server version it needs, and why it matters to a user. Most entries are fixes, refactors, CI or internal work: skip them.

### Step 4: Advance the watermark

Write the latest tag from Step 1 and today's date (`date +%F`) to `.audit/features-watermark.json`, keeping its `note`. Do this even when nothing else changed.

### Step 5: Check and open the PR

Run `npm run check`; on failure run `npm run fix` and check again. Then `npm run build && npm test` (needs Docker). The screenshot tests don't show the project cards, so no baseline should change; if one does, find out why before refreshing it. Then branch, commit, push and open the PR. Its body lists the changes, the upstream issues opened, the notable entries skipped, and `Closes #{{tracking-issue}}`. On a no-op audit the PR says "No changes needed for v{{watermark}}..v{{latest}}".
