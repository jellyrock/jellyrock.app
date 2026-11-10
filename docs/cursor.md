# Cursor

Live state that survives between Claude Code sessions: in-flight non-project work, open followups, background jobs currently running, and the recurring-attention cadences. This is the "where am I, what's queued, what's due?" surface `/catchup` reads first.

Tracked projects are kept outside this repo, on the maintainer's machine (`/start-project` finds where); they have their own PLANs, statuses, and lifecycle skills (`/start-project` / `/resume-project` / `/end-session`). This cursor doc is for everything else: ad-hoc work between projects, followups captured via `/log followup` for next session, and the cadences that aren't crontabbed but still need human attention.

**Last updated**: 2026-11-10

## In-flight non-project work

Nothing currently in flight outside the tracked projects.

## Open followups

> Captured via `/log followup`, closed via `/done`, both through `.claude/skills/log/journal.sh`. Group by category (one `### Category` heading per area). Each followup is a `####` heading ending in its `[fid: …]` and `[captured …]` markers, with its body below it; refer to one by its fid, never by its position. Keep each a self-contained "what + why + where" so a future session can act on it cold.

None open.

### Dependencies

#### Remove Renovate's npm allow-remote workaround once npm fixes lock writes for bundled packages `[fid: renovate-npm-allow-remote-workaround]` `[captured 2026-11-10]` `[waits-on: after:2026-12-10]`

`renovate.json`'s `npm` block sets `npmrc: allow-remote=all` (commit 3688674). npm 12 refuses its own fetch of a package that declares `bundleDependencies` when it writes a lock file (npm/cli#9800), which broke every tailwindcss lock update (#178). The setting is a recorded workaround, tracked for removal: it relaxes npm 12's remote-fetch guard for Renovate's runs.

Not now: it waits on npm/cli#9819, or another fix for #9800, shipping in an npm release that `packageManager` pins. Check the npm changelog for it on the re-check date.

Fix: delete the `npm` block from `renovate.json`, then confirm the next tailwind bump's lock update passes without it (no "Artifact update problem" comment, CI green).

## Batch jobs

Nothing currently running. (Long-running ingest, restores, migrations, or builds land here while in flight so `/catchup` can surface them.)

## Recurring cadences

| Cadence | Last run | Next due | Notes |
|---|---|---|---|
| <cadence-name> | YYYY-MM-DD | YYYY-MM-DD | <what it is + which skill/command runs it> |
