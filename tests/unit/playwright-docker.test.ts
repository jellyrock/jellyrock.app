// Unit test for the missing-build error in scripts/playwright-docker.sh: `npm run test:unit`. The script
// changes into its own folder's parent, so each test runs a copy of it inside a fresh temp folder.
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const script = path.resolve(import.meta.dirname, '../../scripts/playwright-docker.sh');

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-docker-'));
  fs.mkdirSync(path.join(tmp, 'scripts'));
  fs.copyFileSync(script, path.join(tmp, 'scripts', 'playwright-docker.sh'));
  fs.mkdirSync(path.join(tmp, '.github', 'workflows'), { recursive: true });
  // One line that matches the image pattern the script greps for.
  fs.writeFileSync(
    path.join(tmp, '.github', 'workflows', 'ci.yml'),
    `image: mcr.microsoft.com/playwright:v1.0.0-noble@sha256:${'a'.repeat(64)}\n`
  );
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const run = (distDir?: string) => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.DIST_DIR;
  if (distDir !== undefined) env.DIST_DIR = distDir;
  return spawnSync('bash', [path.join(tmp, 'scripts', 'playwright-docker.sh'), 'true'], { env, encoding: 'utf8' });
};

test('a missing dist-visual/ tells you to run the visual build', () => {
  const result = run('dist-visual');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npm run build:visual/);
});

test('a missing dist/ tells you to run the normal build', () => {
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npm run build/);
  assert.doesNotMatch(result.stderr, /build:visual/);
});
