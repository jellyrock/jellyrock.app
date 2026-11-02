// Unit tests for the feature catalog and the cards built from it: `npm run test:unit` (Node's own
// test runner, which runs TypeScript as is).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogError, loadCatalog, parseCatalog } from '../../src/data/catalog.ts';
import type { Catalog, CatalogFeature } from '../../src/data/catalog.ts';
import {
  buildDate,
  DEFAULT_ICON,
  FEATURE_ICONS,
  NEW_FOR_DAYS,
  PINNED_SLUGS,
  PROJECT_CARDS,
  RECENT_MAX,
  buildFeatures,
  serverRange,
  shortVersion,
} from '../../src/data/features.ts';

// Midnight UTC, so `daysBefore(n)` is exactly n days old and the window's edge is tested exactly.
const NOW = new Date('2026-11-02T00:00:00Z');

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

function feature(slug: string, extra: Partial<CatalogFeature> = {}): CatalogFeature {
  return {
    slug,
    title: `Title of ${slug}`,
    pitch: `Pitch of ${slug}.`,
    since: '1.0.0',
    sinceDate: '2025-08-24',
    server: '10.7.0',
    plugins: [],
    https: null,
    url: `https://docs.jellyrock.app/features/${slug}/`,
    ...extra,
  };
}

/** A catalog holding every slug the site has an icon for, so no stale-icon warning fires. */
function catalog(features: CatalogFeature[] = []): Catalog {
  const given = new Set(features.map((f) => f.slug));
  const rest = Object.keys(FEATURE_ICONS)
    .filter((slug) => !given.has(slug))
    .map((slug) => feature(slug));
  return { schema: 1, app: { languages: 98, themes: 9, serverFloor: '10.7.0' }, features: [...features, ...rest] };
}

function build(c: Catalog) {
  const warnings: string[] = [];
  const site = buildFeatures(c, NOW, (m) => warnings.push(m));
  return { site, warnings };
}

// --- parseCatalog --------------------------------------------------------------------------

test('a valid catalog parses, and fields the site does not read are ignored', () => {
  const c = catalog();
  const text = JSON.stringify({ ...c, _comment: 'x', features: c.features.map((f) => ({ ...f, screenshots: [] })) });
  const parsed = parseCatalog(text);
  assert.equal(parsed.features.length, Object.keys(FEATURE_ICONS).length);
  assert.equal(parsed.app.serverNewest, undefined);
});

test('schema 2 fails, naming the schema', () => {
  assert.throws(() => parseCatalog(JSON.stringify({ ...catalog(), schema: 2 })), CatalogError);
  assert.throws(() => parseCatalog(JSON.stringify({ ...catalog(), schema: 2 })), /schema is 2/);
});

test('text that is not JSON fails', () => {
  assert.throws(() => parseCatalog('<!doctype html>'), /not valid JSON/);
});

test('an unreadable file fails', () => {
  assert.throws(() => loadCatalog('tests/unit/no-such-catalog.json'), /cannot read/);
});

test('a feature missing a field, or with a malformed one, fails naming it', () => {
  const missing = { ...catalog(), features: [{ ...feature('x'), pitch: undefined }] };
  assert.throws(() => parseCatalog(JSON.stringify(missing)), /feature `x`: `pitch`/);
  const https = { ...catalog(), features: [feature('x', { https: { server: '10.11.0' } as never })] };
  assert.throws(() => parseCatalog(JSON.stringify(https)), /`https`/);
  const date = { ...catalog(), features: [feature('x', { sinceDate: '29 Oct 2026' })] };
  assert.throws(() => parseCatalog(JSON.stringify(date)), /`sinceDate`/);
});

test('a slug listed twice fails', () => {
  const twice = { ...catalog(), features: [feature('x'), feature('x')] };
  assert.throws(() => parseCatalog(JSON.stringify(twice)), /appears twice/);
});

test('a catalog without sinceDate or serverNewest still parses', () => {
  const c = catalog();
  const old = { ...c, features: c.features.map(({ sinceDate: _drop, ...f }) => f) };
  const parsed = parseCatalog(JSON.stringify(old));
  assert.ok(parsed.features.every((f) => f.sinceDate === null));
});

