import type { ImageMetadata } from 'astro';

/**
 * Screen-id → human-readable label override, used for alt text / accessibility.
 * Only ids whose label can't be derived mechanically need an entry here (e.g.
 * `osd`, which would humanize to "Osd"). Every other id falls back to
 * `humanizeScreenId` below, so a newly added upstream screen always renders with
 * sensible alt text and zero maintenance.
 */
const SCREEN_LABELS: Record<string, string> = {
  userSelect: 'User select',
  libraryGrid: 'Library grid',
  movieDetails: 'Movie details',
  osd: 'On-screen display',
};

/**
 * Derive a sentence-case label from a camelCase screen id
 * (`moviesLibraryStudios` → "Movies library studios"), matching the style of the
 * curated overrides above. Used for every id not in `SCREEN_LABELS`.
 */
function humanizeScreenId(name: string): string {
  const spaced = name
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface Screenshot {
  /** Screen id, e.g. `libraryGrid` (matches the upstream file name). */
  name: string;
  /** Human-readable label for alt text, e.g. `Library grid`. */
  label: string;
  src: ImageMetadata;
}

/**
 * Locale rendered on the site. The app repo commits screenshots per locale
 * (`docs/screenshots/<locale>/<screen>.webp` for en_US, fr, de, pt, es). Only the
 * gallery locale `en_US` holds the full `screens` set; every other locale holds
 * only the curated `storeScreens` subset — so a future per-language picker must
 * render all `screens` for en_US but only `storeScreens` for fr/de/pt/es, or it
 * will 404. The picker is deferred — see
 * https://github.com/jellyrock/jellyrock.app/issues/41. When it lands, the glob
 * below has to stay a static literal (Vite requirement), so adding locales means
 * one eager-glob per locale keyed by this constant, not a rewrite.
 */
export const LOCALE = 'en_US';

// `import.meta.glob` needs a static string literal, so both the locale and the
// extension are hardcoded here — the manifest's `format` field can't drive the
// pattern. The filename→id strip below stays extension-agnostic so only this one
// literal needs touching if the format ever changes again.
const screenshotGlobs = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/jellyrock/screenshots/en_US/*.webp',
  { eager: true }
);

// The app repo ships docs/screenshots/screenshots.json with the canonical screen
// display order. Single-file glob (not a static import) so a stale/old asset
// cache without the manifest degrades to alphabetical instead of failing the build.
const manifestGlobs = import.meta.glob<{
  default: { format?: string; galleryLocale?: string; screens?: string[]; storeScreens?: string[] };
}>('../assets/images/jellyrock/screenshots/screenshots.json', { eager: true });

function buildScreenshots(): Screenshot[] {
  const byName = new Map<string, ImageMetadata>();
  for (const [filepath, mod] of Object.entries(screenshotGlobs)) {
    const name =
      filepath
        .split('/')
        .pop()
        ?.replace(/\.(png|webp)$/, '') ?? '';
    if (name) byName.set(name, mod.default);
  }

  const order = Object.values(manifestGlobs)[0]?.default.screens ?? [];

  const toScreenshot = (name: string, src: ImageMetadata): Screenshot => ({
    name,
    label: SCREEN_LABELS[name] ?? humanizeScreenId(name),
    src,
  });

  const result: Screenshot[] = [];
  const seen = new Set<string>();

  // Manifest screens first, in the upstream's curated order.
  for (const name of order) {
    const src = byName.get(name);
    if (src) {
      result.push(toScreenshot(name, src));
      seen.add(name);
    }
  }

  // Any images not covered by the manifest, appended alphabetically (safety net
  // for a new upstream screen that predates a manifest update).
  for (const name of [...byName.keys()].sort()) {
    if (!seen.has(name)) result.push(toScreenshot(name, byName.get(name)!));
  }

  return result;
}

/** Ordered English screenshots, ready to render. */
export const screenshots: Screenshot[] = buildScreenshots();

/**
 * Curated homepage teaser. The full gallery lives on `/screenshots`; the homepage
 * shows a small set chosen to span content types the Roku store listing can't
 * (TV, music, search), so it promises breadth rather than echoing the store
 * screens. `home` is intentionally absent — it's the hero image. Order is honored.
 */
const HOMEPAGE_TEASER_SCREENS = [
  'libraryGrid',
  'movieDetails',
  'seriesDetails',
  'musicArtistDetails',
  'search',
  'trickplay',
];

function buildHomepageScreenshots(): Screenshot[] {
  const byName = new Map(screenshots.map((s) => [s.name, s]));
  const curated = HOMEPAGE_TEASER_SCREENS.map((name) => byName.get(name)).filter(
    (s): s is Screenshot => s !== undefined
  );

  // If upstream renames/drops enough curated screens that the teaser thins out,
  // fall back to the first gallery screens (minus the `home` hero) so the
  // homepage never renders an empty or near-empty gallery.
  if (curated.length < 4) {
    return screenshots.filter((s) => s.name !== 'home').slice(0, HOMEPAGE_TEASER_SCREENS.length);
  }
  return curated;
}

/** Curated subset rendered in the homepage "See JellyRock in action" gallery. */
export const homepageScreenshots: Screenshot[] = buildHomepageScreenshots();
