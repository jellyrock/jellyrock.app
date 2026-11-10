// Unit test for scripts/catchup-state.sh, this repo's own /catchup reader: `npm run test:unit`. It runs the
// real script from the repo root with a fake `gh` first on PATH that answers from fixture JSON.
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const script = path.join(root, 'scripts', 'catchup-state.sh');

// The fake gh prints the file named by FAKE_GH_RUNS or FAKE_GH_ISSUES, or fails when FAKE_GH_FAIL names the call.
const fakeGh = `#!/usr/bin/env bash
case "$1 $2" in
  "run list") [ "\${FAKE_GH_FAIL:-}" = runs ] && { echo "boom: runs" >&2; exit 1; }; cat "$FAKE_GH_RUNS" ;;
  "issue list") [ "\${FAKE_GH_FAIL:-}" = issues ] && { echo "boom: issues" >&2; exit 1; }; cat "$FAKE_GH_ISSUES" ;;
  *) echo "unexpected gh call: $*" >&2; exit 2 ;;
esac
`;

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catchup-state-'));
  fs.mkdirSync(path.join(tmp, 'bin'));
  fs.writeFileSync(path.join(tmp, 'bin', 'gh'), fakeGh, { mode: 0o755 });
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const run = (runs: object[], issues: object[], fail?: 'runs' | 'issues') => {
  fs.writeFileSync(path.join(tmp, 'runs.json'), JSON.stringify(runs));
  fs.writeFileSync(path.join(tmp, 'issues.json'), JSON.stringify(issues));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${path.join(tmp, 'bin')}:${process.env.PATH}`,
    FAKE_GH_RUNS: path.join(tmp, 'runs.json'),
    FAKE_GH_ISSUES: path.join(tmp, 'issues.json'),
  };
  if (fail) env.FAKE_GH_FAIL = fail;
  return spawnSync('bash', [script], { cwd: root, env, encoding: 'utf8' });
};

const runRow = (databaseId: number, conclusion: string, workflowName = 'Deploy Homepage') => ({
  databaseId,
  workflowName,
  status: 'completed',
  conclusion,
  url: `https://example.test/runs/${databaseId}`,
});

test('a failed newest run prints the ci-failing banner with its run id', () => {
  const result = run([runRow(42, 'failure')], []);
  assert.match(result.stdout, /^BANNER\tci-failing\tDeploy Homepage failed on main\t\/ci-triage 42$/m);
  assert.match(result.stdout, /^ {2}https:\/\/example\.test\/runs\/42$/m);
});

test('an older failure followed by a newer success prints nothing for that workflow', () => {
  const result = run([runRow(2, 'success'), runRow(1, 'failure')], []);
  assert.doesNotMatch(result.stdout, /ci-failing/);
});

test('an open feature-drift issue prints the audit-needed banner with its number', () => {
  const result = run(
    [],
    [{ number: 186, title: 'Feature audit needed: upstream at v3.4.0', url: 'https://example.test/issues/186' }]
  );
  assert.match(
    result.stdout,
    /^BANNER\taudit-needed\t#186 Feature audit needed: upstream at v3\.4\.0\t\/audit-features$/m
  );
  assert.match(result.stdout, /^ {2}https:\/\/example\.test\/issues\/186$/m);
});

test('nothing open and nothing failing prints no banner', () => {
  const result = run([runRow(1, 'success')], []);
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /BANNER/);
  assert.doesNotMatch(result.stdout, /ERROR/);
});

test('a failing gh run list prints an ERROR for ci-failing and the audit-needed section still runs', () => {
  const result = run([], [{ number: 7, title: 'Feature audit needed', url: 'https://example.test/issues/7' }], 'runs');
  assert.match(result.stdout, /^ERROR\tci-failing\tgh run list failed: /m);
  assert.match(result.stdout, /^BANNER\taudit-needed\t#7 /m);
});
