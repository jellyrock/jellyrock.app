// What /companion-plugin/ shows, built from the Companion plugin's catalog (plugin-catalog.ts): a
// pure function of the catalog, so the unit tests (tests/unit) check it without a build.
// site-features.ts runs it once per build for the page and for /companion-cards.json.
import type { Need, PluginCatalog } from './plugin-catalog.ts';
import { shortVersion, type FeatureCard } from './features.ts';

/** Every capability card's icon: the catalog has no icons, and one icon keeps a new capability from
 * needing an edit here. */
export const COMPANION_ICON = 'tabler:plug-connected';

/** One row of the "Do I need it?" table. */
export interface CompanionRow {
  slug: string;
  title: string;
  http: Need;
  https: Need;
}

export interface CompanionPage {
  /** The oldest Jellyfin server the plugin installs on, shortened: `10.11`. */
  server: string;
  rows: CompanionRow[];
  cards: FeatureCard[];
}

/** The table's text for a cell. */
export const needText = (need: Need): string => (need === 'needed' ? 'Needed' : 'Not needed');

/** The page's table rows and cards, in the catalog's order, leaving out unreleased capabilities: the
 * catalog changes when a feature page merges, before that capability ships. */
export function buildCompanion(catalog: PluginCatalog): CompanionPage {
  const released = catalog.features.filter((f) => f.since !== 'unreleased');
  return {
    server: shortVersion(catalog.plugin.server),
    rows: released.map(({ slug, title, http, https }) => ({ slug, title, http, https })),
    cards: released.map((f) => {
      const needs = [{ text: `Needs JellyRock ${shortVersion(f.jellyrock)} or later` }];
      return {
        slug: f.slug,
        title: f.title,
        pitch: f.pitch,
        icon: COMPANION_ICON,
        url: f.url,
        needs,
        needsDetail: needs,
      };
    }),
  };
}
