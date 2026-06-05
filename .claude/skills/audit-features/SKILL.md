---
name: audit-features
description: Audit the marketing site's feature list (src/data/features.ts) against the upstream jellyrock/jellyrock app and open a PR with any warranted new cards or edits. Reads the changelog delta since the last-audited watermark (.audit/features-watermark.json) via scripts/feature-drift-detect.sh, cross-checks user-facing wording in the upstream docs/user/*.md, classifies each change as new-card / edit-existing / skip using the engineering-vs-marketing judgment the detector deliberately can't mechanize, drafts house-style copy with a verified tabler: icon, advances the watermark, runs npm run check, and opens a PR that closes the feature-drift tracking issue. Use when the feature-drift watcher opens a "Feature audit needed" issue, when an upstream release ships, or on demand to re-check. The watermark always advances even when nothing is website-worthy, so the loop can't silently re-fire.
model: opus
user-invocable: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(./scripts/feature-drift-detect.sh:*), Bash(npm run check:*), Bash(npm run fix:*), Bash(gh api:*), Bash(gh release:*), Bash(gh pr:*), Bash(gh issue:*), Bash(git:*), Bash(jq:*), Bash(date:*)
---

# /audit-features — keep the site's feature list honest against the app

The marketing site advertises features in [`src/data/features.ts`](../../../src/data/features.ts); the app ships features in `jellyrock/jellyrock`. They drift. This skill is the **judgment half** of a two-part loop:

- **Mechanics (zero tokens, deterministic):** [`scripts/feature-drift-detect.sh`](../../../scripts/feature-drift-detect.sh) computes the changelog delta since the watermark and (in CI) keeps one tracking issue current. It does **no** judgement.
- **Judgment (this skill):** decide which delta entries are _user-facing marketing features_ versus engineering noise, write the copy, place the card, advance the watermark.

**The load-bearing invariant: the watermark always advances.** Every run ends by bumping `.audit/features-watermark.json` to the latest upstream release **even if nothing was website-worthy** — otherwise the detector re-fires forever on the same releases. A no-op audit is a real outcome that still moves the watermark (via a tiny PR or commit that records "audited up to vX, nothing to add").

**Do not reimplement changelog parsing.** Always get the delta from the detector script — it is the single source of truth for "what changed," shared with CI.

## Step 1 — Get the delta

```bash
./scripts/feature-drift-detect.sh digest
```

This prints the audited watermark, the latest upstream release, and the released changelog sections in between (Dependencies noise already stripped). If it says **"In sync,"** there is nothing to audit — report that and stop, unless the user explicitly asked to re-review existing copy.

Note both versions: `WATERMARK` (e.g. `v2.19.0`) and `LATEST` (e.g. `v2.21.0`). You'll bump to `LATEST` in Step 6.

## Step 2 — Classify each delta entry: new / edit / skip

This is the whole point of the skill, and the part a script cannot do. For each changelog line, ask **"would a prospective user care, and is it a capability rather than a fix/chore?"**

**SKIP (the overwhelming majority).** Engineering noise that is not a user-facing capability:

- CI / tooling / tests / skills / agents / docs (e.g. "floor-coverage lint," "crash-report skill," "Material Symbols icon pipeline," "journal sync," "renovate")
- Dependency bumps (already stripped by the detector, but stay alert)
- Refactors and internal renames ("unify `GridItem`/`GridItemSmall`")
- Pure bugfixes that _restore expected behavior_ rather than add a capability ("fix photo selection opening behind ItemDetails")

**EDIT an existing card** when a change strengthens or corrects a capability the site already advertises. Example: "(playback) preserve surround on multichannel transcode fallback" reinforces the existing **Surround Sound Preservation** card — usually no copy change needed, but check the wording is still accurate.

**NEW card** only when a genuinely new, user-facing capability has no card yet. The bar is high. Historical examples that cleared it: Quick Connect, multi-server support, Roku voice control, media segments.

Bias toward **skip** and **edit**. New cards are rare; the list should stay curated, not exhaustive.

## Step 3 — Verify every claim against the source (never assert)

Before writing copy for a new/edit candidate, ground it. The site must not state things that aren't true or that will drift:

