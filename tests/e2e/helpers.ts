import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

const dist = path.resolve('dist');

/** Every page path the build lists in its sitemap, e.g. ['/', '/features/', ...]. */
export function sitemapPaths(): string[] {
  const file = path.join(dist, 'sitemap-0.xml');
  if (!fs.existsSync(file)) throw new Error('dist/sitemap-0.xml not found: run `npm run build` first');
  const xml = fs.readFileSync(file, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
}

/** Problems a visitor would hit on a page: script errors, blocked resources, broken requests. */
export interface PageProblems {
  consoleErrors: string[];
  cspViolations: string[];
  failedRequests: string[];
  externalRequests: string[];
}

/**
 * Start recording problems for `page`. Call before `page.goto`. Requests to other origins are
 * recorded because the production CSP blocks them: a dependency that starts loading a font,
 * script or tracker from a CDN would work in dev and break on jellyrock.app.
 */
export async function watchForProblems(page: Page, origin: string): Promise<PageProblems> {
  const problems: PageProblems = { consoleErrors: [], cspViolations: [], failedRequests: [], externalRequests: [] };

  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = violations;
    document.addEventListener('securitypolicyviolation', (e) => {
      violations.push(`${e.violatedDirective} blocked ${e.blockedURI}`);
    });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => problems.consoleErrors.push(`uncaught: ${err.message}`));
  page.on('request', (req) => {
    const url = req.url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) problems.externalRequests.push(url);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin) {
      problems.failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });
  page.on('requestfailed', (req) => problems.failedRequests.push(`${req.failure()?.errorText} ${req.url()}`));

  return problems;
}

export async function collectCspViolations(page: Page, problems: PageProblems) {
  problems.cspViolations.push(...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)));
}

/**
 * Wait until every image has finished (loaded or failed), then return the ones that did not
 * render. Lazy images start loading only when scrolled near, so call after `scrollThrough`.
 */
export async function brokenImages(page: Page): Promise<string[]> {
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, {
    timeout: 15_000,
  });
  return page.$$eval('img', (imgs) =>
    imgs.filter((img) => img.naturalWidth === 0).map((img) => img.currentSrc || img.src)
  );
}

/** Scroll to the bottom in steps so lazy images load and scroll-reveal sections trigger. */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForLoadState('networkidle');
}
