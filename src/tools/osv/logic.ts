export const ecosystems = ['npm', 'PyPI', 'Go', 'crates.io', 'Maven', 'RubyGems', 'NuGet', 'Packagist'] as const;
export type Ecosystem = (typeof ecosystems)[number];

export interface Pkg {
  ecosystem: Ecosystem;
  name: string;
  version: string;
}

export interface Parsed {
  format: string;
  packages: Pkg[];
  skipped: string[];
}

function fromPackageLock(json: Record<string, unknown>): Pkg[] {
  const seen = new Map<string, Pkg>();
  const add = (name: string, version: unknown) => {
    if (typeof version !== 'string' || !/^\d/.test(version)) return; // skip links, git and file deps
    seen.set(`${name}@${version}`, { ecosystem: 'npm', name, version });
  };
  const packages = json.packages as Record<string, { version?: string; name?: string; link?: boolean }> | undefined;
  if (packages) {
    for (const [path, info] of Object.entries(packages)) {
      if (!path || info.link) continue; // "" is the root project
      add(info.name ?? path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length), info.version);
    }
  } else {
    // lockfileVersion 1
    const walk = (deps: Record<string, { version?: string; dependencies?: object }> | undefined) => {
      for (const [name, info] of Object.entries(deps ?? {})) {
        add(name, info.version);
        walk(info.dependencies as typeof deps);
      }
    };
    walk(json.dependencies as Parameters<typeof walk>[0]);
  }
  return [...seen.values()];
}

/** Accepts package-lock.json, requirements.txt (== pins) or "ecosystem name version" lines. */
export function parseInput(text: string): Parsed {
  const t = text.trim();
  if (!t) return { format: 'empty', packages: [], skipped: [] };
  if (t.startsWith('{')) {
    const json = JSON.parse(t) as Record<string, unknown>;
    if (!('lockfileVersion' in json)) throw new Error('JSON input must be a package-lock.json (lockfileVersion missing)');
    return { format: `package-lock.json v${json.lockfileVersion}`, packages: fromPackageLock(json), skipped: [] };
  }
  const packages: Pkg[] = [];
  const skipped: string[] = [];
  let pip = 0;
  for (const raw of t.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;
    const list = /^(\S+)\s+(\S+)\s+(\S+)$/.exec(line);
    const eco = list && ecosystems.find((e) => e.toLowerCase() === list[1].toLowerCase());
    if (list && eco) {
      packages.push({ ecosystem: eco, name: list[2], version: list[3] });
      continue;
    }
    const req = /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*==\s*([^\s;,]+)/.exec(line);
    if (req) {
      pip++;
      packages.push({ ecosystem: 'PyPI', name: req[1], version: req[2] });
    } else skipped.push(line);
  }
  return { format: pip === packages.length && pip ? 'requirements.txt' : 'package list', packages, skipped };
}

export const OSV_API = 'https://api.osv.dev/v1';
export const BATCH = 1000; // OSV querybatch limit

export function batchBodies(pkgs: Pkg[]) {
  const out = [];
  for (let i = 0; i < pkgs.length; i += BATCH) {
    out.push({ queries: pkgs.slice(i, i + BATCH).map((p) => ({ package: { name: p.name, ecosystem: p.ecosystem }, version: p.version })) });
  }
  return out;
}

export interface VulnRef {
  id: string;
}
export interface VulnDetail {
  id: string;
  summary?: string;
  aliases?: string[];
  severity?: { type: string; score: string }[];
  database_specific?: { severity?: string };
}

export interface Finding {
  pkg: Pkg;
  ids: string[];
}

export function mergeResults(pkgs: Pkg[], responses: { results: { vulns?: VulnRef[] }[] }[]): Finding[] {
  const results = responses.flatMap((r) => r.results);
  if (results.length !== pkgs.length) throw new Error(`OSV returned ${results.length} results for ${pkgs.length} packages`);
  return pkgs.map((pkg, i) => ({ pkg, ids: (results[i].vulns ?? []).map((v) => v.id) })).filter((f) => f.ids.length);
}

export const severityOf = (v?: VulnDetail) => v?.database_specific?.severity ?? v?.severity?.[0]?.type ?? 'unknown';
