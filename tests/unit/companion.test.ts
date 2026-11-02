// Unit tests for the Companion plugin's catalog and /companion-plugin/ built from it:
// `npm run test:unit` (Node's own test runner, which runs TypeScript as is).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogError } from '../../src/data/catalog.ts';
import { loadPluginCatalog, parsePluginCatalog } from '../../src/data/plugin-catalog.ts';
import type { PluginCatalog, PluginFeature } from '../../src/data/plugin-catalog.ts';
import { buildCompanion, COMPANION_ICON, needText } from '../../src/data/companion.ts';

function feature(slug: string, extra: Partial<PluginFeature> = {}): PluginFeature {
  return {
    slug,
    title: `Title of ${slug}`,
    pitch: `Pitch of ${slug}.`,
    since: '0.1.0',
    sinceDate: '2026-07-14',
    jellyrock: '2.23.0',
    http: 'not-needed',
    https: 'needed',
    url: `https://github.com/jellyrock/jellyfin-plugin-jellyrock/blob/main/docs/features/${slug}.md`,
    ...extra,
  };
}

function catalog(features: PluginFeature[] = [feature('remote-control')]): PluginCatalog {
  return { schema: 1, plugin: { server: '10.11.0' }, features };
}

const text = (c: unknown) => JSON.stringify(c);

// --- parsePluginCatalog --------------------------------------------------------------------

test('a valid plugin catalog parses, and fields the site does not read are ignored', () => {
  const c = catalog();
  const parsed = parsePluginCatalog(text({ ...c, _comment: 'x', features: [{ ...c.features[0], extra: 1 }] }));
  assert.deepEqual(parsed, c);
});

test('a plugin catalog with schema 2 fails, naming the catalog and the schema', () => {
  assert.throws(() => parsePluginCatalog(text({ ...catalog(), schema: 2 })), CatalogError);
  assert.throws(
    () => parsePluginCatalog(text({ ...catalog(), schema: 2 })),
    /^CatalogError: Companion plugin catalog: schema is 2/
  );
});

test('a plugin catalog that is not JSON fails', () => {
  assert.throws(() => parsePluginCatalog('<!doctype html>'), /Companion plugin catalog: not valid JSON/);
});

test('an unreadable plugin catalog fails', () => {
  assert.throws(
    () => loadPluginCatalog('tests/unit/no-such-plugin-catalog.json'),
    /Companion plugin catalog: cannot read/
  );
});

test('a plugin catalog with no server, or a capability missing or misspelling a field, fails naming it', () => {
  assert.throws(() => parsePluginCatalog(text({ ...catalog(), plugin: {} })), /plugin: `server`/);
  const missing = catalog([{ ...feature('x'), jellyrock: undefined } as never]);
  assert.throws(() => parsePluginCatalog(text(missing)), /feature `x`: `jellyrock`/);
  const need = catalog([feature('x', { https: 'optional' as never })]);
  assert.throws(() => parsePluginCatalog(text(need)), /feature `x`: `https` is neither/);
  const date = catalog([feature('x', { sinceDate: '29 Oct 2026' })]);
  assert.throws(() => parsePluginCatalog(text(date)), /`sinceDate`/);
  const twice = catalog([feature('x'), feature('x')]);
  assert.throws(() => parsePluginCatalog(text(twice)), /appears twice/);
});

// --- buildCompanion ------------------------------------------------------------------------

test('the table has a row per capability, in catalog order, saying where it needs the plugin', () => {
  const page = buildCompanion(
    catalog([
      feature('remote-control'),
      feature('cold-launch-cast', { http: 'needed', https: 'needed' }),
      feature('syncplay', { https: 'not-needed' }),
    ])
  );
  assert.deepEqual(
    page.rows.map((r) => [r.slug, needText(r.http), needText(r.https)]),
    [
      ['remote-control', 'Not needed', 'Needed'],
      ['cold-launch-cast', 'Needed', 'Needed'],
      ['syncplay', 'Not needed', 'Not needed'],
    ]
  );
});

test('a card per capability gives its pitch, its docs page and the JellyRock version it needs', () => {
  const page = buildCompanion(catalog([feature('syncplay', { jellyrock: '3.3.0' })]));
  assert.deepEqual(page.cards, [
    {
      slug: 'syncplay',
      title: 'Title of syncplay',
      pitch: 'Pitch of syncplay.',
      icon: COMPANION_ICON,
      url: 'https://github.com/jellyrock/jellyfin-plugin-jellyrock/blob/main/docs/features/syncplay.md',
      needs: [{ text: 'Needs JellyRock 3.3 or later' }],
      needsDetail: [{ text: 'Needs JellyRock 3.3 or later' }],
    },
  ]);
});

test('an unreleased capability appears in neither the table nor the cards', () => {
  const page = buildCompanion(
    catalog([feature('remote-control'), feature('coming-soon', { since: 'unreleased', sinceDate: null })])
  );
  assert.deepEqual(
    page.rows.map((r) => r.slug),
    ['remote-control']
  );
  assert.deepEqual(
    page.cards.map((c) => c.slug),
    ['remote-control']
  );
});

test('the server the plugin needs comes from the catalog, shortened', () => {
  assert.equal(buildCompanion(catalog()).server, '10.11');
  assert.equal(buildCompanion({ ...catalog(), plugin: { server: '10.11.8' } }).server, '10.11.8');
});
