# jellyrock.app

[![Deploy](https://github.com/jellyrock/jellyrock.app/actions/workflows/deploy.yml/badge.svg?branch=main&label=Deploy)](https://github.com/jellyrock/jellyrock.app/actions/workflows/deploy.yml)
[![Site](https://img.shields.io/badge/site-jellyrock.app-4f46e5)](https://jellyrock.app)
[![License](https://img.shields.io/github/license/jellyrock/jellyrock.app)](./LICENSE.md)

Marketing + landing site for [JellyRock](https://github.com/jellyrock/jellyrock),
a Jellyfin client for Roku. Deployed at **[jellyrock.app](https://jellyrock.app)**.

## Tech stack

| Piece     | Choice | Why |
| --------- | ------ | --- |
| Framework | [Astro 5](https://astro.build/) | Static-first, islands architecture, great DX. |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first, matches starter template. |
| Starter | Forked from [AstroWind](https://github.com/arthelokyo/astrowind) | Good opinionated defaults; we stripped blog/pricing/services/landing variants. |
| Icons | [`astro-icon`](https://github.com/natemoo-re/astro-icon) with Tabler + Flat Color sets | Inline SVGs, zero runtime cost. |
| Images | Astro `<Image>` + `sharp` | Build-time optimization + responsive `srcset`. |
| Shared UI | [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) | Header/footer/tokens shared with docs + API reference sites. |
| Analytics | [Umami](https://analytics.jellyrock.app) (self-hosted) | Privacy-respecting; see [`src/components/common/Analytics.astro`](src/components/common/Analytics.astro). |
| Hosting | Caddy `file_server` on the JellyRock VPS | See [`jellyrock/infra`](https://github.com/jellyrock/infra). |

> [!NOTE]
> The `Dockerfile`, `netlify.toml`, `vercel.json`, and `nginx/` dir are legacy
> AstroWind artifacts kept only while we verify nothing depends on them.
> They are not part of the deploy pipeline.

## How deploys work

```text
push to main  ─▶  .github/workflows/deploy.yml
                      │
                      ├─ npm ci
                      ├─ npm run build                  (Astro → dist/)
                      └─ rsync dist/ → VPS:/opt/jellyrock/homepage/
                              │
                              └─ Caddy serves jellyrock.app
```

Required repo secrets (org-level, shared with sibling deploy repos):

- `DEPLOY_SSH_KEY` — private key authorized on VPS `jellyrock@`
- `VPS_KNOWN_HOSTS` — pre-verified `ssh-keyscan` output
- `VPS_HOST`, `VPS_USER` — deploy target

## Local development

```bash
# Optional: clone shared-ui as a sibling so dev uses a live symlink
git clone https://github.com/jellyrock/shared-ui.git ../shared-ui

npm ci
npm run dev              # http://localhost:4321
npm run build            # production build → dist/
npm run preview          # preview the build
npm run check            # astro-check + eslint + prettier
npm run fix              # eslint --fix + prettier --write
```

If `../shared-ui/` is not present, the build clones it from GitHub. See
[`scripts/`](scripts/) for the fetch logic.

## Updating content

| Task | File(s) |
|---|---|
| Edit hero, install steps, CTAs | [`src/pages/index.astro`](src/pages/index.astro), [`src/pages/install.astro`](src/pages/install.astro) |
| Edit features list | [`src/data/features.ts`](src/data/features.ts) — single source of truth, rendered on `/features` and the home page |
| Add/replace screenshots | Drop `.png` in [`src/assets/images/jellyrock/screenshots/`](src/assets/images/jellyrock/screenshots/). They are auto-discovered via `import.meta.glob` in [`src/pages/screenshots.astro`](src/pages/screenshots.astro) |
| Change screenshot sort order | Filenames are sorted alphabetically by glob. Prefix with `01-`, `02-`, ... to force order, or sort in code — see [`src/pages/screenshots.astro:10`](src/pages/screenshots.astro#L10) |
| Update donate / contact / privacy / terms | [`src/pages/donate.astro`](src/pages/donate.astro), [`src/pages/contact.astro`](src/pages/contact.astro), [`src/pages/privacy.md`](src/pages/privacy.md), [`src/pages/terms.md`](src/pages/terms.md) |
| Swap Umami website ID | [`src/components/common/Analytics.astro`](src/components/common/Analytics.astro) |
| Change header/footer links | Edit in [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) (affects all sites) |
| Update branding assets | [`src/assets/images/jellyrock/branding/`](src/assets/images/jellyrock/branding/) |

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

- Removed `src/pages/[...blog]`, `[...landing]`, `pricing`, `services` —
  JellyRock doesn't sell anything or blog (yet).
- Replaced Google Analytics + Splitbee integrations with a single self-hosted
  Umami snippet.
- Replaced bundled header/footer with shared components from
  [`jellyrock/shared-ui`](https://github.com/jellyrock/shared-ui) via
  [`src/layouts/PageLayout.astro`](src/layouts/PageLayout.astro).
- Features are authored in TypeScript ([`src/data/features.ts`](src/data/features.ts))
  instead of YAML frontmatter.

## License

[MIT](LICENSE.md) — JellyRock-authored code plus retained AstroWind copyright
notice from the upstream template.