- **Counts and specifics** — verify against the app, not the changelog prose. (Translations: count `locale/` files. Themes: read the options table in `docs/user/app-settings.md`.)
- **User-facing wording** — pull the plain-language description from the upstream user docs rather than paraphrasing an engineering commit:
  ```bash
  gh api repos/jellyrock/jellyrock/contents/docs/user/jellyfin-server-feature-matrix.md -H "Accept: application/vnd.github.raw"
  gh api repos/jellyrock/jellyrock/contents/docs/user/app-settings.md -H "Accept: application/vnd.github.raw"
  ```
- **Don't hardcode brittle specifics.** The device profile is built dynamically from each Roku's reported capabilities, so do **not** claim a fixed codec/Dolby-Vision-profile list. Frame device-dependent features as device-dependent.
- **Never** name the official Jellyfin client disparagingly. Differentiators are stated positively ("99 languages, far beyond the dozen or so offered by Roku OS and the official client") — never "the official app can't do X."

## Step 4 — Draft copy in house style + pick a verified icon

**House style for `description` (match the existing 19 cards):**

- Benefit-first, concrete, confident. ~20–30 words, one or two sentences.
- **No em dashes** (`—`). Use periods, commas, or colons. This is a hard rule — the maintainer flagged it explicitly.
- No temporal words that age ("New", "now", "recently"). The card outlives the release.
- Parallel rhythm with neighbors; no marketing fluff or exclamation points.

**Title:** short, intent-named, Title Case. Keep titles stable once shipped (they're not changed lightly).

**Icon:** an `tabler:` name that actually exists in the installed set — verify before committing, or the build breaks:

```bash
jq -e --arg k "server-cog" '.icons[$k]' node_modules/@iconify-json/tabler/icons.json >/dev/null && echo OK || echo MISSING
```

**Placement (order matters twice):** the array order drives both pages. The **first `HOMEPAGE_FEATURE_COUNT` entries are the homepage** (currently 8, a 2-column grid, so keep the count even). Lead with the biggest differentiators (performance, server compatibility, playback quality, the OSD); park niche/convenience features lower. A new card usually belongs in the lower (full-page) section unless it's a true headline feature — confirm placement with the user if it would enter the homepage tier.

## Step 5 — Apply the edits

Edit [`src/data/features.ts`](../../../src/data/features.ts): add/modify entries and, if a new card changes the intended homepage set, adjust order or `HOMEPAGE_FEATURE_COUNT` (keep it even). Preserve the `Feature` interface and the single-quote/escaping style already in the file.

## Step 6 — Advance the watermark (ALWAYS)

Update `.audit/features-watermark.json` to the `LATEST` tag from Step 1, with today's date (`date +%F`):

```jsonc
{ "lastAuditedRelease": "vLATEST", "lastAuditedAt": "YYYY-MM-DD", "note": "…(keep existing note)…" }
```

Do this **even on a no-op audit.** This is the invariant that stops the detector re-firing.

## Step 7 — Verify the build

```bash
npm run check
```

If it fails, `npm run fix` and re-run until clean. CI runs the same gate (`CLAUDE.md`); never open a PR on a red check.

## Step 8 — Open the PR and close the loop

Branch, commit (no `Co-Authored-By` / generated footers — see global prefs), push, and open a PR summarizing: which entries were added/edited, and which notable delta items were **deliberately skipped** (so the human reviewer can sanity-check the judgment). Close the tracking issue from the PR:

```bash
gh pr create --fill --body "...audited vWATERMARK..vLATEST. Closes #<tracking-issue>."
```

On a no-op audit, still open the watermark-bump PR and note "no website-worthy changes in vWATERMARK..vLATEST."

## Anti-patterns

- **Reimplementing the changelog diff in the skill.** Use `feature-drift-detect.sh digest`. One source of truth.
- **Skipping the watermark bump on a no-op.** The detector will nag forever. The bump is not optional.
- **Asserting a count/profile/spec from memory or changelog prose.** Verify against `locale/`, `docs/user/*.md`, or app source first.
- **Em dashes in copy.** Hard no.
- **Silently promoting a card onto the homepage.** The first 8 are prime real estate; confirm with the user before changing the homepage tier.
