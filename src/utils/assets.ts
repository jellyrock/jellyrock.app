import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ASSETS_DIR = path.resolve('src/assets/images/jellyrock');
const CLONE_DIR = path.resolve('.jellyrock-repo');

const REPO_URL = 'https://github.com/jellyrock/jellyrock.git';

/** Directories to copy from the cloned repo */
const COPY_MAP: Record<string, string> = {
  'docs/screenshots': 'screenshots',
  'resources/branding': 'branding',
};

export async function fetchAssets(): Promise<void> {
  // Skip if already fetched (cache for dev mode)
  if (fs.existsSync(ASSETS_DIR) && fs.readdirSync(ASSETS_DIR).length > 0) {
    return;
  }

  console.log('Fetching JellyRock assets from repo...');

  // Shallow clone with sparse checkout (only the folders we need)
  if (!fs.existsSync(CLONE_DIR)) {
    execSync(`git clone --depth 1 --filter=blob:none --sparse ${REPO_URL} ${CLONE_DIR}`, { stdio: 'inherit' });
    execSync(`git -C ${CLONE_DIR} sparse-checkout set ${Object.keys(COPY_MAP).join(' ')}`, { stdio: 'inherit' });
  }

  // Copy directories to assets
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  for (const [repoPath, localName] of Object.entries(COPY_MAP)) {
    const src = path.join(CLONE_DIR, repoPath);
    const dest = path.join(ASSETS_DIR, localName);

    if (!fs.existsSync(src)) {
      console.warn(`Source not found: ${src}`);
      continue;
    }

    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied: ${repoPath} → ${localName}`);
  }

  // Clean up clone
  fs.rmSync(CLONE_DIR, { recursive: true, force: true });

  console.log('JellyRock assets ready.');
}
