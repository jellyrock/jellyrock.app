import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { DEFAULT_CATALOG_PATH } from '../data/catalog.ts';

const ASSETS_DIR = path.resolve('src/assets/images/jellyrock');
const CLONE_DIR = path.resolve('.jellyrock-repo');

const REPO_URL = 'https://github.com/jellyrock/jellyrock.git';

/** Folders the sparse checkout asks for. In cone mode (asked for explicitly below) it also checks
 * out the files directly inside each one's parent folders, which is how docs/feature-catalog.json
 * arrives. Without it the catalog is missing and every build fails. */
const SPARSE_DIRS = ['docs/screenshots', 'resources/branding'];

/** What to copy from the cloned repo, and where to. Everything comes from one clone, so the
 * screenshots and the feature catalog are always from the same commit. */
const COPY_MAP: Record<string, string> = {
  'docs/screenshots': path.join(ASSETS_DIR, 'screenshots'),
  'resources/branding': path.join(ASSETS_DIR, 'branding'),
  'docs/feature-catalog.json': path.resolve(DEFAULT_CATALOG_PATH),
};

export async function fetchAssets(): Promise<void> {
  // Skip if already fetched (cache for dev mode). A copy made before an entry was added
  // counts as missing, so it is fetched again rather than built without that entry.
  if (Object.values(COPY_MAP).every((dest) => fs.existsSync(dest))) {
    return;
  }

  console.log('Fetching JellyRock assets from repo...');

  // Shallow clone with sparse checkout (only the folders we need)
  if (!fs.existsSync(CLONE_DIR)) {
    execSync(`git clone --depth 1 --filter=blob:none --sparse ${REPO_URL} ${CLONE_DIR}`, { stdio: 'inherit' });
    execSync(`git -C ${CLONE_DIR} sparse-checkout set --cone ${SPARSE_DIRS.join(' ')}`, { stdio: 'inherit' });
  }

  for (const [repoPath, dest] of Object.entries(COPY_MAP)) {
    const src = path.join(CLONE_DIR, repoPath);

    if (!fs.existsSync(src)) {
      console.warn(`Source not found: ${src}`);
      continue;
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied: ${repoPath} → ${path.relative(process.cwd(), dest)}`);
  }

  // Clean up clone
  fs.rmSync(CLONE_DIR, { recursive: true, force: true });

  console.log('JellyRock assets ready.');
}
