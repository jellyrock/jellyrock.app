// Functional checks over the production build. The checks every JellyRock site shares (each
// sitemap page loads cleanly, links and anchors resolve, a missing page is a 404) come from
// shared-ui's testing/site-tests.ts; the tests below are this site's own.
import { test, expect } from '@playwright/test';
import { features, HOMEPAGE_FEATURE_COUNT } from '../../src/data/features';
import { defineSiteTests } from '../../src/shared-ui/testing/site-tests';

defineSiteTests({ test, expect, distDir: 'dist', requiredPages: ['/', '/install/', '/features/', '/screenshots/'] });

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
