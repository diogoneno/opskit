// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
  it('control: the instrumentation catches a real call (OSV lookup through the global fetch, consent stored)', async () => {
    const { lookup } = await import('../tools/osv/client');
    const { saveOsvConsent, clearOsvConsent } = await import('../tools/osv/logic');
    calls.length = 0;
    saveOsvConsent('https://api.osv.dev/v1/query');
    try {
      await expect(lookup([{ ecosystem: 'npm', name: 'x', version: '1.0.0' }])).rejects.toThrow(/network blocked/);
    } finally {
      clearOsvConsent();
    }
    expect(calls).toEqual(['fetch https://api.osv.dev/v1/query']);
  });
  it('the OSV request function refuses to run without consent', async () => {
    const { osvQuery, ConsentRequiredError } = await import('../tools/osv/client');
    calls.length = 0;
    await expect(osvQuery({ ecosystem: 'npm', name: 'x', version: '1.0.0' })).rejects.toBeInstanceOf(ConsentRequiredError);
    expect(calls).toEqual([]);
  });
});

// ---- Runtime check: the OSV page asks before any third-party request ----

describe('runtime: OSV page is opt-in', () => {
  let host: HTMLDivElement;
  let root: Root;
  const ENDPOINT = 'https://osv-proxy.example/v1/query';
  const buttons = () => [...host.querySelectorAll('button')];
  const button = (text: string) => {
    const b = buttons().find((x) => x.textContent === text);
    if (!b) throw new Error(`no button "${text}"; have: ${buttons().map((x) => x.textContent).join(' | ')}`);
    return b;
  };
  const dialog = () => host.querySelector('[role="dialog"]');
  const click = async (el: HTMLElement) => {
    await act(async () => {
      el.click();
      await new Promise((r) => setTimeout(r, 0));
    });
  };
  const setInput = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const render = async () => {
    const { default: OsvPage } = await import('../tools/osv/Page');
    await act(async () => root.render(createElement(OsvPage)));
    await setInput(host.querySelector('textarea')!, 'npm lodash 4.17.20'); // exactly one package
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    calls.length = 0;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    localStorage.clear();
  });

  it('no consent: Look up makes 0 requests and opens a labelled modal dialog', async () => {
    await render();
    expect(host.textContent).toContain('Integration: off — no requests are made');
    await click(button('Look up'));
    expect(calls).toEqual([]);
    const d = dialog();
    expect(d).not.toBeNull();
    expect(d!.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(d!.getAttribute('aria-labelledby')!)?.textContent).toBe('Third-party integration: OSV.dev');
    expect(d!.textContent).toMatch(/ecosystem.*package name.*version/);
    expect(d!.querySelector('input')!.value).toBe('https://api.osv.dev/v1/query');
    expect(d!.querySelector('a[href^="https://"]')).not.toBeNull();
    expect(d!.contains(document.activeElement)).toBe(true);
    expect(localStorage.length).toBe(0);
  });
  it('Cancel (and Esc) close the dialog with 0 requests and nothing stored', async () => {
    await render();
    await click(button('Look up'));
    await click(button('Cancel'));
    expect(dialog()).toBeNull();
    await click(button('Look up'));
    await act(async () => {
      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(dialog()).toBeNull();
    expect(calls).toEqual([]);
    expect(localStorage.length).toBe(0);
  });
  it('consent stored: Look up makes exactly 1 request, to the configured endpoint, with no dialog', async () => {
    localStorage.setItem('opskit.osv.integration', JSON.stringify({ enabled: true, endpoint: ENDPOINT }));
    await render();
    expect(host.textContent).toContain(`Integration: on → ${ENDPOINT}`);
    await click(button('Look up'));
    expect(dialog()).toBeNull();
    expect(calls).toEqual([`fetch ${ENDPOINT}`]);
  });
  it('"Enable and look up" stores consent under one key and makes exactly 1 request to the edited endpoint', async () => {
    await render();
    await click(button('Look up'));
    await setInput(dialog()!.querySelector('input')!, ENDPOINT);
    await click(button('Enable and look up'));
    expect(dialog()).toBeNull();
    expect(JSON.parse(localStorage.getItem('opskit.osv.integration')!)).toEqual({ enabled: true, endpoint: ENDPOINT });
    expect(localStorage.length).toBe(1);
    expect(calls).toEqual([`fetch ${ENDPOINT}`]);
  });
  it('"Disable integration" clears consent and the next Look up asks again with 0 requests', async () => {
    localStorage.setItem('opskit.osv.integration', JSON.stringify({ enabled: true, endpoint: ENDPOINT }));
    await render();
    await click(button('Disable integration'));
    expect(localStorage.length).toBe(0);
    expect(host.textContent).toContain('Integration: off — no requests are made');
    await click(button('Look up'));
    expect(dialog()).not.toBeNull();
    expect(calls).toEqual([]);
  });
});
