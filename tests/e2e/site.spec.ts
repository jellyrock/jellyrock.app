// Functional checks over the production build. Each one guards something a dependency bump
// can break without failing `astro check` or the build: a script that errors or that the
// production CSP blocks, an asset that 404s, a page that overflows a phone screen, or content
// that silently stops rendering.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { features, HOMEPAGE_FEATURE_COUNT } from '../../src/data/features';
import { sitemapPaths, watchForProblems, collectCspViolations, scrollThrough, brokenImages } from './helpers';

const pages = sitemapPaths();

test('the sitemap lists the site pages', () => {
  expect(pages).toEqual(expect.arrayContaining(['/', '/install/', '/features/', '/screenshots/']));
});

for (const pagePath of pages) {
  test(`${pagePath} loads cleanly`, async ({ page, baseURL }) => {
    const problems = await watchForProblems(page, new URL(baseURL!).origin);

    const response = await page.goto(pagePath);
    expect(response?.status(), 'HTTP status').toBe(200);
    await scrollThrough(page);
    await collectCspViolations(page, problems);

    expect(problems.consoleErrors, 'console errors').toEqual([]);
    expect(problems.cspViolations, 'blocked by the production CSP').toEqual([]);
    expect(problems.failedRequests, 'failed requests').toEqual([]);
    expect(problems.externalRequests, 'requests to other origins (the CSP blocks these)').toEqual([]);

    await expect(page.locator('header.jr-site-header'), 'shared header').toBeVisible();
    await expect(page.locator('footer').first(), 'footer').toBeVisible();
    await expect(page.locator('h1').first(), 'page heading').toBeVisible();
    await expect(page, 'page title').toHaveTitle(/\S/);

    expect(await brokenImages(page), 'images that failed to render').toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'page wider than the screen (sideways scrolling)').toBeLessThanOrEqual(0);
  });
}

test('every internal link and in-page anchor resolves', async ({ request }) => {
  const htmlFiles = fs.globSync('dist/**/*.html');
  const links = new Map<string, string>();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
      if (href.startsWith('/') && !href.startsWith('//')) links.set(href, path.relative('dist', file));
    }
  }
  expect(links.size).toBeGreaterThan(0);

  const broken: string[] = [];
  for (const [href, from] of links) {
    const [target, anchor] = href.split('#');
    const res = await request.get(target || '/');
    if (res.status() !== 200) {
      broken.push(`${href} (on ${from}) → ${res.status()}`);
      continue;
    }
    if (anchor && !(await res.text()).includes(`id="${anchor}"`)) broken.push(`${href} (on ${from}) → no #${anchor}`);
  }
  expect(broken).toEqual([]);
});

test('a missing page returns 404', async ({ request }) => {
  expect((await request.get('/this-page-does-not-exist/')).status()).toBe(404);
});

test.describe('home page', () => {
  test('hero, install button and featured cards render', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const install = page.getByRole('link', { name: 'Install', exact: true }).first();
    await expect(install).toBeVisible();
    expect(await install.getAttribute('href')).toMatch(/^\/install\/?$/);

    const featureSection = page.locator('#features');
    for (const feature of features.slice(0, HOMEPAGE_FEATURE_COUNT)) {
      await expect(featureSection.getByText(feature.title, { exact: true })).toBeVisible();
    }
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

test('features page lists every feature', async ({ page }) => {
  await page.goto('/features/');
  for (const feature of features) {
    await expect(page.getByText(feature.title, { exact: true })).toBeVisible();
  }
});
