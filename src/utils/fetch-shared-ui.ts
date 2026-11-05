import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_URL = 'https://github.com/jellyrock/shared-ui.git';
const CLONE_DIR = path.resolve('.shared-ui-repo');

// Pinned shared-ui release for reproducible CI/prod builds. Each shared-ui release
// bumps it through .github/workflows/shared-ui-bump.yml (README: shared-ui updates);
// Renovate (renovate.json customManager) is the fallback.
// renovate: datasource=github-tags depName=jellyrock/shared-ui
const SHARED_UI_REF = 'v1.3.0';

/**
 * Copy the JellyRock shared-ui (header, footer, tokens, nav data, and the shared
 * browser-test code in testing/) into the current project's src/shared-ui/
 * directory at build time.
 *
 * Tries a sibling '../shared-ui' checkout first (local dev), then clones
 * from GitHub (CI). SHARED_UI_FROM_RELEASE=1 skips the sibling so a local
 * build uses the pinned release, as CI does (scripts/shared-ui-bump.sh).
 */
export async function fetchSharedUi(): Promise<void> {
  const destDir = path.resolve('src/shared-ui');
  const sibling = path.resolve('..', 'shared-ui');
  const hasSibling = process.env.SHARED_UI_FROM_RELEASE !== '1' && fs.existsSync(path.join(sibling, 'nav.ts'));

  // Dev-mode with sibling: symlink so edits in shared-ui/ propagate immediately
  if (hasSibling) {
    const isSymlink = fs.existsSync(destDir) && fs.lstatSync(destDir).isSymbolicLink();
    const pointsCorrectly = isSymlink && fs.readlinkSync(destDir) === sibling;
    if (pointsCorrectly) return;

    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.symlinkSync(sibling, destDir, 'dir');
    console.log('Linked src/shared-ui → ../shared-ui (dev mode)');
    return;
  }

  await copySharedUiRelease({ repoUrl: REPO_URL, ref: SHARED_UI_REF, destDir, cloneDir: CLONE_DIR });
}

/** What a release copy holds: the build-time files, and the browser-test code in testing/. */
const TO_COPY = ['nav.ts', 'tokens.css', 'components', 'testing'];

/** Records which release the copy is, so a pin bump fetches the new one. */
export const STAMP_FILE = '.fetched.json';

/**
 * Copy shared-ui release `ref` into `destDir`, unless it already holds that release. A copy of
 * another release, one from before testing/ existed, or the symlink to a sibling checkout counts as
 * missing. The scratch clone is made fresh each time, so a leftover one from an interrupted run is
 * never used.
 */
export async function copySharedUiRelease(options: {
  repoUrl: string;
  ref: string;
  destDir: string;
  cloneDir: string;
}): Promise<void> {
  const { repoUrl, ref, destDir, cloneDir } = options;
  const isCopy = fs.existsSync(destDir) && !fs.lstatSync(destDir).isSymbolicLink();
  const complete = TO_COPY.every((name) => fs.existsSync(path.join(destDir, name)));
  if (isCopy && complete && readRef(path.join(destDir, STAMP_FILE)) === ref) return;

  console.log(`Fetching shared-ui ${ref} from GitHub...`);
  fs.rmSync(cloneDir, { recursive: true, force: true });
  try {
    execFileSync(
      'git',
      ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--branch', ref, '--depth', '1', repoUrl, cloneDir],
      {
        stdio: 'inherit',
      }
    );

    fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });
    for (const name of TO_COPY) {
      const src = path.join(cloneDir, name);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(destDir, name), { recursive: true });
      }
    }
    // Last, so an interrupted copy is fetched again.
    fs.writeFileSync(path.join(destDir, STAMP_FILE), `${JSON.stringify({ ref }, null, 2)}\n`);
  } finally {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }
  console.log('shared-ui ready.');
}

function readRef(file: string): string | null {
  try {
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as { ref?: string }).ref ?? null;
  } catch {
    return null;
  }
}
