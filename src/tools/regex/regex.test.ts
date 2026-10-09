import { describe, expect, it } from 'vitest';
import { re2Issues, runRegex } from './logic';

describe('regex tester', () => {
  it('returns matches with indexes and named groups', () => {
    const r = runRegex('status=(?<code>\\d+)', 'g', 'a status=200 b status=504');
    expect(r).toEqual({
      ok: true,
      truncated: false,
      matches: [
        { index: 2, text: 'status=200', groups: ['200'], named: { code: '200' } },
        { index: 15, text: 'status=504', groups: ['504'], named: { code: '504' } },
      ],
    });
  });
  it('stops after the first match without g', () => {
    const r = runRegex('\\d', '', 'a1b2');
    expect(r.ok && r.matches.map((m) => m.text)).toEqual(['1']);
  });
  it('caps the number of matches and handles empty matches', () => {
    const r = runRegex('x*', 'g', 'aaaa', 3);
    expect(r).toMatchObject({ ok: true, truncated: true });
    expect(r.ok && r.matches).toHaveLength(3);
  });
  it('reports syntax errors', () => {
    expect(runRegex('(', 'g', 'x').ok).toBe(false);
    expect(runRegex('a', 'gq', 'x').ok).toBe(false);
  });
  it('flags RE2-incompatible constructs, and not compatible ones', () => {
    expect(re2Issues('foo(?=bar)')).toHaveLength(1);
    expect(re2Issues('(?<!x)y')).toHaveLength(1);
    expect(re2Issues('(a)\\1')).toHaveLength(1);
    expect(re2Issues('a++')).toHaveLength(1);
    expect(re2Issues('^(GET|POST) /api/v[0-9]+/.*$')).toEqual([]);
  });
});
