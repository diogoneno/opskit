// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsentRequiredError, lookup } from './client';
import { clearOsvConsent, OSV_CONSENT_KEY, OSV_DEFAULT_ENDPOINT, parseInput, readOsvConsent, saveOsvConsent, severityOf, validEndpoint } from './logic';

const lockV3 = JSON.stringify({
  name: 'app',
  lockfileVersion: 3,
  packages: {
    '': { name: 'app', version: '1.0.0' },
    'node_modules/lodash': { version: '4.17.20' },
    'node_modules/@scope/pkg': { version: '2.0.0' },
    'node_modules/a/node_modules/lodash': { version: '4.17.20' },
    'node_modules/local': { link: true },
    'node_modules/gitdep': { version: 'git+ssh://example/x.git' },
  },
});

describe('OSV input parsing', () => {
  it('reads package-lock v2/v3, de-duplicating and skipping links/git deps', () => {
    expect(parseInput(lockV3)).toEqual({
      format: 'package-lock.json v3',
      packages: [
        { ecosystem: 'npm', name: 'lodash', version: '4.17.20' },
        { ecosystem: 'npm', name: '@scope/pkg', version: '2.0.0' },
      ],
      skipped: [],
    });
  });
  it('reads package-lock v1', () => {
    const v1 = JSON.stringify({ lockfileVersion: 1, dependencies: { a: { version: '1.0.0', dependencies: { b: { version: '2.0.0' } } } } });
    expect(parseInput(v1).packages.map((p) => p.name)).toEqual(['a', 'b']);
  });
  it('reads requirements.txt pins and reports unpinned lines', () => {
    const r = parseInput('# deps\nrequests==2.31.0\nDjango[argon2]==4.2.1 ; python_version>"3.8"\nflask>=2\n-r other.txt\n');
    expect(r.format).toBe('requirements.txt');
    expect(r.packages).toEqual([
      { ecosystem: 'PyPI', name: 'requests', version: '2.31.0' },
      { ecosystem: 'PyPI', name: 'Django', version: '4.2.1' },
    ]);
    expect(r.skipped).toEqual(['flask>=2']);
  });
  it('reads "ecosystem name version" lines', () => {
    expect(parseInput('go golang.org/x/net 0.17.0\ncrates.io serde 1.0.0').packages).toEqual([
      { ecosystem: 'Go', name: 'golang.org/x/net', version: '0.17.0' },
      { ecosystem: 'crates.io', name: 'serde', version: '1.0.0' },
    ]);
  });
  it('rejects JSON that is not a lockfile', () => {
    expect(() => parseInput('{"name":"x"}')).toThrow(/lockfileVersion/);
  });
});

afterEach(() => localStorage.clear());

describe('OSV consent', () => {
  it('is off unless explicitly stored, and ignores malformed values', () => {
    expect(readOsvConsent()).toBeNull();
    localStorage.setItem(OSV_CONSENT_KEY, '{"enabled":false,"endpoint":"https://api.osv.dev/v1/query"}');
    expect(readOsvConsent()).toBeNull();
    localStorage.setItem(OSV_CONSENT_KEY, '{"enabled":true,"endpoint":"javascript:alert(1)"}');
    expect(readOsvConsent()).toBeNull();
    localStorage.setItem(OSV_CONSENT_KEY, 'not json');
    expect(readOsvConsent()).toBeNull();
  });
  it('stores {enabled, endpoint} under one key and clears it', () => {
    saveOsvConsent('https://osv.internal.example/v1/query');
    expect(JSON.parse(localStorage.getItem(OSV_CONSENT_KEY)!)).toEqual({ enabled: true, endpoint: 'https://osv.internal.example/v1/query' });
    expect(localStorage.length).toBe(1);
    clearOsvConsent();
    expect(readOsvConsent()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it('accepts only absolute http(s) endpoints', () => {
    expect(validEndpoint(OSV_DEFAULT_ENDPOINT)).toBe(OSV_DEFAULT_ENDPOINT);
    expect(validEndpoint('ftp://x/y')).toBeNull();
    expect(validEndpoint('/v1/query')).toBeNull();
    expect(() => saveOsvConsent('nope')).toThrow(/http/);
  });
});

describe('OSV lookup', () => {
  const fakeOsv = () =>
    vi.fn(async (_url: string, init?: RequestInit) => {
      const q = JSON.parse(String(init!.body)) as { package: { name: string } };
      return new Response(JSON.stringify(q.package.name === 'lodash' ? { vulns: [{ id: 'GHSA-x', summary: 'bad' }] } : {}));
    });
  it('throws before any request when consent is not stored', async () => {
    const fake = fakeOsv();
    await expect(lookup(parseInput('npm lodash 4.17.20').packages, fake as unknown as typeof fetch)).rejects.toBeInstanceOf(ConsentRequiredError);
    expect(fake).not.toHaveBeenCalled();
  });
  it('sends only package coordinates to the configured endpoint, one request per package', async () => {
    saveOsvConsent('https://proxy.example/osv/query');
    const fake = fakeOsv();
    const pkgs = parseInput('npm lodash 4.17.20\nnpm left-pad 1.3.0').packages;
    const f = await lookup(pkgs, fake as unknown as typeof fetch);
    expect(f).toEqual([{ pkg: pkgs[0], vulns: [{ id: 'GHSA-x', summary: 'bad' }] }]);
    expect(fake.mock.calls.map(([u]) => u)).toEqual(['https://proxy.example/osv/query', 'https://proxy.example/osv/query']);
    const [, init] = fake.mock.calls[0];
    expect(JSON.parse(String(init!.body))).toEqual({ package: { name: 'lodash', ecosystem: 'npm' }, version: '4.17.20' });
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect(Object.keys(init!.headers as object)).toEqual(['Content-Type']);
    expect(severityOf({ id: 'x', database_specific: { severity: 'HIGH' } })).toBe('HIGH');
  });
  it('surfaces HTTP errors', async () => {
    saveOsvConsent(OSV_DEFAULT_ENDPOINT);
    const fake = vi.fn(async () => new Response('', { status: 503 }));
    await expect(lookup(parseInput('npm a 1').packages, fake as unknown as typeof fetch)).rejects.toThrow(/503/);
  });
});
