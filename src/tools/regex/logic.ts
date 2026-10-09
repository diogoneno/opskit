export interface Match {
  index: number;
  text: string;
  groups: (string | undefined)[];
  named?: Record<string, string | undefined>;
}

export type Result = { ok: true; matches: Match[]; truncated: boolean } | { ok: false; error: string };

export function runRegex(pattern: string, flags: string, text: string, max = 1000): Result {
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const matches: Match[] = [];
  for (const m of text.matchAll(re)) {
    if (matches.length >= max) return { ok: true, matches, truncated: true };
    matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups ? { ...m.groups } : undefined });
    if (!flags.includes('g')) break;
  }
  return { ok: true, matches, truncated: false };
}

/** Constructs that JavaScript accepts but RE2 (Go, Prometheus, Loki, Grafana) rejects. */
export function re2Issues(pattern: string): string[] {
  const checks: [RegExp, string][] = [
    [/\(\?[=!]/, 'Lookahead (?= / (?! is not supported by RE2'],
    [/\(\?<[=!]/, 'Lookbehind (?<= / (?<! is not supported by RE2'],
    [/\\[1-9]/, 'Backreferences (\\1) are not supported by RE2'],
    [/\\k</, 'Named backreferences (\\k<name>) are not supported by RE2'],
    [/\(\?<[A-Za-z]/, 'Named groups: RE2 accepts (?P<name>…) and, since Go 1.22, (?<name>…)'],
    [/[*+?}]\+/, 'Possessive quantifiers are not supported by RE2'],
    [/\(\?>/, 'Atomic groups (?>…) are not supported by RE2'],
  ];
  return checks.filter(([re]) => re.test(pattern)).map(([, msg]) => msg);
}
