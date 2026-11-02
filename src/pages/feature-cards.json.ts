// The feature cards this build rendered, for the browser tests (tests/e2e/site.spec.ts). They read
// it rather than recompute it, so a test run after midnight can't disagree with the build about
// which features are new.
import { BUILD_DATE, siteFeatures } from '~/data/site-features';

export function GET(): Response {
  const { all, pinned, recent, latest, serverRange, app } = siteFeatures;
  return new Response(
    JSON.stringify({
      builtAt: BUILD_DATE.toISOString(),
      languages: app.languages,
      serverRange,
      all,
      pinned: pinned.map((c) => c.slug),
      recent: recent.map((c) => c.slug),
      latest: latest?.slug ?? null,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
