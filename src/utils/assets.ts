import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DEFAULT_CATALOG_PATH } from '../data/catalog.ts';
import { DEFAULT_PLUGIN_CATALOG_PATH } from '../data/plugin-catalog.ts';

/** Set to 1 to build from the copies already fetched without checking upstream: to preview files
 * copied in by hand, or in CI, so every build in a job uses the same upstream content. With no copy
 * yet, the build fetches one as usual. */
export const FROM_CACHE_ENV = 'UPSTREAM_FROM_CACHE';

/** Files copied from an upstream repo and kept between builds. */
export interface UpstreamCopy {
  /** What the log lines call it. */
  name: string;
  repoUrl: string;
  /** A scratch clone, deleted before and after every check. */
  cloneDir: string;
  /** Repo path to where it is copied. Everything comes from one clone, so from one commit. */
  copy: Record<string, string>;
  /** Records what the copy holds, so the next build can tell whether upstream changed it. */
  stampFile: string;
}

interface Stamp {
  key: string;
  commit: string;
}

type Entry = { type: 'tree' | 'blob'; id: string } | null;

const ASSETS_DIR = path.resolve('src/assets/images/jellyrock');

/** The screenshots, the branding and the app's feature catalog, from jellyrock/jellyrock. */
export const JELLYROCK_COPY: UpstreamCopy = {
  name: 'JellyRock assets',
  repoUrl: 'https://github.com/jellyrock/jellyrock.git',
  cloneDir: path.resolve('.jellyrock-repo'),
  copy: {
    'docs/screenshots': path.join(ASSETS_DIR, 'screenshots'),
    'resources/branding': path.join(ASSETS_DIR, 'branding'),
    'docs/feature-catalog.json': path.resolve(DEFAULT_CATALOG_PATH),
  },
  stampFile: path.resolve('src/data/upstream/jellyrock.fetched.json'),
};

/** The Companion plugin's feature catalog, from jellyrock/jellyfin-plugin-jellyrock. */
export const PLUGIN_COPY: UpstreamCopy = {
  name: 'Companion plugin catalog',
  repoUrl: 'https://github.com/jellyrock/jellyfin-plugin-jellyrock.git',
  cloneDir: path.resolve('.plugin-repo'),
  copy: { 'docs/feature-catalog.json': path.resolve(DEFAULT_PLUGIN_CATALOG_PATH) },
  stampFile: path.resolve('src/data/upstream/plugin.fetched.json'),
};

export const fetchAssets = (): Promise<void> => fetchUpstream(JELLYROCK_COPY);
export const fetchPluginCatalog = (): Promise<void> => fetchUpstream(PLUGIN_COPY);

// Limits with headroom: the check takes under a second and the fetch a few seconds on a fast link.
const CHECK_TIMEOUT_MS = 60_000;
const FETCH_TIMEOUT_MS = 600_000;

/**
 * Keep `source.copy` the same as upstream's HEAD. A clone with no file contents gives git's hash of
 * each copied path, which changes only when a file under it does, so an upstream commit that
 * touches none of them costs no download. A clone, unlike a raw.githubusercontent.com URL, is never
 * a cached copy, so the deploy an upstream change starts builds with that change.
 *
 * A changed path replaces its copy, so files upstream deleted or renamed go too. The stamp is
 * written last, so an interrupted copy is fetched again. When upstream can't be reached, an
 * existing copy is used with a warning.
 */