// --- buildFeatures -------------------------------------------------------------------------

test('an unreleased feature appears nowhere', () => {
  const { site } = build(catalog([feature('coming-soon', { since: 'unreleased', sinceDate: null })]));
  const slugs = [...site.all, ...site.pinned, ...site.recent].map((c) => c.slug);
  assert.ok(!slugs.includes('coming-soon'));
});

test('a new slug with no icon gets the default icon and a warning, not a failure', () => {
  const { site, warnings } = build(catalog([feature('brand-new')]));
  assert.equal(site.all.find((c) => c.slug === 'brand-new')?.icon, DEFAULT_ICON);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no icon for feature `brand-new`/);
});

test('an icon for a slug the catalog no longer holds warns', () => {
  const c = catalog();
  const { warnings } = build({ ...c, features: c.features.filter((f) => f.slug !== 'photos') });
  assert.deepEqual(warnings, ['feature-icons.json has `photos`, which the catalog no longer holds. Remove it.']);
});

test('pinned cards follow PINNED_SLUGS, and a missing one is skipped with a warning', () => {
  const { site } = build(catalog());
  assert.deepEqual(
    site.pinned.map((c) => c.slug),
    PINNED_SLUGS
  );
  const c = catalog();
  const without = build({ ...c, features: c.features.filter((f) => f.slug !== 'delete-media') });
  assert.deepEqual(
    without.site.pinned.map((c) => c.slug),
    PINNED_SLUGS.filter((s) => s !== 'delete-media')
  );
  assert.ok(without.warnings.some((w) => /pinned feature `delete-media`/.test(w)));
});

test('with nothing new, /features/ lists the pinned cards, then the rest in catalog order, then the project cards', () => {
  const c = catalog();
  const { site } = build(c);
  const rest = c.features.map((f) => f.slug).filter((s) => !PINNED_SLUGS.includes(s));
  assert.deepEqual(
    site.all.map((c) => c.slug),
    [...PINNED_SLUGS, ...rest, ...PROJECT_CARDS.map((p) => p.slug)]
  );
});

test(`a feature is new for ${NEW_FOR_DAYS} days after its release, and not before it`, () => {
  const { site } = build(
    catalog([
      feature('music', { since: '3.3.0', sinceDate: daysBefore(NEW_FOR_DAYS - 1) }),
      feature('photos', { since: '3.3.0', sinceDate: daysBefore(NEW_FOR_DAYS) }),
      feature('themes', { since: '3.3.0', sinceDate: daysBefore(-1) }),
    ])
  );
  const newIn = (slug: string) => site.all.find((c) => c.slug === slug)?.newIn;
  assert.equal(newIn('music'), 'v3.3');
  assert.equal(newIn('photos'), undefined);
  assert.equal(newIn('themes'), undefined);
});

test('the recent section is newest first, pinned ones included, and holds at most RECENT_MAX', () => {
  const recent = ['music', 'photos', 'themes', 'trickplay', 'live-tv'].map((slug, i) =>
    feature(slug, { since: `3.${i}.0`, sinceDate: daysBefore(10 + i) })
  );
  const { site } = build(catalog([feature('syncplay', { since: '3.3.0', sinceDate: daysBefore(1) }), ...recent]));
  assert.deepEqual(
    site.recent.map((c) => c.slug),
    ['syncplay', 'music', 'photos', 'themes'].slice(0, RECENT_MAX)
  );
  assert.equal(site.latest?.slug, 'syncplay', 'the newest feature leads the homepage');
  assert.equal(site.pinned[0].newIn, 'v3.3', 'a pinned card keeps its label in Why JellyRock? too');
});

