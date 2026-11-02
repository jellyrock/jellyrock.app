// The app's feature catalog: jellyrock/jellyrock's docs/feature-catalog.json, generated there from
// its feature pages and copied here at build time by fetchAssets() (src/utils/assets.ts).
//
// A catalog this site can't use fails the build, so the live site stays as it is: one that can't
// be read, a `schema` other than the one below, or a missing field. Fields added upstream are
// ignored until the site reads them; an added field does not bump `schema`.
//
// Imports here and in features.ts keep their `.ts` extension, so Node's own test runner can load
// these modules without a build (tests/unit).
import fs from 'node:fs';

export const CATALOG_SCHEMA = 1;

/** Where fetchAssets() puts the catalog. FEATURE_CATALOG_PATH overrides it, for tests. */
export const DEFAULT_CATALOG_PATH = 'src/data/upstream/feature-catalog.json';

export interface CatalogApp {
  languages: number;
  themes: number;
  /** The oldest Jellyfin server JellyRock supports, e.g. `10.7.0`. */
  serverFloor: string;
  /** The newest Jellyfin line JellyRock is verified on, e.g. `12`. Not in every catalog yet. */
  serverNewest?: string;
}

export interface CatalogFeature {
  slug: string;
  title: string;
  pitch: string;
  /** A version, or `unreleased`. */
  since: string;
  /** The day `since` was released (`YYYY-MM-DD`). Not in every catalog yet. */
  sinceDate?: string | null;
  /** The oldest Jellyfin server the feature works with. */
  server: string;
  /** Server plugins it needs one of. */
  plugins: string[];
  /** What an HTTPS server needs beyond an HTTP one, or null. */
  https: { server: string; plugins: string[] } | null;
  /** Its page on docs.jellyrock.app. */
  url: string;
}

export interface Catalog {
  schema: number;
  app: CatalogApp;
  features: CatalogFeature[];
}

/** A catalog this site can't use. `catalog` names which one: the plugin catalog (plugin-catalog.ts)
 * shares these checks. */
export class CatalogError extends Error {
  constructor(message: string, catalog = 'Feature catalog') {
    super(`${catalog}: ${message}`);
    this.name = 'CatalogError';
  }
}

export type Json = Record<string, unknown>;

export const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');
export const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function requireString(obj: Json, key: string, where: string, catalog?: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v === '') {
    throw new CatalogError(`${where}: \`${key}\` is not a non-empty string`, catalog);
  }
  return v;
}

/** A catalog's text parsed as a JSON object whose `schema` is `schema`. */
export function parseJsonObject(text: string, schema: number, catalog?: string): Json {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new CatalogError(`not valid JSON (${(e as Error).message})`, catalog);
  }
  if (!isObject(raw)) throw new CatalogError('is not a JSON object', catalog);
  if (raw.schema !== schema) {
    throw new CatalogError(
      `schema is ${JSON.stringify(raw.schema)}, and this site reads schema ${schema}. Update the site for the new shape.`,
      catalog
    );
  }
  return raw;
}

/** A catalog file's text. One that can't be read fails, naming the file. */
export function readCatalogFile(file: string, catalog?: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new CatalogError(
      `cannot read ${file} (${(e as NodeJS.ErrnoException).code ?? (e as Error).message})`,
      catalog
    );
  }
}

function parseFeature(raw: unknown, i: number): CatalogFeature {
  const where = `features[${i}]`;
  if (!isObject(raw)) throw new CatalogError(`${where} is not an object`);
  const slug = requireString(raw, 'slug', where);
  const at = `feature \`${slug}\``;

  if (!isStringList(raw.plugins)) throw new CatalogError(`${at}: \`plugins\` is not a list of names`);
  let https: CatalogFeature['https'] = null;
  if (raw.https !== null) {
    if (!isObject(raw.https) || typeof raw.https.server !== 'string' || !isStringList(raw.https.plugins)) {
      throw new CatalogError(`${at}: \`https\` is neither null nor { server, plugins }`);
    }
    https = { server: raw.https.server, plugins: raw.https.plugins };
  }
  const sinceDate = raw.sinceDate;
  if (sinceDate !== undefined && sinceDate !== null && !(typeof sinceDate === 'string' && DATE.test(sinceDate))) {
    throw new CatalogError(`${at}: \`sinceDate\` is not YYYY-MM-DD`);
  }

  return {
    slug,
    title: requireString(raw, 'title', at),
    pitch: requireString(raw, 'pitch', at),
    since: requireString(raw, 'since', at),
    sinceDate: sinceDate ?? null,
    server: requireString(raw, 'server', at),
    plugins: raw.plugins,
    https,
    url: requireString(raw, 'url', at),
  };
}

/** Check a catalog's text and return it typed. Throws CatalogError naming the first problem. */
export function parseCatalog(text: string): Catalog {
  const raw = parseJsonObject(text, CATALOG_SCHEMA);

  const app = raw.app;
  if (!isObject(app)) throw new CatalogError('`app` is not an object');
  if (typeof app.languages !== 'number' || typeof app.themes !== 'number') {
    throw new CatalogError('`app.languages` and `app.themes` must be numbers');
  }
  const serverFloor = requireString(app, 'serverFloor', 'app');
  if (app.serverNewest !== undefined && typeof app.serverNewest !== 'string') {
    throw new CatalogError('`app.serverNewest` is not a string');
  }

  if (!Array.isArray(raw.features)) throw new CatalogError('`features` is not a list');
  const features = raw.features.map(parseFeature);
  const seen = new Set<string>();
  for (const f of features) {
    if (seen.has(f.slug)) throw new CatalogError(`slug \`${f.slug}\` appears twice`);
    seen.add(f.slug);
  }

  return {
    schema: CATALOG_SCHEMA,
    app: {
      languages: app.languages,
      themes: app.themes,
      serverFloor,
      ...(app.serverNewest ? { serverNewest: app.serverNewest } : {}),
    },
    features,
  };
}

/** The path the build reads: FEATURE_CATALOG_PATH when set, else where fetchAssets() copies it. */
export const catalogPath = (): string => process.env.FEATURE_CATALOG_PATH || DEFAULT_CATALOG_PATH;

let cached: Catalog | undefined;

/** Read and check the catalog once per build. */
export function loadCatalog(file = catalogPath()): Catalog {
  if (cached && file === catalogPath()) return cached;
  const catalog = parseCatalog(readCatalogFile(file));
  if (file === catalogPath()) cached = catalog;
  return catalog;
}
