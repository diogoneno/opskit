import { describe, expect, it, vi } from 'vitest';
import { checkPackages, vulnDetails } from './client';
import { batchBodies, mergeResults, parseInput, severityOf } from './logic';

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

describe('OSV batching and results', () => {
  it('splits into batches of 1000', () => {
    const pkgs = Array.from({ length: 2001 }, (_, i) => ({ ecosystem: 'npm' as const, name: `p${i}`, version: '1.0.0' }));
    expect(batchBodies(pkgs).map((b) => b.queries.length)).toEqual([1000, 1000, 1]);
  });
  it('maps results back to packages and keeps only vulnerable ones', () => {
    const pkgs = parseInput('npm a 1.0.0\nnpm b 1.0.0').packages;
    expect(mergeResults(pkgs, [{ results: [{}, { vulns: [{ id: 'GHSA-1' }] }] }])).toEqual([{ pkg: pkgs[1], ids: ['GHSA-1'] }]);
    expect(() => mergeResults(pkgs, [{ results: [{}] }])).toThrow(/1 results for 2/);
    expect(severityOf({ id: 'x', database_specific: { severity: 'HIGH' } })).toBe('HIGH');
  });
  it('sends only package coordinates to api.osv.dev', async () => {
    const fake = vi.fn(async (url: string, init?: RequestInit) =>
      url.endsWith('/querybatch')
        ? new Response(JSON.stringify({ results: (JSON.parse(String(init!.body)).queries as unknown[]).map(() => ({ vulns: [{ id: 'GHSA-x' }] })) }))
        : new Response(JSON.stringify({ id: 'GHSA-x', summary: 'bad' })),
    );
    const pkgs = parseInput('npm lodash 4.17.20').packages;
    const f = await checkPackages(pkgs, fake as unknown as typeof fetch);
    expect(f).toEqual([{ pkg: pkgs[0], ids: ['GHSA-x'] }]);
    const [url, init] = fake.mock.calls[0];
    expect(url).toBe('https://api.osv.dev/v1/querybatch');
    expect(JSON.parse(String(init!.body))).toEqual({ queries: [{ package: { name: 'lodash', ecosystem: 'npm' }, version: '4.17.20' }] });
    expect((await vulnDetails(['GHSA-x'], fake as unknown as typeof fetch)).get('GHSA-x')?.summary).toBe('bad');
    expect(fake.mock.calls.every(([u]) => String(u).startsWith('https://api.osv.dev/'))).toBe(true);
  });
  it('surfaces HTTP errors', async () => {
    const fake = vi.fn(async () => new Response('', { status: 503 }));
    await expect(checkPackages(parseInput('npm a 1').packages, fake as unknown as typeof fetch)).rejects.toThrow(/503/);
  });
});
