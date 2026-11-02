// The feature cards for this build: the catalog read once, and one moment that decides what counts
// as new, so every page (and /feature-cards.json, which the browser tests read) agrees.
import { loadCatalog } from './catalog.ts';
import { buildFeatures } from './features.ts';

const warned = new Set<string>();

/** A build warning, printed once. In GitHub Actions it is an annotation on the run. */
export function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Feature catalog::${message}`);
  else console.warn(`[feature catalog] ${message}`);
}

export const BUILD_DATE = new Date();

export const siteFeatures = buildFeatures(loadCatalog(), BUILD_DATE, warnOnce);
