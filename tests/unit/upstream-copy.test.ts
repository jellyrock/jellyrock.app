// Unit tests for the copies of upstream repos the build keeps between runs (src/utils/assets.ts and
// src/utils/fetch-shared-ui.ts): `npm run test:unit`. Each test fetches from a local git repo over
// file://, so they use real git and no network.
import { afterEach, beforeEach, test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { FROM_CACHE_ENV, fetchUpstream } from '../../src/utils/assets.ts';
import type { UpstreamCopy } from '../../src/utils/assets.ts';
import { STAMP_FILE, copySharedUiRelease } from '../../src/utils/fetch-shared-ui.ts';

const gitEnv: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};
for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete gitEnv[name];

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    cwd,
    env: gitEnv,
    stdio: 'pipe',
  });

let tmp: string;
// CI sets UPSTREAM_FROM_CACHE=1 for its builds; these tests set it themselves.
const savedFromCache = process.env[FROM_CACHE_ENV];
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'upstream-copy-'));
  delete process.env[FROM_CACHE_ENV];
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (savedFromCache === undefined) delete process.env[FROM_CACHE_ENV];
  else process.env[FROM_CACHE_ENV] = savedFromCache;
});

/** A repo the clones can partially fetch from, as from GitHub. */
function upstreamRepo(files: Record<string, string>) {
  const dir = path.join(tmp, 'upstream');
  fs.mkdirSync(dir);
  git(dir, 'init', '--quiet', '--initial-branch', 'main');
  git(dir, 'config', 'uploadpack.allowFilter', 'true');
  git(dir, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  const commit = (changes: Record<string, string | null>) => {
    for (const [file, content] of Object.entries(changes)) {
      const full = path.join(dir, file);
      if (content === null) fs.rmSync(full);
      else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
      }
    }
    git(dir, 'add', '--all');
    git(dir, 'commit', '--quiet', '--message', 'change');
  };
  commit(files);
  return { dir, url: `file://${dir}`, commit };
}

const APP_FILES = {
  'docs/screenshots/home.webp': 'home v1',
  'docs/screenshots/search.webp': 'search v1',
  'docs/screenshots/screenshots.json': '{"format":"webp"}',
  'docs/feature-catalog.json': '{"schema":1}',
  'resources/branding/logo.svg': '<svg/>',
  'README.md': 'readme',
};

function copyOf(url: string, catalogDest = 'data/catalog.json'): UpstreamCopy {
  const out = path.join(tmp, 'out');
  return {
    name: 'Test assets',
    repoUrl: url,
    cloneDir: path.join(tmp, 'clone'),
    copy: {
      'docs/screenshots': path.join(out, 'images/screenshots'),
      'resources/branding': path.join(out, 'images/branding'),
      'docs/feature-catalog.json': path.join(out, catalogDest),
    },
    stampFile: path.join(out, 'data/test.fetched.json'),
  };
}

const out = (file: string) => path.join(tmp, 'out', file);
const read = (file: string) => fs.readFileSync(out(file), 'utf8');
/** A file the fetch doesn't know about: it survives only while the copy is left alone. */
const plantSentinel = () => fs.writeFileSync(out('images/screenshots/sentinel.webp'), 'local');
const sentinelSurvived = () => fs.existsSync(out('images/screenshots/sentinel.webp'));

function quiet(t: TestContext) {
  t.mock.method(console, 'log', () => {});
  return t.mock.method(console, 'warn', () => {});
}

test('the first fetch copies each path and stamps the copy', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));

  assert.equal(read('images/screenshots/home.webp'), 'home v1');
  assert.equal(read('images/branding/logo.svg'), '<svg/>');
  assert.equal(read('data/catalog.json'), '{"schema":1}');
  assert.ok(!fs.existsSync(out('README.md')), 'only the mapped paths are copied');
  const stamp = JSON.parse(read('data/test.fetched.json'));
  assert.match(stamp.key, /^[0-9a-f]{64}$/);
  assert.equal(stamp.commit, git(upstream.dir, 'rev-parse', 'HEAD').toString().trim());
  assert.ok(!fs.existsSync(path.join(tmp, 'clone')), 'the scratch clone is deleted');
});

