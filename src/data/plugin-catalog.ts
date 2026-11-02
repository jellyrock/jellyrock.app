// The JellyRock Companion plugin's feature catalog: jellyrock/jellyfin-plugin-jellyrock's
// docs/feature-catalog.json, generated there from its feature pages and copied here at build time by
// fetchPluginCatalog() (src/utils/assets.ts). /companion-plugin/ is built from it (companion.ts).
//
// Held to the same rules as the app's catalog (catalog.ts): one that can't be read, a `schema`
// other than the one below, or a missing or malformed field fails the build, so the live site stays
// as it is. Fields added upstream are ignored until the site reads them.
import { CatalogError, DATE, isObject, parseJsonObject, readCatalogFile, requireString } from './catalog.ts';

export const PLUGIN_CATALOG_SCHEMA = 1;

/** Names this catalog in its errors, so a failed build says which catalog broke. */
export const PLUGIN_CATALOG = 'Companion plugin catalog';

/** Where fetchPluginCatalog() puts the catalog. PLUGIN_CATALOG_PATH overrides it, for tests. */
export const DEFAULT_PLUGIN_CATALOG_PATH = 'src/data/upstream/plugin-catalog.json';

/** Whether a capability needs the plugin on a server of that scheme. */
export type Need = 'needed' | 'not-needed';
const NEEDS: readonly string[] = ['needed', 'not-needed'] satisfies Need[];

export interface PluginFeature {
  slug: string;
  title: string;
  pitch: string;
  /** The plugin version it shipped in, or `unreleased`. */
  since: string;
  sinceDate: string | null;
  /** The oldest JellyRock version it works with. */
  jellyrock: string;
  http: Need;
  https: Need;
  /** Its page in the plugin repo. */
  url: string;
}

export interface PluginCatalog {
  schema: number;
  plugin: {
    /** The oldest Jellyfin server the plugin installs on, e.g. `10.11.0`. */
    server: string;
  };
  features: PluginFeature[];
}

const fail = (message: string) => new CatalogError(message, PLUGIN_CATALOG);

function requireNeed(obj: Record<string, unknown>, key: 'http' | 'https', where: string): Need {
  const v = obj[key];
  if (typeof v !== 'string' || !NEEDS.includes(v)) {
    throw fail(`${where}: \`${key}\` is neither "needed" nor "not-needed"`);
  }
  return v as Need;
}

function parseFeature(raw: unknown, i: number): PluginFeature {
  if (!isObject(raw)) throw fail(`features[${i}] is not an object`);
  const slug = requireString(raw, 'slug', `features[${i}]`, PLUGIN_CATALOG);
  const at = `feature \`${slug}\``;
  const str = (key: string) => requireString(raw, key, at, PLUGIN_CATALOG);

  const sinceDate = raw.sinceDate;
  if (sinceDate !== undefined && sinceDate !== null && !(typeof sinceDate === 'string' && DATE.test(sinceDate))) {
    throw fail(`${at}: \`sinceDate\` is not YYYY-MM-DD`);
  }

  return {
    slug,
    title: str('title'),
    pitch: str('pitch'),
    since: str('since'),
    sinceDate: sinceDate ?? null,
    jellyrock: str('jellyrock'),
    http: requireNeed(raw, 'http', at),
    https: requireNeed(raw, 'https', at),
    url: str('url'),
  };
}

/** Check a plugin catalog's text and return it typed. Throws CatalogError naming the first problem. */
export function parsePluginCatalog(text: string): PluginCatalog {
  const raw = parseJsonObject(text, PLUGIN_CATALOG_SCHEMA, PLUGIN_CATALOG);
  if (!isObject(raw.plugin)) throw fail('`plugin` is not an object');
  const server = requireString(raw.plugin, 'server', 'plugin', PLUGIN_CATALOG);

  if (!Array.isArray(raw.features)) throw fail('`features` is not a list');
  const features = raw.features.map(parseFeature);
  const seen = new Set<string>();
  for (const f of features) {
    if (seen.has(f.slug)) throw fail(`slug \`${f.slug}\` appears twice`);
    seen.add(f.slug);
  }

  return { schema: PLUGIN_CATALOG_SCHEMA, plugin: { server }, features };
}

/** The path the build reads: PLUGIN_CATALOG_PATH when set, else where fetchPluginCatalog() copies it. */
export const pluginCatalogPath = (): string => process.env.PLUGIN_CATALOG_PATH || DEFAULT_PLUGIN_CATALOG_PATH;

let cached: PluginCatalog | undefined;

/** Read and check the plugin catalog once per build. */
export function loadPluginCatalog(file = pluginCatalogPath()): PluginCatalog {
  if (cached && file === pluginCatalogPath()) return cached;
  const catalog = parsePluginCatalog(readCatalogFile(file, PLUGIN_CATALOG));
  if (file === pluginCatalogPath()) cached = catalog;
  return catalog;
}
