# JellyRock marketing site — Claude instructions

## Before committing or pushing

**Always run `npm run check` before creating a commit.** If it fails, run `npm run fix` and re-run `npm run check` until it passes. CI runs the same `check` script and will fail the build on any formatting, lint, or type-check issue.

- `npm run check` = astro check + eslint + prettier --check
- `npm run fix` = eslint --fix + prettier --write (fixes most formatting/lint issues automatically)

Do not bypass this. A failing `check` means a failing CI — don't push and hope.

## Browser tests

CI also runs Playwright browser tests on the built site (README: Browser tests). Before pushing a change that can affect what a page renders, run `npm run build && npm test` (needs Docker).

- A screenshot test that fails after a **deliberate** visual change: confirm the diff is what was intended, then `npm run test:visual:update` and commit the PNGs. Never refresh baselines to make an unexplained diff go away.
- Never generate screenshot baselines with a local browser; only `npm run test:visual:update` (the CI image) produces matching pixels.
- The site's CSP is `script-src 'self'`: no `is:inline` scripts and no third-party script, style or font origins. The tests fail on either.
