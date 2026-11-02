// The site's feature cards. The app's feature catalog (catalog.ts) holds each feature's title,
// pitch, docs link and what it needs; this file holds only what the catalog doesn't: an icon per
// slug, the homepage's pinned slugs, and the three cards that are claims about the project.
//
// Everything here is a pure function of the catalog and a date, so the unit tests (tests/unit)
// check it without a build. site-features.ts runs it once per build for the pages.
import type { Catalog, CatalogApp, CatalogFeature } from './catalog.ts';
import featureIcons from './feature-icons.json' with { type: 'json' };

/** The icon a feature gets when FEATURE_ICONS has no entry for its slug. */
export const DEFAULT_ICON = 'tabler:sparkles';

/** Each catalog slug's icon, from feature-icons.json: a JSON file, so the feature-drift watcher
 * (scripts/feature-drift-detect.sh) can compare it with the catalog using jq. Verify a new name
 * exists before adding it: `jq -e '.icons["<name>"]' node_modules/@iconify-json/tabler/icons.json`. */
export const FEATURE_ICONS: Record<string, string> = featureIcons;

/** The homepage's "Why JellyRock?" cards, in order: the app README's four. A slug that is
 * missing from the catalog or unreleased is skipped. */
export const PINNED_SLUGS = ['syncplay', 'cast-to-jellyrock', 'delete-media', 'original-quality'];

/** How long a feature counts as new after its release, and how many the homepage shows. */
export const NEW_FOR_DAYS = 90;
export const RECENT_MAX = 4;

export const PLUGINS_DOCS_URL = 'https://docs.jellyrock.app/jellyfin-server-plugins/';
/** Where "Plugin needed on HTTPS servers" links: the JellyRock Companion plugin's install docs. */
export const COMPANION_URL = PLUGINS_DOCS_URL;
export const RELEASE_NOTES_URL = 'https://github.com/jellyrock/jellyrock/releases';

/** Claims about the project, not features, so the catalog doesn't hold them. These are the only
 * hand-written cards; /audit-features keeps them honest. */
export const PROJECT_CARDS: FeatureCard[] = [
  {
    slug: 'fast',
    title: 'Blazing Fast & Silky Smooth',
    pitch:
      'Built to stay smooth: every request to your server runs in the background, so menus keep moving and the interface never stutters while things load.',
    icon: 'tabler:rocket',
    needs: [],
    needsDetail: [],
  },
  {
    slug: 'weblate',
    title: 'Self-Hosted Weblate',
    pitch:
      'Translations live on our own Weblate instance at translate.jellyrock.app. Jump in and help bring JellyRock to your language.',
    icon: 'tabler:world',
    needs: [],
    needsDetail: [],
  },
  {
    slug: 'open-source',
    title: 'Free & Open Source',
    pitch:
      'No ads, no tracking, no subscriptions, ever. JellyRock is built in the open by the community under the GPL-2.0 license.',
    icon: 'tabler:heart-handshake',
    needs: [],
    needsDetail: [],
  },
];

/** A line under a card saying what the feature needs beyond the base app. */
export interface Requirement {
  text: string;
  href?: string;
}

export interface FeatureCard {
  slug: string;
  title: string;
  pitch: string;
  icon: string;
  /** The feature's docs page. Project cards have none. */
  url?: string;
  /** `v3.3` while the feature is new, else absent. */
  newIn?: string;
  sinceDate?: string | null;
  /** The short lines, for the homepage. */
  needs: Requirement[];
  /** The full lines, for /features/. */
  needsDetail: Requirement[];
}

export interface SiteFeatures {
  app: CatalogApp;
  /** "Jellyfin 10.7 to 12", or "Jellyfin 10.7 or later" when the catalog has no newest line. */
  serverRange: string;
  /** /features/: the new cards (newest first), the other pinned ones, the rest in catalog order,
   * then the project cards. */
  all: FeatureCard[];
  /** The homepage's "Why JellyRock?". */
  pinned: FeatureCard[];
  /** The homepage's "New in JellyRock": newest first, at most RECENT_MAX, pinned ones included. */
  recent: FeatureCard[];
  /** The newest feature, for the line above the homepage's headline. */
  latest?: FeatureCard;
}

/** `10.10.0` → `10.10`; any other version is kept whole, so `10.11.8` keeps its patch. */
export const shortVersion = (v: string): string => v.replace(/^(\d+\.\d+)\.0$/, '$1');

