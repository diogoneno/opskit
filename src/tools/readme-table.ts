import type { ToolEntry } from './registry.ts';

const cell = (s: string) => s.replace(/\|/g, '\\|');

/** Markdown table of every registered tool, as printed by scripts/readme-tools.mjs. */
export function renderToolTable(list: readonly ToolEntry[]): string {
  const rows = list.map(
    (t) =>
      `| [${cell(t.name)}](https://diogoneno.github.io/opskit/#/${t.slug}) | ${t.category} | ${cell(t.description)}${
        t.network ? ' **Network:** ' + (t.network === 'osv.dev' ? 'sends package names and versions to OSV.dev, on click.' : 'sends only to the URL you enter, on click.') : ''
      } |`,
  );
  return ['| Tool | Category | What it does |', '|---|---|---|', ...rows].join('\n');
}