test('/features/ floats new features to the top, newest first, then the other pinned ones', () => {
  const c = catalog([
    feature('music', { since: '3.1.0', sinceDate: daysBefore(20) }),
    feature('syncplay', { since: '3.3.0', sinceDate: daysBefore(1) }),
  ]);
  const { site } = build(c);
  const pinnedRest = PINNED_SLUGS.filter((s) => s !== 'syncplay');
  const rest = c.features.map((f) => f.slug).filter((s) => !['music', ...PINNED_SLUGS].includes(s));
  assert.deepEqual(
    site.all.map((c) => c.slug),
    ['syncplay', 'music', ...pinnedRest, ...rest, ...PROJECT_CARDS.map((p) => p.slug)]
  );
});

test('with nothing new there is no latest feature and no recent section', () => {
  const { site } = build(catalog());
  assert.equal(site.latest, undefined);
  assert.deepEqual(site.recent, []);
});

test('a feature with no sinceDate is never new', () => {
  const { site } = build(catalog([feature('music', { since: '3.3.0', sinceDate: null })]));
  assert.equal(site.recent.length, 0);
});

// --- what a feature needs ------------------------------------------------------------------

test('a feature that needs a plugin and a newer server says so on both pages, naming the plugins on /features/', () => {
  const { site } = build(
    catalog([feature('media-segments', { server: '10.10.0', plugins: ['Chapter Segments Provider', 'Intro Skipper'] })])
  );
  const card = site.all.find((c) => c.slug === 'media-segments')!;
  assert.deepEqual(
    card.needs.map((n) => n.text),
    ['Needs a server plugin', 'Needs Jellyfin 10.10 or later']
  );
  assert.deepEqual(
    card.needsDetail.map((n) => n.text),
    ['Needs a server plugin: Chapter Segments Provider or Intro Skipper', 'Needs Jellyfin 10.10 or later']
  );
  assert.ok(card.needs[0].href);
  assert.equal(card.needsDetail[1].href, undefined, 'the server line is plain text');
});

test('a feature that needs a plugin only on HTTPS says so', () => {
  const { site } = build(
    catalog([feature('syncplay', { https: { server: '10.11.0', plugins: ['JellyRock Companion'] } })])
  );
  const card = site.all.find((c) => c.slug === 'syncplay')!;
  assert.deepEqual(
    card.needs.map((n) => n.text),
    ['Plugin needed on HTTPS servers']
  );
  assert.deepEqual(
    card.needsDetail.map((n) => n.text),
    ['On HTTPS servers: Jellyfin 10.11 or later, with the JellyRock Companion plugin']
  );
});

test('a feature that needs only a newer server on HTTPS names no plugin', () => {
  const { site } = build(catalog([feature('syncplay', { https: { server: '10.11.0', plugins: [] } })]));
  const card = site.all.find((c) => c.slug === 'syncplay')!;
  assert.deepEqual(card.needs, []);
  assert.deepEqual(
    card.needsDetail.map((n) => n.text),
    ['On HTTPS servers: Jellyfin 10.11 or later']
  );
});

test('a feature that needs nothing extra has no lines', () => {
  const { site } = build(catalog());
  const card = site.all.find((c) => c.slug === 'music')!;
  assert.deepEqual([card.needs, card.needsDetail], [[], []]);
});

// --- versions ------------------------------------------------------------------------------

test('the server range uses the newest line when the catalog has one', () => {
  assert.equal(serverRange({ languages: 98, themes: 9, serverFloor: '10.7.0' }), 'Jellyfin 10.7 or later');
  assert.equal(
    serverRange({ languages: 98, themes: 9, serverFloor: '10.7.0', serverNewest: '12' }),
    'Jellyfin 10.7 to 12'
  );
});

test('versions drop only a .0 patch', () => {
  assert.equal(shortVersion('10.10.0'), '10.10');
  assert.equal(shortVersion('12.0.0'), '12.0');
  assert.equal(shortVersion('10.11.8'), '10.11.8');
});

test('a fixed build date is used as given, and an invalid one fails', () => {
  assert.equal(buildDate('2026-11-02T12:00:00Z').toISOString(), '2026-11-02T12:00:00.000Z');
  assert.equal(buildDate(undefined, NOW), NOW);
  assert.throws(() => buildDate('next tuesday'), /FEATURE_BUILD_DATE is not a date/);
});
