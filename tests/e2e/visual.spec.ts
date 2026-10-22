// Screenshot comparison of the main pages at desktop and phone size, so a dependency bump that
// changes how the site looks (Tailwind, Astro, fonts, the shared-ui header) turns CI red.
//
// - Images are masked: the app screenshots are pulled from jellyrock/jellyrock at build time and
//   change there without a PR here. site.spec.ts already checks every image renders.
// - Reduced motion is emulated so the scroll-reveal fade can't leave a section mid-animation.
//
// Baselines live in tests/e2e/__screenshots__ and only match inside the Playwright image CI uses.
// After a deliberate design change, refresh them: `npm run test:visual:update` (README).
import { test, expect } from '@playwright/test';
import { scrollThrough } from './helpers';

const pages = [
  { name: 'home', path: '/' },
  { name: 'features', path: '/features/' },
  { name: 'screenshots', path: '/screenshots/' },
  { name: 'install', path: '/install/' },
  { name: 'contact', path: '/contact/' },
  { name: 'donate', path: '/donate/' },
  { name: 'privacy', path: '/privacy/' },
  { name: 'not-found', path: '/404.html' },
];

test.use({ reducedMotion: 'reduce' });

for (const { name, path } of pages) {
  test(`${name} looks the same @visual`, async ({ page }) => {
    await page.goto(path);
    await scrollThrough(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask: [page.locator('img')] });
  });
}
