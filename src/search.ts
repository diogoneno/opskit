import type { ToolEntry } from './tools/registry';

/** Ranks tools for the command palette: name prefix > word prefix > keyword > subsequence. */
export function searchTools(list: readonly ToolEntry[], query: string): ToolEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  const score = (t: ToolEntry) => {
    const name = t.name.toLowerCase();
    if (name.startsWith(q) || t.slug.startsWith(q)) return 100;
    if (name.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) return 80;
    if (t.keywords.some((k) => k.startsWith(q))) return 60;
    if ((name + ' ' + t.keywords.join(' ') + ' ' + t.description.toLowerCase()).includes(q)) return 40;
    let i = 0;
    for (const c of name) if (c === q[i]) i++;
    return i === q.length ? 20 : 0;
  };
  return list
    .map((t) => [t, score(t)] as const)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
}
