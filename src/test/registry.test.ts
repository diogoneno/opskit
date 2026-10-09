import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { slugFromHash, hrefFor } from '../router';
import { searchTools } from '../search';
import { categories, toolBySlug, tools } from '../tools/registry';

// Discovered from the file system by Vite, independently of the registry.
const testFiles = Object.keys(import.meta.glob('../tools/*/*.test.ts'));
const pageFiles = Object.keys(import.meta.glob('../tools/*/Page.tsx'));
const toolDirs = new Set(pageFiles.map((f) => f.split('/')[2]));

describe('tool registry', () => {
  it('has 15-18 tools with unique slugs and complete metadata', () => {
    expect(tools.length).toBeGreaterThanOrEqual(15);
    expect(tools.length).toBeLessThanOrEqual(18);
    expect(toolBySlug.size).toBe(tools.length);
    for (const t of tools) {
      expect(t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(t.name.length).toBeGreaterThan(2);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.keywords.length).toBeGreaterThan(2);
      expect(categories).toContain(t.category);
    }
  });

  it('every registered tool has a page directory, and every page directory is registered', () => {
    expect(pageFiles.length).toBe(tools.length);
    expect([...toolDirs].sort()).toEqual(tools.map((t) => t.slug).sort());
  });

  it('every registered tool has a unit test file named after its slug', () => {
    for (const t of tools) expect(testFiles, t.slug).toContain(`../tools/${t.slug}/${t.slug}.test.ts`);
  });

  it('every tool has a route', () => {
    for (const t of tools) expect(toolBySlug.get(slugFromHash(hrefFor(t.slug)))).toBe(t);
    expect(slugFromHash('#/cidr?x=1')).toBe('cidr');
    expect(slugFromHash('')).toBe('');
  });

  it('only the two declared tools are allowed network access', () => {
    expect(tools.filter((t) => t.network).map((t) => [t.slug, t.network])).toEqual([
      ['http', 'user-url'],
      ['osv', 'osv.dev'],
    ]);
  });

  it('is searchable by name and keyword', () => {
    expect(searchTools(tools, 'jwt')[0].slug).toBe('jwt');
    expect(searchTools(tools, 'subnet')[0].slug).toBe('cidr');
    expect(searchTools(tools, 'crontab')[0].slug).toBe('cron');
    expect(searchTools(tools, 'zzzzqq')).toEqual([]);
    expect(searchTools(tools, '')).toHaveLength(tools.length);
  });
});

describe.each(tools.map((t) => [t.slug, t] as const))('page %s', (_slug, tool) => {
  it('lazy-loads a component that renders its heading, with every form control labelled', async () => {
    const mod = await tool.load();
    expect(typeof mod.default).toBe('function');
    const html = renderToStaticMarkup(createElement(mod.default));
    expect(html).toContain(`<h1>${renderToStaticMarkup(tool.name)}</h1>`);

    const labelled = new Set([...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]));
    const controls = [...html.matchAll(/<(input|textarea|select)\b([^>]*)>/g)];
    expect(controls.length, 'page has form controls').toBeGreaterThan(0);
    for (const [tag, , attrs] of controls) {
      const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
      const ok = (id && labelled.has(id)) || /\baria-label="[^"]+"/.test(attrs);
      expect(ok, `unlabelled control: ${tag}`).toBe(true);
    }
  });
});

describe('a11y check control', () => {
  it('fires on an unlabelled input', () => {
    const html = '<label for="a">A</label><input id="a"/><input id="b"/>';
    const labelled = new Set([...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]));
    const bad = [...html.matchAll(/<(input|textarea|select)\b([^>]*)>/g)].filter(([, , a]) => !labelled.has(/\bid="([^"]+)"/.exec(a)?.[1] ?? ''));
    expect(bad).toHaveLength(1);
  });
});