test('an upstream commit that changes no copied path fetches nothing', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  plantSentinel();

  upstream.commit({ 'README.md': 'readme v2' });
  await fetchUpstream(copyOf(upstream.url));

  assert.ok(sentinelSurvived());
});

test('a changed path replaces its copy, so files upstream deleted go too', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  plantSentinel();

  upstream.commit({ 'docs/screenshots/home.webp': 'home v2', 'docs/screenshots/search.webp': null });
  await fetchUpstream(copyOf(upstream.url));

  assert.equal(read('images/screenshots/home.webp'), 'home v2');
  assert.ok(!fs.existsSync(out('images/screenshots/search.webp')), 'the deleted screenshot is gone');
  assert.ok(!sentinelSurvived());
  assert.equal(read('images/branding/logo.svg'), '<svg/>', 'the unchanged paths are copied too');
});

test('a copy with no stamp, as an interrupted copy leaves, is fetched again', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  plantSentinel();
  fs.rmSync(out('data/test.fetched.json'));

  await fetchUpstream(copyOf(upstream.url));

  assert.ok(!sentinelSurvived());
  assert.ok(fs.existsSync(out('data/test.fetched.json')));
});

test('a copy whose path is missing is fetched again', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  fs.rmSync(out('images/branding'), { recursive: true });

  await fetchUpstream(copyOf(upstream.url));

  assert.equal(read('images/branding/logo.svg'), '<svg/>');
});

test('a path copied somewhere new is fetched again', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  plantSentinel();
  fs.writeFileSync(out('data/moved.json'), 'stale');

  await fetchUpstream(copyOf(upstream.url, 'data/moved.json'));

  assert.equal(read('data/moved.json'), '{"schema":1}');
  assert.ok(!sentinelSurvived());
});

test('a leftover scratch clone from an interrupted run is never used', async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  fs.mkdirSync(path.join(tmp, 'clone/docs/screenshots'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'clone/docs/screenshots/home.webp'), 'leftover');

  await fetchUpstream(copyOf(upstream.url));

  assert.equal(read('images/screenshots/home.webp'), 'home v1');
});

test('when upstream cannot be reached, the copy is used with a warning', async (t) => {
  const warn = quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  plantSentinel();

  await fetchUpstream(copyOf(`file://${tmp}/no-such-repo`));

  assert.ok(sentinelSurvived());
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0].arguments[0]), /could not check upstream.*Building from the copy/s);
});

test('when upstream cannot be reached and there is no copy, the build fails', async (t) => {
  quiet(t);
  await assert.rejects(fetchUpstream(copyOf(`file://${tmp}/no-such-repo`)), /Test assets: could not check upstream/);
});

test(`${FROM_CACHE_ENV}=1 uses the copy without checking upstream`, async (t) => {
  const warn = quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  await fetchUpstream(copyOf(upstream.url));
  plantSentinel();
  upstream.commit({ 'docs/screenshots/home.webp': 'home v2' });

  process.env[FROM_CACHE_ENV] = '1';
  await fetchUpstream(copyOf(`file://${tmp}/no-such-repo`));
  await fetchUpstream(copyOf(upstream.url));

  assert.ok(sentinelSurvived());
  assert.equal(read('images/screenshots/home.webp'), 'home v1');
  assert.equal(warn.mock.callCount(), 0, 'upstream is never contacted');
});

test(`${FROM_CACHE_ENV}=1 still fetches when there is no copy`, async (t) => {
  quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  process.env[FROM_CACHE_ENV] = '1';

  await fetchUpstream(copyOf(upstream.url));

  assert.equal(read('images/screenshots/home.webp'), 'home v1');
});

