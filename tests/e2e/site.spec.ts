// Functional checks over the production build. The checks every JellyRock site shares (each
// sitemap page loads cleanly, links and anchors resolve, a missing page is a 404) come from
// shared-ui's testing/site-tests.ts; the tests below are this site's own.
import { test, expect, type Locator, type Page } from '@playwright/test';
import type { FeatureCard } from '../../src/data/features.ts';
import { defineSiteTests } from '../../src/shared-ui/testing/site-tests';

defineSiteTests({
  test,
  expect,
  distDir: process.env.DIST_DIR || 'dist',
  requiredPages: ['/', '/install/', '/features/', '/screenshots/'],
});

interface BuiltCards {
  languages: number;
  serverRange: string;
  all: FeatureCard[];
  pinned: string[];
  recent: string[];
}

/** The cards the build rendered (src/pages/feature-cards.json.ts), so the tests and the build
 * agree on what is new however long after the build they run. */
async function builtCards(page: Page): Promise<BuiltCards> {
  const res = await page.request.get('/feature-cards.json');
  expect(res.ok()).toBe(true);
  return res.json();
}

/** One card renders its title (linked to its docs page when it has one), its "New" label when it
 * is new, and the lines saying what it needs. */
async function expectCard(scope: Locator, card: FeatureCard, needs: 'needs' | 'needsDetail') {
  const el = scope.locator(`[data-feature-card="${card.slug}"]`);
  await expect(el.getByRole('heading', { level: 3 })).toHaveText(card.title);
  if (card.url) await expect(el.getByRole('link', { name: card.title, exact: true })).toHaveAttribute('href', card.url);
  await expect(el.locator('[data-feature-new]')).toHaveCount(card.newIn ? 1 : 0);
  if (card.newIn) await expect(el.locator('[data-feature-new]')).toHaveText(`New in ${card.newIn}`);
  const lines = el.locator('[data-feature-needs] > li');
  await expect(lines).toHaveText(card[needs].map((n) => n.text));
}

test.describe('home page', () => {
  test('hero, install button and featured cards render', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const install = page.getByRole('link', { name: 'Install', exact: true }).first();
    await expect(install).toBeVisible();
    expect(await install.getAttribute('href')).toMatch(/^\/install\/?$/);
  });

  test('pinned features lead, then the new ones', async ({ page }) => {
    const built = await builtCards(page);
    const bySlug = new Map(built.all.map((c) => [c.slug, c]));
    await page.goto('/');

    const pinned = page.locator('#features [data-feature-card]');
    await expect(pinned).toHaveCount(built.pinned.length);
    expect(await pinned.evaluateAll((els) => els.map((e) => e.getAttribute('data-feature-card')))).toEqual(
      built.pinned
    );
    for (const slug of built.pinned) await expectCard(page.locator('#features'), bySlug.get(slug)!, 'needs');

    const recent = page.locator('#new-features');
    await expect(recent).toHaveCount(built.recent.length > 0 ? 1 : 0);
    for (const slug of built.recent) await expectCard(recent, bySlug.get(slug)!, 'needs');
  });

  test('sections fade in as they scroll into view', async ({ page, isMobile }) => {
    // The fade only applies from the md breakpoint up (motion-safe:md:intersect:animate-fade).
    test.skip(isMobile, 'desktop-only effect');
    await page.goto('/');
    // Pin one waiting section: a bare '[no-intersect]' locator would move on to the next
    // waiting section as soon as this one is revealed.
    await expect(page.locator('[no-intersect]').first()).toBeAttached();
    await page
      .locator('[no-intersect]')
      .first()
      .evaluate((el) => el.setAttribute('data-test-reveal', ''));
    const below = page.locator('[data-test-reveal]');
    await expect(below, 'a section below the fold waits to be revealed').toHaveCSS('opacity', '0');
    await below.scrollIntoViewIfNeeded();
    await expect(below).not.toHaveAttribute('no-intersect');
    await expect(below).toHaveCSS('opacity', '1');
  });
});

test('features page lists every feature, with what each one needs', async ({ page }) => {
  const built = await builtCards(page);
  await page.goto('/features/');
  const cards = page.locator('[data-feature-card]');
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-feature-card')))).toEqual(
    built.all.map((c) => c.slug)
  );
  for (const card of built.all) await expectCard(page.locator('#all-features'), card, 'needsDetail');
  await expect(
    page.getByText(`It comes in ${built.languages} languages and works with ${built.serverRange}.`)
  ).toBeVisible();
});
