# JellyRock marketing site — Claude instructions

## Before committing or pushing

**Always run `npm run check` before creating a commit.** If it fails, run `npm run fix` and re-run `npm run check` until it passes. CI runs the same `check` script and will fail the build on any formatting, lint, or type-check issue.

- `npm run check` = astro check + eslint + prettier --check
- `npm run fix` = eslint --fix + prettier --write (fixes most formatting/lint issues automatically)

Do not bypass this. A failing `check` means a failing CI — don't push and hope.