test('a path missing upstream warns and leaves no stamp, so the next build checks again', async (t) => {
  const warn = quiet(t);
  const upstream = upstreamRepo(APP_FILES);
  upstream.commit({ 'resources/branding/logo.svg': null });

  await fetchUpstream(copyOf(upstream.url));

  assert.equal(read('images/screenshots/home.webp'), 'home v1');
  assert.ok(!fs.existsSync(out('data/test.fetched.json')));
  assert.match(String(warn.mock.calls[0].arguments[0]), /resources\/branding not found upstream/);
});

// shared-ui: the copy is of a pinned release, so the pin decides whether it is current.

function sharedUiRepo() {
  const upstream = upstreamRepo({
    'nav.ts': 'nav v1',
    'tokens.css': ':root{}',
    'components/SiteHeader.astro': '<header/>',
    'testing/checks.ts': 'checks',
  });
  git(upstream.dir, 'tag', 'v1.0.0');
  upstream.commit({ 'nav.ts': 'nav v2' });
  git(upstream.dir, 'tag', 'v1.1.0');
  return upstream;
}

const sharedUi = (url: string, ref: string) => ({
  repoUrl: url,
  ref,
  destDir: path.join(tmp, 'out/shared-ui'),
  cloneDir: path.join(tmp, 'shared-ui-clone'),
});

test('shared-ui: a copy of the pinned release is kept, and a new pin replaces it', async (t) => {
  quiet(t);
  const upstream = sharedUiRepo();
  await copySharedUiRelease(sharedUi(upstream.url, 'v1.0.0'));
  assert.equal(read('shared-ui/nav.ts'), 'nav v1');
  assert.deepEqual(JSON.parse(read(`shared-ui/${STAMP_FILE}`)), { ref: 'v1.0.0' });

  fs.writeFileSync(out('shared-ui/sentinel'), 'local');
  await copySharedUiRelease(sharedUi(upstream.url, 'v1.0.0'));
  assert.ok(fs.existsSync(out('shared-ui/sentinel')), 'the same release is not fetched again');

  await copySharedUiRelease(sharedUi(upstream.url, 'v1.1.0'));
  assert.equal(read('shared-ui/nav.ts'), 'nav v2');
  assert.ok(!fs.existsSync(out('shared-ui/sentinel')));
  assert.ok(!fs.existsSync(path.join(tmp, 'shared-ui-clone')), 'the scratch clone is deleted');
});

test('shared-ui: a copy with no stamp, or missing testing/, is fetched again', async (t) => {
  quiet(t);
  const upstream = sharedUiRepo();
  await copySharedUiRelease(sharedUi(upstream.url, 'v1.0.0'));

  fs.rmSync(out(`shared-ui/${STAMP_FILE}`));
  fs.writeFileSync(out('shared-ui/sentinel'), 'local');
  await copySharedUiRelease(sharedUi(upstream.url, 'v1.0.0'));
  assert.ok(!fs.existsSync(out('shared-ui/sentinel')));

  fs.rmSync(out('shared-ui/testing'), { recursive: true });
  await copySharedUiRelease(sharedUi(upstream.url, 'v1.0.0'));
  assert.equal(read('shared-ui/testing/checks.ts'), 'checks');
});

test('shared-ui: the link to a sibling checkout is replaced by the release, and the sibling is left alone', async (t) => {
  quiet(t);
  const upstream = sharedUiRepo();
  const sibling = path.join(tmp, 'sibling');
  fs.mkdirSync(sibling);
  for (const name of ['nav.ts', 'tokens.css', 'components', 'testing']) {
    fs.writeFileSync(path.join(sibling, name), 'sibling');
  }
  fs.writeFileSync(path.join(sibling, STAMP_FILE), JSON.stringify({ ref: 'v1.0.0' }));
  fs.mkdirSync(out(''), { recursive: true });
  fs.symlinkSync(sibling, out('shared-ui'), 'dir');

  await copySharedUiRelease(sharedUi(upstream.url, 'v1.0.0'));

  assert.ok(!fs.lstatSync(out('shared-ui')).isSymbolicLink());
  assert.equal(read('shared-ui/nav.ts'), 'nav v1');
  assert.equal(fs.readFileSync(path.join(sibling, 'nav.ts'), 'utf8'), 'sibling', 'the sibling checkout is untouched');
});
