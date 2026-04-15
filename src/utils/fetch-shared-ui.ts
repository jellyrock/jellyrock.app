import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_URL = 'https://github.com/jellyrock/shared-ui.git';
const CLONE_DIR = path.resolve('.shared-ui-repo');

/**
 * Copy the JellyRock shared-ui (header, footer, tokens, nav data) into the
 * current project's src/shared-ui/ directory at build time.
 *
 * Tries a sibling '../shared-ui' checkout first (local dev), then clones
 * from GitHub (CI).
 */
export async function fetchSharedUi(): Promise<void> {
  const destDir = path.resolve('src/shared-ui');
  const sibling = path.resolve('..', 'shared-ui');
  const hasSibling = fs.existsSync(path.join(sibling, 'nav.ts'));

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

  // CI/prod: clone from GitHub and copy files
  if (fs.existsSync(destDir) && fs.existsSync(path.join(destDir, 'nav.ts'))) {
    return; // already fetched
  }

  console.log('Fetching shared-ui from GitHub...');
  if (!fs.existsSync(CLONE_DIR)) {
    execSync(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`, { stdio: 'inherit' });
  }

  fs.mkdirSync(destDir, { recursive: true });
  const toCopy = ['nav.ts', 'tokens.css', 'components'];
  for (const name of toCopy) {
    const src = path.join(CLONE_DIR, name);
    const dest = path.join(destDir, name);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }

  fs.rmSync(CLONE_DIR, { recursive: true, force: true });
  console.log('shared-ui ready.');
}