export function compareVersions(a: string, b: string): number {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export const serverRange = (app: CatalogApp): string =>
  app.serverNewest
    ? `Jellyfin ${shortVersion(app.serverFloor)} to ${app.serverNewest}`
    : `Jellyfin ${shortVersion(app.serverFloor)} or later`;

/** What a feature needs beyond the base app: the short lines and the full ones. */
export function requirements(f: CatalogFeature, app: CatalogApp): Pick<FeatureCard, 'needs' | 'needsDetail'> {
  const needs: Requirement[] = [];
  const needsDetail: Requirement[] = [];
  if (f.plugins.length > 0) {
    needs.push({ text: 'Needs a server plugin', href: PLUGINS_DOCS_URL });
    needsDetail.push({ text: `Needs a server plugin: ${f.plugins.join(' or ')}`, href: PLUGINS_DOCS_URL });
  }
  if (f.https && f.https.plugins.length > 0) {
    needs.push({ text: 'Plugin needed on HTTPS servers', href: COMPANION_URL });
    needsDetail.push({
      text: `On HTTPS servers: Jellyfin ${shortVersion(f.https.server)} or later, with the ${f.https.plugins.join(' or ')} plugin`,
      href: COMPANION_URL,
    });
  } else if (f.https) {
    needsDetail.push({ text: `On HTTPS servers: Jellyfin ${shortVersion(f.https.server)} or later` });
  }
  if (compareVersions(f.server, app.serverFloor) > 0) {
    const line = { text: `Needs Jellyfin ${shortVersion(f.server)} or later` };
    needs.push(line);
    needsDetail.push(line);
  }
  return { needs, needsDetail };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The moment a build decides what is new: `fixed` (an ISO date) when given, else now. */
export function buildDate(fixed: string | undefined, now = new Date()): Date {
  if (!fixed) return now;
  const date = new Date(fixed);
  if (Number.isNaN(date.getTime())) throw new Error(`FEATURE_BUILD_DATE is not a date: ${fixed}`);
  return date;
}

/** `v3.3` when the feature was released within NEW_FOR_DAYS of `now`. */
export function newIn(f: CatalogFeature, now: Date): string | undefined {
  if (!f.sinceDate || f.since === 'unreleased') return undefined;
  const age = now.getTime() - Date.parse(`${f.sinceDate}T00:00:00Z`);
  if (age < 0 || age >= NEW_FOR_DAYS * DAY_MS) return undefined;
  return `v${f.since.split('.').slice(0, 2).join('.')}`;
}

/** Build every card from the catalog. `warn` hears about an icon or pinned slug that is missing:
 * never a build failure, so a new feature page upstream can't block a deploy. */
export function buildFeatures(catalog: Catalog, now: Date, warn: (message: string) => void): SiteFeatures {
  const { app } = catalog;
  const released = catalog.features.filter((f) => f.since !== 'unreleased');

  const cards = released.map((f): FeatureCard => {
    const icon = FEATURE_ICONS[f.slug];
    if (!icon) {
      warn(`no icon for feature \`${f.slug}\`, so it uses ${DEFAULT_ICON}. Add one to src/data/feature-icons.json.`);
    }
    return {
      slug: f.slug,
      title: f.title,
      pitch: f.pitch,
      icon: icon ?? DEFAULT_ICON,
      url: f.url,
      newIn: newIn(f, now),
      sinceDate: f.sinceDate,
      ...requirements(f, app),
    };
  });

  const known = new Set(catalog.features.map((f) => f.slug));
  for (const slug of Object.keys(FEATURE_ICONS)) {
    if (!known.has(slug)) warn(`feature-icons.json has \`${slug}\`, which the catalog no longer holds. Remove it.`);
  }

  const bySlug = new Map(cards.map((c) => [c.slug, c]));
  const pinned = PINNED_SLUGS.flatMap((slug) => {
    const card = bySlug.get(slug);
    if (!card) warn(`pinned feature \`${slug}\` is missing or unreleased, so the homepage skips it.`);
    return card ? [card] : [];
  });
  const newest = cards
    .filter((c) => c.newIn)
    .sort((a, b) => (b.sinceDate ?? '').localeCompare(a.sinceDate ?? '') || a.title.localeCompare(b.title));
  const lead = new Set([...newest, ...pinned].map((c) => c.slug));

  return {
    app,
    serverRange: serverRange(app),
    all: [...newest, ...pinned.filter((c) => !c.newIn), ...cards.filter((c) => !lead.has(c.slug)), ...PROJECT_CARDS],
    pinned,
    recent: newest.slice(0, RECENT_MAX),
    latest: newest[0],
  };
}
