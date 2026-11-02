// The feature cards for this build: the catalog read once, and one moment that decides what counts
// as new, so every page (and /feature-cards.json, which the browser tests read) agrees. The same
// for /companion-plugin/ and the plugin catalog (/companion-cards.json).
import { loadCatalog } from './catalog.ts';
import { buildCompanion } from './companion.ts';
import { buildDate, buildFeatures } from './features.ts';
import { loadPluginCatalog } from './plugin-catalog.ts';

const warned = new Set<string>();

/** A build warning, printed once. In GitHub Actions it is an annotation on the run. */
export function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Feature catalog::${message}`);
  else console.warn(`[feature catalog] ${message}`);
}

/** Now, unless FEATURE_BUILD_DATE fixes it: the screenshot tests' build does
 * (scripts/build-visual.sh), so what counts as new never moves under its baselines. */
export const BUILD_DATE = buildDate(process.env.FEATURE_BUILD_DATE);

export const siteFeatures = buildFeatures(loadCatalog(), BUILD_DATE, warnOnce);

export const siteCompanion = buildCompanion(loadPluginCatalog());