export async function fetchUpstream(source: UpstreamCopy): Promise<void> {
  const haveCopy = Object.values(source.copy).every((dest) => fs.existsSync(dest));
  if (haveCopy && process.env[FROM_CACHE_ENV] === '1') {
    console.log(`${source.name}: using the copy already fetched (${FROM_CACHE_ENV}=1).`);
    return;
  }

  fs.rmSync(source.cloneDir, { recursive: true, force: true });
  try {
    let entries: Map<string, Entry>;
    let commit: string;
    try {
      await git(
        ['clone', '--quiet', '--depth', '1', '--filter=blob:none', '--no-checkout', source.repoUrl, source.cloneDir],
        CHECK_TIMEOUT_MS
      );
      commit = (await git(['-C', source.cloneDir, 'rev-parse', 'HEAD'], CHECK_TIMEOUT_MS)).trim();
      entries = await readEntries(source);
    } catch (err) {
      return useCopyOrThrow(source, haveCopy, 'could not check upstream', err);
    }

    const key = cacheKey(source, entries);
    if (haveCopy && readStamp(source.stampFile)?.key === key) {
      console.log(`${source.name}: up to date.`);
      return;
    }

    const present = [...entries].filter((pair): pair is [string, NonNullable<Entry>] => pair[1] !== null);
    console.log(`Fetching ${source.name} from ${source.repoUrl} at ${commit.slice(0, 7)}...`);
    try {
      // Sparse checkout downloads the files in one batch; checking out each path downloads them one by one.
      const patterns = present.map(([repoPath, entry]) => (entry.type === 'tree' ? `/${repoPath}/` : `/${repoPath}`));
      await git(['-C', source.cloneDir, 'sparse-checkout', 'set', '--no-cone', ...patterns], FETCH_TIMEOUT_MS);
      await git(['-C', source.cloneDir, 'checkout', '--quiet'], FETCH_TIMEOUT_MS);
    } catch (err) {
      return useCopyOrThrow(source, haveCopy, 'could not fetch upstream', err);
    }

    fs.rmSync(source.stampFile, { force: true });
    for (const [repoPath, dest] of Object.entries(source.copy)) {
      if (!entries.get(repoPath)) {
        console.warn(`${source.name}: ${repoPath} not found upstream.`);
        continue;
      }
      fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(path.join(source.cloneDir, repoPath), dest, { recursive: true });
      console.log(`Copied: ${repoPath} → ${path.relative(process.cwd(), dest)}`);
    }

    // A path missing upstream leaves no stamp, so every build checks again and warns again.
    if (present.length === entries.size) {
      fs.mkdirSync(path.dirname(source.stampFile), { recursive: true });
      fs.writeFileSync(source.stampFile, `${JSON.stringify({ key, commit } satisfies Stamp, null, 2)}\n`);
    }
    console.log(`${source.name} ready.`);
  } finally {
    fs.rmSync(source.cloneDir, { recursive: true, force: true });
  }
}

/** git's type and hash of each copied path at HEAD, or null for a path HEAD doesn't have. */
async function readEntries(source: UpstreamCopy): Promise<Map<string, Entry>> {
  const repoPaths = Object.keys(source.copy);
  const out = await git(['-C', source.cloneDir, 'ls-tree', '-z', 'HEAD', '--', ...repoPaths], CHECK_TIMEOUT_MS);
  const found = new Map<string, Entry>();
  for (const line of out.split('\0').filter(Boolean)) {
    // <mode> <type> <object>\t<path>
    const [meta, repoPath] = line.split('\t');
    const [, type, id] = meta.split(' ');
    if (type === 'tree' || type === 'blob') found.set(repoPath, { type, id });
  }
  return new Map(repoPaths.map((repoPath) => [repoPath, found.get(repoPath) ?? null]));
}

/** Changes when upstream changes a copied path, or when `source.copy` maps a path somewhere else. */
function cacheKey(source: UpstreamCopy, entries: Map<string, Entry>): string {
  const base = path.dirname(source.stampFile);
  const parts = Object.entries(source.copy).map(([repoPath, dest]) => [
    repoPath,
    path.relative(base, dest),
    entries.get(repoPath)?.id ?? null,
  ]);
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function readStamp(file: string): Stamp | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Stamp;
  } catch {
    return null;
  }
}

function useCopyOrThrow(source: UpstreamCopy, haveCopy: boolean, what: string, err: unknown): void {
  const reason = describe(err);
  if (!haveCopy) throw new Error(`${source.name}: ${what}: ${reason}`);
  console.warn(`${source.name}: ${what} (${reason}). Building from the copy already fetched.`);
}

function describe(err: unknown): string {
  const e = err as { stderr?: string; killed?: boolean; message?: string };
  if (e.killed) return 'git timed out';
  return e.stderr?.trim() || e.message || String(err);
}

const execFileAsync = promisify(execFile);

async function git(args: string[], timeout: number): Promise<string> {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  // Fail rather than ask for a password (GitHub answers a missing repo that way), and never act on
  // the repo of a git hook this build runs from: git obeys these over -C.
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[name];
  const { stdout } = await execFileAsync('git', args, { encoding: 'utf8', timeout, env, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}
