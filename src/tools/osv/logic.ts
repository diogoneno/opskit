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

export const OSV_DEFAULT_ENDPOINT = 'https://api.osv.dev/v1/query';

/** The one request body OSV's /v1/query takes: ecosystem, name and version. Nothing else is ever added. */
export const queryBody = (p: Pkg) => ({ package: { name: p.name, ecosystem: p.ecosystem }, version: p.version });

export interface VulnDetail {
  id: string;
  summary?: string;
  aliases?: string[];
  severity?: { type: string; score: string }[];
  database_specific?: { severity?: string };
}

export interface Finding {
  pkg: Pkg;
  vulns: VulnDetail[];
}

// ---- Opt-in consent for the third-party integration (stored in this browser only) ----

export const OSV_CONSENT_KEY = 'opskit.osv.integration';

export interface OsvConsent {
  enabled: true;
  endpoint: string;
}

/** Returns the endpoint as a URL string if it is an absolute http(s) URL, else null. */
export function validEndpoint(input: string): string | null {
  try {
    const u = new URL(input.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export function readOsvConsent(): OsvConsent | null {
  try {
    const v = JSON.parse(localStorage.getItem(OSV_CONSENT_KEY) ?? 'null') as Partial<OsvConsent> | null;
    const endpoint = v?.enabled === true && typeof v.endpoint === 'string' ? validEndpoint(v.endpoint) : null;
    return endpoint ? { enabled: true, endpoint } : null;
  } catch {
    return null;
  }
}

export function saveOsvConsent(endpoint: string): OsvConsent {
  const valid = validEndpoint(endpoint);
  if (!valid) throw new Error('Endpoint must be an absolute http(s) URL');
  const consent: OsvConsent = { enabled: true, endpoint: valid };
  localStorage.setItem(OSV_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

export function clearOsvConsent() {
  try {
    localStorage.removeItem(OSV_CONSENT_KEY);
  } catch {
    // storage unavailable: nothing was stored
  }
}

export const severityOf = (v?: VulnDetail) => v?.database_specific?.severity ?? v?.severity?.[0]?.type ?? 'unknown';
