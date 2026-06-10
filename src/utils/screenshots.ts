import type { ImageMetadata } from 'astro';

/**
 * Screen-id → human-readable label, used for alt text / accessibility.
 * Unknown ids fall back to their raw name so a newly added upstream screen
 * never renders with empty alt text.
 */
const SCREEN_LABELS: Record<string, string> = {
  userSelect: 'User select',
  home: 'Home',
  libraryGrid: 'Library grid',
  movieDetails: 'Movie details',
  osd: 'On-screen display',
  trickplay: 'Trickplay',
};

export interface Screenshot {
  /** Screen id, e.g. `libraryGrid` (matches the upstream file name). */
  name: string;
  /** Human-readable label for alt text, e.g. `Library grid`. */
  label: string;
  src: ImageMetadata;
}

/**
 * Locale rendered on the site. The app repo commits screenshots per locale
 * (`docs/screenshots/<locale>/<screen>.png` for en_US, fr, de, pt, es); we show
 * English only for now. The per-language picker is deferred — see
 * https://github.com/jellyrock/jellyrock.app/issues/41. When it lands, the glob
 * below has to stay a static literal (Vite requirement), so adding locales means
 * one eager-glob per locale keyed by this constant, not a rewrite.
 */
export const LOCALE = 'en_US';

// `import.meta.glob` needs a static string literal, so en_US is hardcoded here.
const screenshotGlobs = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/jellyrock/screenshots/en_US/*.png',
  { eager: true }
);

// The app repo ships docs/screenshots/screenshots.json with the canonical screen
// display order. Single-file glob (not a static import) so a stale/old asset
// cache without the manifest degrades to alphabetical instead of failing the build.
const manifestGlobs = import.meta.glob<{ default: { screens?: string[] } }>(
  '../assets/images/jellyrock/screenshots/screenshots.json',
  { eager: true }
);

function buildScreenshots(): Screenshot[] {
  const byName = new Map<string, ImageMetadata>();
  for (const [filepath, mod] of Object.entries(screenshotGlobs)) {
    const name = filepath.split('/').pop()?.replace('.png', '') ?? '';
    if (name) byName.set(name, mod.default);
  }

  const order = Object.values(manifestGlobs)[0]?.default.screens ?? [];

  const toScreenshot = (name: string, src: ImageMetadata): Screenshot => ({
    name,
    label: SCREEN_LABELS[name] ?? name,
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
