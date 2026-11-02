// What /companion-plugin/ rendered, for the browser tests (tests/e2e/site.spec.ts), as
// /feature-cards.json does for the feature cards: they check the page against this rather than
// against a catalog that may have changed since the build.
import { siteCompanion } from '~/data/site-features';

export function GET(): Response {
  return new Response(JSON.stringify(siteCompanion), { headers: { 'Content-Type': 'application/json' } });
}
