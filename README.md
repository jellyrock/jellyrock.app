# jellyrock.app

[![Homepage](https://img.shields.io/badge/homepage-jellyrock.app-4f46e5 'Homepage')](https://jellyrock.app)
[![License](https://img.shields.io/github/license/jellyrock/jellyrock.app 'License')](./LICENSE.md)
[![build](https://img.shields.io/github/actions/workflow/status/jellyrock/jellyrock.app/deploy.yml?logo=github&branch=main 'build')](https://github.com/jellyrock/jellyrock.app/actions/workflows/deploy.yml?query=branch%3Amain)

Marketing + landing site for [JellyRock](https://github.com/jellyrock/jellyrock),
a Jellyfin client for Roku. Deployed at **[jellyrock.app](https://jellyrock.app)**.

## Tech stack

| Piece     | Choice                                                                                 | Why                                                                                                       |
| --------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Framework | [Astro 5](https://astro.build/)                                                        | Static-first, islands architecture, great DX.                                                             |
| Styling   | [Tailwind CSS 3](https://tailwindcss.com/)                                             | Utility-first, matches starter template.                                                                  |
| Starter   | Forked from [AstroWind](https://github.com/arthelokyo/astrowind)                       | Good opinionated defaults; we stripped blog/pricing/services/landing variants.                            |
| Icons     | [`astro-icon`](https://github.com/natemoo-re/astro-icon) with Tabler + Flat Color sets | Inline SVGs, zero runtime cost.                                                                           |
| Images    | Astro `<Image>` + `sharp`                                                              | Build-time optimization + responsive `srcset`.                                                            |
| Shared UI | [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui)                        | Header/footer/tokens shared with docs + API reference sites.                                              |
| Analytics | [Umami](https://analytics.jellyrock.app) (self-hosted)                                 | Privacy-respecting; see [`src/components/common/Analytics.astro`](src/components/common/Analytics.astro). |
| Hosting   | Caddy `file_server` on the JellyRock VPS                                               | See [`jellyrock/infra`](https://github.com/jellyrock/infra).                                              |

## How deploys work

```text
push to main  ─▶  .github/workflows/deploy.yml
(or upstream          │
 content-update)      ├─ gates: .github/workflows/ci.yml   (same as every PR)
                      │    ├─ check: npm run check + npm run build  (Astro → dist/)
                      │    └─ browser-tests: Playwright on that dist/
                      ├─ rsync the tested dist/ → VPS:/opt/jellyrock/homepage/
                      │       └─ Caddy serves jellyrock.app
                      ├─ scripts/verify-live.sh   (live pages, assets and headers match)
                      └─ Gotify: deploy ok / FAILED (also when the tests fail)
```

Nothing reaches the VPS unless the checks and browser tests pass, and the
files deployed are the exact build that was tested. A running deploy is never
cancelled; a newer push waits for it.

Required repo secrets (org-level, shared with sibling deploy repos):

- `DEPLOY_SSH_KEY` — private key authorized on VPS `jellyrock@`
- `VPS_KNOWN_HOSTS` — pre-verified `ssh-keyscan` output
- `VPS_HOST`, `VPS_USER` — deploy target

## Local development

```bash
npm ci
npm run dev              # http://localhost:4321
npm run build            # production build → dist/
npm run preview          # preview the build
npm run check            # astro-check + eslint + prettier
npm run fix              # eslint --fix + prettier --write
npm test                 # browser tests, as CI runs them (needs Docker and a build)
```

## Browser tests

CI opens the built site in a real browser (Playwright, Chromium) at desktop and
phone size before anything merges or deploys. They exist so a dependency bump
that breaks the site turns CI red instead of reaching jellyrock.app. The site
is served the way production serves it: same security headers (including the
strict CSP), same redirects and 404 handling
([`tests/support/serve-dist.mjs`](tests/support/serve-dist.mjs)).

| Test file                                              | Fails when                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tests/e2e/site.spec.ts`](tests/e2e/site.spec.ts)     | Any page in the sitemap has a script error, something the CSP blocks, a failed or cross-origin request, a broken image, sideways scrolling on a phone, or a missing header/footer; an internal link or anchor is broken; content from `src/data/features.ts` stops rendering; the scroll-reveal stops working |
| [`tests/e2e/visual.spec.ts`](tests/e2e/visual.spec.ts) | A page looks different from its approved screenshot in [`tests/e2e/__screenshots__/`](tests/e2e/__screenshots__/) (images masked, since app screenshots change upstream)                                                                                                                                      |

```bash
npm run build                # the tests run against dist/
npm test                     # everything, inside the same Playwright image CI uses
npm run test:e2e             # functional tests only, with a local browser
                             # (first time: npx playwright install chromium)
npm run test:visual          # screenshot tests only (Docker)
npm run test:visual:update   # accept the current look as the new baseline (Docker)
```

**When CI goes red,** open the failed run's **playwright-report** artifact and
its `index.html`: each failure shows the error, and each screenshot failure
shows expected, actual and a diff.

**After a deliberate design or content change** (including a feature card
edit from `/audit-features`), the screenshot tests go red as intended. Check
the diff is what you meant, run `npm run build && npm run test:visual:update`,
and commit the updated PNGs in the same PR. shared-ui releases refresh them
for you; see [shared-ui updates](#shared-ui-updates).

Screenshots only match inside the Playwright image, because fonts render
differently between machines, which is why those commands run through Docker
([`scripts/playwright-docker.sh`](scripts/playwright-docker.sh)). The image is
pinned in `.github/workflows/ci.yml`, and Renovate moves it together with
`@playwright/test` in one PR.

The production headers the tests use are a copy of the Caddy config in
`jellyrock/infra`, kept in
[`tests/support/production-headers.json`](tests/support/production-headers.json).
After every deploy, `scripts/verify-live.sh` compares them with the live site
and fails the deploy if they drifted.

On the first build, [`src/utils/fetch-shared-ui.ts`](src/utils/fetch-shared-ui.ts)
shallow-clones [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui)
into `src/shared-ui/`. No setup required — this is the same path CI uses.

### Iterating on shared-ui locally (opt-in)

If you're actively editing `shared-ui` (nav data, tokens, the header/footer
components) and want edits to hot-reload in this site without a
commit-push-rebuild cycle, clone it as a sibling directory:

```bash
git clone https://github.com/jellyrock/shared-ui.git ../shared-ui
```

When `../shared-ui/` exists, the fetch script symlinks `src/shared-ui/` to it
instead of cloning. Vite then picks up every save instantly. Remove the sibling
(or `rm -rf src/shared-ui`) to go back to the clone-from-GitHub default.

> [!CAUTION]
> The symlink points at your local working tree — you can ship a build
> referencing shared-ui commits that aren't pushed yet. Always push
> `shared-ui` before pushing consumer sites that depend on the change.

### shared-ui updates

A shared-ui change is reviewed once, on its own PR, and reaches this site with
no further clicks when it looks exactly as reviewed:

```text
shared-ui PR ─▶ consumer-preview.yml: builds this site with the change, runs these
   │            browser tests, shows which screenshots change (diffs in its
   │            jellyrock.app-report artifact) and saves them as the approved set
   ▼ merge
shared-ui release.yml: tags vX.Y.Z, then notifies this repo
   ▼
.github/workflows/shared-ui-bump.yml → scripts/shared-ui-bump.sh:
   bumps SHARED_UI_REF, regenerates the screenshots, opens "update shared-ui to vX.Y.Z"
   ├─ identical to the approved set → auto-merge on green check + browser-tests → deploy
   └─ anything else → PR left open; its description says why (no preview, or which
      screenshots differ, e.g. this site changed since the preview)
```

When a bump stops for review, compare the PNGs in the PR's **Files changed**
tab and merge it. To retry or catch up on a release: Actions → **shared-ui
bump** → Run workflow, or locally `scripts/shared-ui-bump.sh vX.Y.Z --dry-run`.
Renovate also tracks the pin, but only opens a PR if no bump has landed 3 days
after a release.

## Updating content

| Task                                      | File(s)                                                                                                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit hero, install steps, CTAs            | [`src/pages/index.astro`](src/pages/index.astro), [`src/pages/install.astro`](src/pages/install.astro)                                                                                                                 |
| Edit features list                        | [`src/data/features.ts`](src/data/features.ts) — single source of truth, rendered on `/features` and the home page                                                                                                     |
| Add/replace screenshots                   | Drop `.png` in [`src/assets/images/jellyrock/screenshots/`](src/assets/images/jellyrock/screenshots/). They are auto-discovered via `import.meta.glob` in [`src/pages/screenshots.astro`](src/pages/screenshots.astro) |
| Change screenshot sort order              | Filenames are sorted alphabetically by glob. Prefix with `01-`, `02-`, ... to force order, or sort in code — see [`src/pages/screenshots.astro:10`](src/pages/screenshots.astro#L10)                                   |
| Update donate / contact / privacy / terms | [`src/pages/donate.astro`](src/pages/donate.astro), [`src/pages/contact.astro`](src/pages/contact.astro), [`src/pages/privacy.md`](src/pages/privacy.md), [`src/pages/terms.md`](src/pages/terms.md)                   |
| Swap Umami website ID                     | [`src/components/common/Analytics.astro`](src/components/common/Analytics.astro)                                                                                                                                       |
| Change header/footer links                | Edit in [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) (affects all sites)                                                                                                                            |
| Update branding assets                    | [`src/assets/images/jellyrock/branding/`](src/assets/images/jellyrock/branding/)                                                                                                                                       |

### Adding short videos (future)

`screenshots.astro` currently globs `*.png`. For a mixed gallery:

1. Drop `.mp4` / `.webm` files alongside the PNGs.
2. Broaden the glob to `*.{png,mp4,webm}` and branch on extension to render
   `<video autoplay muted loop playsinline>` vs `<Image>`.
3. For YouTube embeds, use [`astro-embed`](https://github.com/delucis/astro-embed)
   (already a dep) — `<YouTube id="..." />`.

Keep file sizes tight (prefer `.webm` @ 720p, <2 MB) since videos bypass Astro's
image pipeline.

## Modifications from AstroWind

We inherited AstroWind's structure; deltas worth knowing about:

- Removed the blog (posts, category/tag/RSS routes), `about`, `pricing`,
  `services`, the landing layout, the Decap CMS admin page and the widgets
  only they used — JellyRock doesn't sell anything or blog (yet). See
  [Restoring a template page](#restoring-a-template-page).
- Replaced Google Analytics + Splitbee integrations with a single self-hosted
  Umami snippet.
- Replaced bundled header/footer with shared components from
  [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) via
  [`src/layouts/PageLayout.astro`](src/layouts/PageLayout.astro).
- Features are authored in TypeScript ([`src/data/features.ts`](src/data/features.ts))
  instead of YAML frontmatter.

### Restoring a template page

The git tag `template-pages-archive` marks the last commit that still had the
AstroWind pages, with this site's styling tweaks. To start a new page from one,
restore it from the tag (the paths are listed in the commit after the tag):

```bash
git fetch origin tag template-pages-archive
git checkout template-pages-archive -- src/pages/about.astro
```

A restored page may need porting to the Astro version in use by then. For a
fresh, maintained copy instead, start from upstream
[AstroWind](https://github.com/arthelokyo/astrowind).

## License

[MIT](LICENSE.md) — JellyRock-authored code plus retained AstroWind copyright
notice from the upstream template.
