import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { tools } from '../tools/registry';

// ---- Static check: which source files can touch the network at all? ----

const NETWORK_API = /\bfetch\s*\(|\bfetchImpl\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|importScripts\s*\(|\bimport\s*\(\s*['"`]https?:/;
const ALLOWED = ['../tools/http/send.ts', '../tools/osv/client.ts'];

const usesNetwork = (source: string) => NETWORK_API.test(source.replace(/^\s*(\/\/|\/?\*).*$/gm, ''));

const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('static: no network code outside the two allowed modules', () => {
  it('scans a real denominator of source files', () => {
    // 18 tools x (logic + page) at minimum, plus the shell.
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(40);
  });
  it('known-positive controls: the detector fires on network code', () => {
    expect(usesNetwork("await fetch('https://x')")).toBe(true);
    expect(usesNetwork('new XMLHttpRequest()')).toBe(true);
    expect(usesNetwork('new WebSocket(url)')).toBe(true);
    expect(usesNetwork('navigator.sendBeacon(u, d)')).toBe(true);
    expect(usesNetwork("const m = await import('https://cdn.example/x.js')")).toBe(true);
    expect(usesNetwork('// fetch( in a comment')).toBe(false);
  });
  it('the allowed modules really are detected (the check is live)', () => {
    for (const f of ALLOWED) expect(usesNetwork(sources[f]), f).toBe(true);
  });
  it('no other module uses a network API', () => {
    const offenders = Object.entries(sources)
      .filter(([f, src]) => !ALLOWED.includes(f) && usesNetwork(src))
      .map(([f]) => f);
    expect(offenders).toEqual([]);
  });
  it('the OSV endpoint appears only in the OSV tool', () => {
    const files = Object.entries(sources).filter(([, s]) => s.includes('api.osv.dev')).map(([f]) => f);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.startsWith('../tools/osv/'))).toBe(true);
  });
});

// ---- Runtime check: render every page and run its logic with the network instrumented ----

const calls: string[] = [];
const record = (kind: string) =>
  vi.fn((...args: unknown[]) => {
    calls.push(`${kind} ${String(args[0])}`);
    throw new Error(`network blocked in test: ${kind}`);
  });

beforeAll(() => {
  vi.stubGlobal('fetch', record('fetch'));
  vi.stubGlobal('XMLHttpRequest', record('XMLHttpRequest'));
  vi.stubGlobal('WebSocket', record('WebSocket'));
  vi.stubGlobal('EventSource', record('EventSource'));
  vi.stubGlobal('navigator', { ...globalThis.navigator, sendBeacon: record('sendBeacon'), onLine: true });
});
afterAll(() => vi.unstubAllGlobals());

describe('runtime: nothing fetches on load or render', () => {
  it('renders all pages (with their example inputs processed) without a single network call', async () => {
    let rendered = 0;
    for (const t of tools) {
      const mod = await t.load();
      renderToStaticMarkup(createElement(mod.default));
      rendered++;
    }
    const { digestAll } = await import('../tools/hash/logic');
    await digestAll('abc');
    expect(rendered).toBe(tools.length);
    expect(calls).toEqual([]);
  });
  it('control: the instrumentation catches a real call (OSV check through the global fetch)', async () => {
    const { checkPackages } = await import('../tools/osv/client');
    await expect(checkPackages([{ ecosystem: 'npm', name: 'x', version: '1.0.0' }])).rejects.toThrow(/network blocked/);
    expect(calls).toEqual(['fetch https://api.osv.dev/v1/querybatch']);
  });
});
